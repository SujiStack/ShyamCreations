import React, { useState, useEffect } from 'react';
import { ViewMode, HennaBooking, JewelleryRental, CustomerAccount } from '../types';
import {
  fetchAllUserBookingsAndOrdersByPhone,
  rescheduleSupabaseBooking,
} from '../lib/supabaseService';
import { STUDIO_INFO } from '../data/mockData';

interface MyBookingsViewProps {
  hennaBookings: HennaBooking[];
  jewelleryRentals: JewelleryRental[];
  onNavigate: (view: ViewMode) => void;
  onRescheduleBooking?: (bookingId: string, newDate: string, newTimeSlot: string, notes?: string) => void;
  customerUser?: CustomerAccount | null;
  onOpenAuthModal?: () => void;
}

type PaymentTone = 'paid' | 'pending' | 'failed' | 'refunded';

function paymentTone(status?: string): PaymentTone | null {
  if (!status) return null;
  const s = status.toUpperCase();
  if (['PAID', 'CAPTURED', 'COMPLETED', 'SUCCESS'].includes(s) || s.includes('PAID')) return 'paid';
  if (['FAILED', 'FAILURE', 'CANCELLED'].includes(s)) return 'failed';
  if (['REVERSED', 'REFUNDED', 'PARTIALLY_REFUNDED'].includes(s) || s.includes('REFUND')) return 'refunded';
  return 'pending';
}

const PAYMENT_BADGE_STYLES: Record<PaymentTone, string> = {
  paid: 'bg-emerald-50 text-emerald-800 border-emerald-300',
  pending: 'bg-amber-50 text-amber-800 border-amber-300',
  failed: 'bg-red-50 text-red-700 border-red-300',
  refunded: 'bg-slate-100 text-slate-700 border-slate-300',
};

const PAYMENT_BADGE_ICON: Record<PaymentTone, string> = {
  paid: 'check_circle',
  pending: 'hourglass_top',
  failed: 'error',
  refunded: 'revert',
};

const PAYMENT_BADGE_LABEL: Record<PaymentTone, string> = {
  paid: 'Paid',
  pending: 'Payment Pending',
  failed: 'Payment Failed',
  refunded: 'Refunded',
};

const PaymentBadge: React.FC<{ status?: string; className?: string }> = ({ status, className = '' }) => {
  const tone = paymentTone(status);
  if (!tone) return null;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold rounded-full border uppercase tracking-wide ${PAYMENT_BADGE_STYLES[tone]} ${className}`}
    >
      <span className="material-symbols-outlined text-[13px] leading-none">{PAYMENT_BADGE_ICON[tone]}</span>
      <span>{PAYMENT_BADGE_LABEL[tone]}</span>
    </span>
  );
};

const PaymentIdChip: React.FC<{ id?: string }> = ({ id }) => {
  if (!id) return null;
  const short = id.length > 14 ? `${id.slice(0, 8)}...${id.slice(-4)}` : id;
  return (
    <span
      title={id}
      className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold text-[var(--sc-text-dimmer)] bg-[var(--sc-accent-warm)] border border-[var(--sc-border)] px-2 py-0.5 rounded-full cursor-help"
    >
      <span className="material-symbols-outlined text-[12px] leading-none">receipt_long</span>
      <span>{short}</span>
    </span>
  );
};

export const MyBookingsView: React.FC<MyBookingsViewProps> = ({
  hennaBookings,
  jewelleryRentals,
  onNavigate,
  onRescheduleBooking,
  customerUser = null,
  onOpenAuthModal,
}) => {
  const [activeTab, setActiveTab] = useState<'henna' | 'jewellery'>('henna');
  const [selectedBookingDetails, setSelectedBookingDetails] = useState<HennaBooking | null>(null);

  const [rescheduleBooking, setRescheduleBooking] = useState<HennaBooking | null>(null);
  const [newDate, setNewDate] = useState<string>('');
  const [newTimeSlot, setNewTimeSlot] = useState<string>('10:00 AM');
  const [rescheduleNotes, setRescheduleNotes] = useState<string>('');
  const [rescheduleStatus, setRescheduleStatus] = useState<string>('');
  const [isSubmittingReschedule, setIsSubmittingReschedule] = useState<boolean>(false);

  const [mobileInput, setMobileInput] = useState<string>(customerUser?.phone || '');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchedQuery, setSearchedQuery] = useState<string>(customerUser?.phone || '');
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [fetchedHennaBookings, setFetchedHennaBookings] = useState<HennaBooking[] | null>(null);
  const [fetchedJewelleryRentals, setFetchedJewelleryRentals] = useState<JewelleryRental[] | null>(null);
  const [searchMessage, setSearchMessage] = useState<string>('');

  useEffect(() => {
    if (customerUser && (customerUser.phone || customerUser.email)) {
      const userPhoneOrEmail = customerUser.phone || customerUser.email;
      setMobileInput(userPhoneOrEmail);
      handleFetchByMobile(undefined, userPhoneOrEmail);
    } else {
      handleClearLookup();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerUser]);

  const handleClearLookup = () => {
    setFetchedHennaBookings(null);
    setFetchedJewelleryRentals(null);
    setHasSearched(false);
    setMobileInput('');
    setSearchedQuery('');
    setSearchMessage('');
    try {
      localStorage.removeItem('shyam_user_mobile');
    } catch {
      // ignore
    }
  };

  const handleTabSwitch = (tab: 'henna' | 'jewellery') => {
    setActiveTab(tab);
  };

  const handleFetchByMobile = async (e?: React.FormEvent, customPhone?: string) => {
    if (e) e.preventDefault();
    const query = (customPhone || mobileInput || customerUser?.phone || '').trim();
    if (!query) {
      setFetchedHennaBookings([]);
      setFetchedJewelleryRentals([]);
      setHasSearched(false);
      setSearchMessage('Please enter your 10-digit mobile number or reference code.');
      return;
    }

    if (customPhone) setMobileInput(customPhone);

    setIsSearching(true);
    setSearchMessage('Searching both database tables...');
    setSearchedQuery(query);

    try {
      const combinedData = await fetchAllUserBookingsAndOrdersByPhone(query);

      let hennaResults = combinedData.hennaBookings;
      let jewelleryResults = combinedData.jewelleryRentals;

      const digitsOnly = query.replace(/[^0-9]/g, '');
      const cleanLower = query.toLowerCase();

      if (customerUser) {
        const userDigits = (customerUser.phone || '').replace(/[^0-9]/g, '');
        const userNameLower = (customerUser.name || '').toLowerCase();
        const userEmailLower = (customerUser.email || '').toLowerCase();

        const extraHenna = hennaBookings.filter((b) => {
          const bPhone = (b.phone || '').replace(/[^0-9]/g, '');
          const bWa = (b.wa || '').replace(/[^0-9]/g, '');
          const bName = (b.clientName || '').toLowerCase();
          const bEmail = (b.clientEmail || '').toLowerCase();
          const bRef = (b.ref || '').toLowerCase();

          return (
            (userDigits && (bPhone.includes(userDigits) || bWa.includes(userDigits))) ||
            (userNameLower && bName.includes(userNameLower)) ||
            (userEmailLower && bEmail.includes(userEmailLower)) ||
            (digitsOnly && (bPhone.includes(digitsOnly) || bWa.includes(digitsOnly))) ||
            (bRef.includes(cleanLower))
          );
        });

        const existingHennaRefs = new Set(hennaResults.map((b) => b.ref || b.id));
        for (const extra of extraHenna) {
          if (!existingHennaRefs.has(extra.ref || extra.id)) {
            hennaResults.push(extra);
            existingHennaRefs.add(extra.ref || extra.id);
          }
        }

        const extraJewellery = jewelleryRentals.filter((r) => {
          const rPhone = (r.phone || '').replace(/[^0-9]/g, '');
          const rName = (r.clientName || '').toLowerCase();
          const rEmail = (r.email || '').toLowerCase();
          const rRef = (r.ref || '').toLowerCase();

          return (
            (userDigits && rPhone.includes(userDigits)) ||
            (userNameLower && rName.includes(userNameLower)) ||
            (userEmailLower && rEmail.includes(userEmailLower)) ||
            (digitsOnly && rPhone.includes(digitsOnly)) ||
            (rRef.includes(cleanLower))
          );
        });

        const existingJewelRefs = new Set(jewelleryResults.map((r) => r.ref || r.id));
        for (const extra of extraJewellery) {
          if (!existingJewelRefs.has(extra.ref || extra.id)) {
            jewelleryResults.push(extra);
            existingJewelRefs.add(extra.ref || extra.id);
          }
        }
      } else {
        if (hennaResults.length === 0 && digitsOnly.length >= 4) {
          hennaResults = hennaBookings.filter(
            (b) =>
              (b.phone && b.phone.includes(digitsOnly)) ||
              (b.wa && b.wa.includes(digitsOnly)) ||
              (b.ref && b.ref.toLowerCase().includes(cleanLower)) ||
              (b.clientName && b.clientName.toLowerCase().includes(cleanLower))
          );
        }

        if (jewelleryResults.length === 0 && digitsOnly.length >= 4) {
          jewelleryResults = jewelleryRentals.filter(
            (r) =>
              (r.ref && r.ref.toLowerCase().includes(cleanLower)) ||
              (r.phone && r.phone.includes(digitsOnly)) ||
              (r.clientName && r.clientName.toLowerCase().includes(cleanLower))
          );
        }
      }

      setFetchedHennaBookings(hennaResults);
      setFetchedJewelleryRentals(jewelleryResults);
      setHasSearched(true);

      const totalCount = hennaResults.length + jewelleryResults.length;
      if (totalCount > 0) {
        setSearchMessage(
          `✓ Found ${hennaResults.length} Mehendi Appointment(s) and ${jewelleryResults.length} Jewellery Order(s) for ${customerUser ? customerUser.name : query}.`
        );
      } else {
        setSearchMessage(
          `No appointments or orders found for "${query}". Please check your mobile number or place a new booking.`
        );
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setSearchMessage('Lookup failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleOpenReschedule = (booking: HennaBooking) => {
    setRescheduleBooking(booking);
    setNewDate(booking.date || new Date().toISOString().split('T')[0]);
    setNewTimeSlot(booking.timeSlot || '10:00 AM');
    setRescheduleNotes(booking.rescheduleNotes || '');
    setRescheduleStatus('');
  };

  const handleConfirmReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleBooking) return;

    setIsSubmittingReschedule(true);
    setRescheduleStatus('Updating appointment date in Supabase database...');

    try {
      await rescheduleSupabaseBooking(
        rescheduleBooking.ref || rescheduleBooking.id,
        newDate,
        newTimeSlot,
        rescheduleNotes
      );

      if (onRescheduleBooking) {
        onRescheduleBooking(rescheduleBooking.id, newDate, newTimeSlot, rescheduleNotes);
      }

      if (fetchedHennaBookings) {
        setFetchedHennaBookings((prev) =>
          prev
            ? prev.map((b) =>
                b.id === rescheduleBooking.id || b.ref === rescheduleBooking.ref
                  ? {
                      ...b,
                      date: newDate,
                      timeSlot: newTimeSlot,
                      status: 'Rescheduled',
                      rescheduleNotes: rescheduleNotes || b.rescheduleNotes,
                    }
                  : b
              )
            : null
        );
      }

      setRescheduleStatus('✓ Success! Your Mehendi appointment date has been rescheduled.');
      setTimeout(() => {
        setRescheduleBooking(null);
        setIsSubmittingReschedule(false);
      }, 1200);
    } catch {
      setRescheduleStatus('Updated locally.');
      if (onRescheduleBooking) {
        onRescheduleBooking(rescheduleBooking.id, newDate, newTimeSlot, rescheduleNotes);
      }
      setTimeout(() => {
        setRescheduleBooking(null);
        setIsSubmittingReschedule(false);
      }, 1200);
    }
  };

  const displayedHennaBookings = hasSearched ? (fetchedHennaBookings || []) : [];
  const displayedJewelleryRentals = hasSearched ? (fetchedJewelleryRentals || []) : [];

  return (
    <div className="pt-24 pb-20 px-4 md:px-16 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Sidebar Portal Navigation */}
        <aside className="lg:col-span-3 bg-[var(--sc-surface)] rounded-2xl p-6 border border-[var(--sc-border)] lux-card-shadow space-y-6">
          <div className="flex items-center gap-3 border-b border-[var(--sc-border)] pb-4">
            <div className="w-12 h-12 rounded-full bg-[var(--sc-emerald-deep)] text-[var(--sc-emerald-lux)] font-bold flex items-center justify-center text-lg shadow border border-[var(--sc-emerald)]/40">
              SC
            </div>
            <div>
              <p className="font-serif font-bold text-sm text-[var(--sc-text)]">
                Client Portal
              </p>
              <p className="text-[11px] text-[var(--sc-text-dimmer)]">Shyam Creations Concierge</p>
            </div>
          </div>

          {/* Quick Contact Box */}
          <div className="p-3 bg-[var(--sc-emerald-deep)] text-[#ded8ce] rounded-xl text-xs space-y-2 border border-[var(--sc-emerald)]/30">
            <span className="font-bold text-[var(--sc-emerald-lux)] text-[10px] uppercase tracking-wider block">Direct Concierge</span>
            <a href={`tel:${STUDIO_INFO.phone}`} className="flex items-center gap-2 hover:text-[var(--sc-emerald-lux)]">
              <span className="material-symbols-outlined text-sm">call</span>
              <span>{STUDIO_INFO.phone}</span>
            </a>
            <a
              href={`https://wa.me/919363710342?text=${encodeURIComponent('Hi Shyam Creations, I need help with my appointment.')}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 text-[#5F9E7D] hover:underline"
            >
              <span className="material-symbols-outlined text-sm">chat</span>
              <span>WhatsApp Concierge</span>
            </a>
          </div>

          <div className="space-y-1 text-xs font-semibold">
            <button
              onClick={() => handleTabSwitch('henna')}
              className={`w-full text-left px-4 py-3 rounded-lg flex items-center justify-between transition-all ${
                activeTab === 'henna'
                  ? 'bg-[var(--sc-emerald-deep)] text-[#f3ebd9] shadow'
                  : 'text-[var(--sc-text-dim)] hover:bg-[var(--sc-accent-warm)]'
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-base">calendar_add_on</span>
                <span>Mehendi Appointments</span>
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'henna' ? 'bg-[var(--sc-emerald)]/40 text-white' : 'bg-[var(--sc-emerald)]/20 text-[var(--sc-emerald-dark)]'}`}>
                {displayedHennaBookings.length}
              </span>
            </button>

            <button
              onClick={() => handleTabSwitch('jewellery')}
              className={`w-full text-left px-4 py-3 rounded-lg flex items-center justify-between transition-all ${
                activeTab === 'jewellery'
                  ? 'bg-[var(--sc-emerald)] text-white shadow'
                  : 'text-[var(--sc-text-dim)] hover:bg-[var(--sc-accent-warm)]'
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-base">diamond</span>
                <span>Jewellery Rentals & Orders</span>
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'jewellery' ? 'bg-white/20 text-white' : 'bg-[var(--sc-emerald)]/20 text-[var(--sc-emerald-dark)]'}`}>
                {displayedJewelleryRentals.length}
              </span>
            </button>
          </div>
        </aside>

        {/* Right Content Area */}
        <main className="lg:col-span-9 space-y-6">
          {/* Top Bar Header */}
          <div className="bg-[var(--sc-surface)] rounded-2xl p-6 border border-[var(--sc-border)] lux-card-shadow flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="font-serif text-2xl md:text-3xl font-bold text-[var(--sc-text)]">
                  My Bookings & Orders
                </h1>
                {customerUser && (
                  <span className="px-2.5 py-0.5 bg-[var(--sc-emerald)]/15 text-[var(--sc-emerald-dark)] text-[11px] font-bold rounded-full border border-[var(--sc-emerald)]/30 flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">verified</span>
                    <span>{customerUser.name}</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-[var(--sc-text-dimmer)] mt-1">
                {customerUser
                  ? `Viewing appointments and orders linked to ${customerUser.name} (${customerUser.phone || customerUser.email}).`
                  : 'Enter your 10-digit mobile number to view and manage your appointments and jewellery rentals.'}
              </p>
            </div>

            {customerUser ? (
              <div className="flex items-center gap-2 bg-[var(--sc-accent-warm)] border border-[var(--sc-border)] px-3.5 py-2 rounded-xl text-xs">
                <div className="w-8 h-8 rounded-full bg-[var(--sc-emerald)] text-white flex items-center justify-center font-bold text-xs">
                  {customerUser.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-[var(--sc-text)]">{customerUser.name}</p>
                  <p className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>Live Account Synced</span>
                  </p>
                </div>
              </div>
            ) : onOpenAuthModal ? (
              <button
                type="button"
                onClick={onOpenAuthModal}
                className="px-4 py-2 bg-[var(--sc-emerald)] hover:bg-[var(--sc-emerald-light)] text-white text-xs font-bold rounded-xl shadow transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">lock_open</span>
                <span>Sign In For Auto-Sync</span>
              </button>
            ) : null}
          </div>

          {/* Mobile Number Lookup Form / Customer Session Banner */}
          <div className="bg-[var(--sc-emerald-deep)] text-white rounded-2xl p-6 border border-[var(--sc-emerald)]/50 shadow-xl space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-white/15 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[var(--sc-emerald-lux)] text-xl">
                  {customerUser ? 'account_circle' : 'phone_iphone'}
                </span>
                <h3 className="font-serif text-lg font-bold text-[#f3ebd9]">
                  {customerUser
                    ? `Active Customer: ${customerUser.name}`
                    : 'Fetch Bookings by Mobile Number'}
                </h3>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-300 bg-emerald-950/60 border border-emerald-500/40 px-2.5 py-0.5 rounded-full w-max">
                {customerUser ? '✓ Auto-Connected to Supabase' : 'Verified Customer Lookup'}
              </span>
            </div>

            <form onSubmit={handleFetchByMobile} className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <span className="material-symbols-outlined absolute left-3.5 top-3 text-gray-400 text-lg">
                  contact_phone
                </span>
                <input
                  type="text"
                  value={mobileInput}
                  onChange={(e) => setMobileInput(e.target.value)}
                  placeholder={
                    customerUser
                      ? `Phone or email: ${customerUser.phone || customerUser.email}`
                      : 'Enter 10-digit Mobile Number or Ref Code...'
                  }
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#221D18] border border-white/15 text-xs text-white placeholder-gray-400 focus:outline-none focus:border-[var(--sc-emerald-lux)] font-medium"
                />
              </div>

              <button
                type="submit"
                disabled={isSearching}
                className="px-6 py-3 bg-[var(--sc-emerald)] hover:bg-[var(--sc-emerald-light)] text-white rounded-xl text-xs font-bold transition-all shrink-0 flex items-center justify-center gap-2 shadow cursor-pointer disabled:opacity-50"
              >
                {isSearching ? (
                  <span>Searching Database...</span>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-sm">sync</span>
                    <span>{customerUser ? 'REFRESH MY BOOKINGS' : 'FETCH MY BOOKINGS'}</span>
                  </>
                )}
              </button>

              {customerUser && (
                <button
                  type="button"
                  onClick={() => {
                    const phone = customerUser.phone || customerUser.email;
                    setMobileInput(phone);
                    handleFetchByMobile(undefined, phone);
                  }}
                  className="px-4 py-3 bg-[#221D18] hover:bg-[#2A2118] border border-[var(--sc-emerald)]/40 text-[var(--sc-emerald-lux)] rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer"
                  title="Reload bookings registered under your login account"
                >
                  Reload My Account
                </button>
              )}

              {fetchedHennaBookings !== null && !customerUser && (
                <button
                  type="button"
                  onClick={handleClearLookup}
                  className="px-4 py-3 bg-[#2A2118] hover:bg-gray-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Clear Lookup
                </button>
              )}
            </form>

            {searchMessage && (
              <div className={`p-3 rounded-xl text-xs font-semibold ${
                searchMessage.startsWith('✓')
                  ? 'bg-emerald-950/80 border border-emerald-500/50 text-emerald-300'
                  : 'bg-amber-950/80 border border-amber-500/50 text-amber-300'
              }`}>
                {searchMessage}
              </div>
            )}
          </div>

          {/* Toggle Switch and Content */}
          {!hasSearched ? (
            <div className="bg-[var(--sc-surface)] rounded-2xl p-8 md:p-12 text-center border border-[var(--sc-border)] lux-card-shadow space-y-4 animate-in fade-in duration-300">
              <div className="w-16 h-16 rounded-2xl bg-[var(--sc-emerald-deep)] text-[var(--sc-emerald-lux)] mx-auto flex items-center justify-center shadow-lg border border-[var(--sc-emerald)]/30">
                <span className="material-symbols-outlined text-3xl">lock_person</span>
              </div>
              <div className="space-y-1.5 max-w-md mx-auto">
                <h3 className="font-serif text-2xl font-bold text-[var(--sc-text)]">
                  Privacy-Protected Client Portal
                </h3>
                <p className="text-xs text-[var(--sc-text-dimmer)] leading-relaxed">
                  To view your specific Mehendi appointments, jewellery rentals, or dispatch orders, please enter your registered 10-digit mobile number in the search box above.
                </p>
              </div>
              <div className="pt-2 flex flex-wrap items-center justify-center gap-2 text-xs">
                <span className="px-3 py-1 bg-[var(--sc-accent-warm)] border border-[var(--sc-border)] rounded-full text-[var(--sc-emerald-dark)] font-semibold flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">shield</span>
                  Confidential & Secure
                </span>
                <span className="px-3 py-1 bg-[var(--sc-accent-warm)] border border-[var(--sc-border)] rounded-full text-[var(--sc-text)] font-semibold flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">sync</span>
                  Real-time Studio Sync
                </span>
              </div>
            </div>
          ) : (
            <>
              {/* Toggle Switch */}
              <div className="flex border-b border-[var(--sc-border)] pb-2 gap-6">
                <button
                  onClick={() => handleTabSwitch('henna')}
                  className={`pb-2 text-sm font-bold tracking-wider uppercase transition-all flex items-center gap-2 ${
                    activeTab === 'henna'
                      ? 'text-[var(--sc-text)] border-b-2 border-[var(--sc-emerald)]'
                      : 'text-[var(--sc-text-dimmer)] hover:text-[var(--sc-text)]'
                  }`}
                >
                  <span>Mehendi Appointments</span>
                  <span className="px-2 py-0.5 bg-[var(--sc-emerald)]/10 text-[var(--sc-emerald-dark)] rounded-full text-[10px]">
                    {displayedHennaBookings.length}
                  </span>
                </button>

                <button
                  onClick={() => handleTabSwitch('jewellery')}
                  className={`pb-2 text-sm font-bold tracking-wider uppercase transition-all flex items-center gap-2 ${
                    activeTab === 'jewellery'
                      ? 'text-[var(--sc-emerald-dark)] border-b-2 border-[var(--sc-emerald)]'
                      : 'text-[var(--sc-text-dimmer)] hover:text-[var(--sc-text)]'
                  }`}
                >
                  <span>Jewellery Rentals & Orders</span>
                  <span className="px-2 py-0.5 bg-[var(--sc-emerald)]/10 text-[var(--sc-emerald-dark)] rounded-full text-[10px]">
                    {displayedJewelleryRentals.length}
                  </span>
                </button>
              </div>

              {/* Mehendi Appointments List */}
              {activeTab === 'henna' && (
                <div className="space-y-4">
                  {displayedHennaBookings.length === 0 ? (
                    <div className="bg-[var(--sc-surface)] rounded-2xl p-8 text-center border border-[var(--sc-border)] space-y-3">
                      <span className="material-symbols-outlined text-4xl text-gray-400">calendar_today</span>
                      <p className="text-sm font-semibold text-[var(--sc-text)]">
                        No Mehendi appointments found for "{searchedQuery}".
                      </p>
                      <p className="text-xs text-gray-500">
                        Please verify your 10-digit mobile number or contact studio concierge.
                      </p>
                    </div>
                  ) : (
                displayedHennaBookings.map((booking) => (
                  <div
                    key={booking.id || booking.ref}
                    className="bg-[var(--sc-surface)] rounded-2xl p-4 sm:p-6 border border-[var(--sc-border)] lux-card-shadow flex flex-col md:flex-row justify-between items-start md:items-center gap-4 sm:gap-6 hover:border-[var(--sc-emerald)]/50 transition-all"
                  >
                    <div className="flex gap-3 sm:gap-5 items-start">
                      {/* Calendar Badge */}
                      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[var(--sc-emerald-deep)] text-[var(--sc-emerald-lux)] flex flex-col items-center justify-center font-serif shadow-md shrink-0 border border-[var(--sc-emerald)]/30">
                        <span className="text-[9px] uppercase font-bold tracking-widest text-[#a39c91]">
                          {new Date(booking.date).toString() !== 'Invalid Date'
                            ? new Date(booking.date).toLocaleString('default', { month: 'short' })
                            : 'NOV'}
                        </span>
                        <span className="text-xl font-bold leading-none text-[#f3ebd9]">
                          {new Date(booking.date).toString() !== 'Invalid Date'
                            ? new Date(booking.date).getDate()
                            : '20'}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full uppercase ${
                            booking.status === 'Cancelled' ? 'bg-red-100 text-red-700' :
                            booking.status === 'Rescheduled' ? 'bg-amber-100 text-amber-800' :
                            'bg-[var(--sc-emerald)]/10 text-[var(--sc-emerald-dark)]'
                          }`}>
                            {booking.status}
                          </span>
                          <PaymentBadge status={booking.paymentStatus} />
                          <PaymentIdChip id={booking.transactionId} />
                          {booking.serviceCategory && (
                            <span className="px-2 py-0.5 bg-[var(--sc-emerald)]/15 text-[var(--sc-emerald-dark)] text-[10px] font-bold rounded-full uppercase">
                              {booking.serviceCategory}
                            </span>
                          )}
                          <span className="text-xs text-[var(--sc-text-dimmer)] font-mono font-bold">
                            REF: {booking.ref}
                          </span>
                        </div>
                        <h3 className="font-serif text-xl font-bold text-[var(--sc-text)]">
                          {booking.serviceName}
                        </h3>
                        <p className="text-xs text-[var(--sc-text-dim)] flex flex-wrap items-center gap-1">
                          <span className="material-symbols-outlined text-sm text-[var(--sc-emerald)]">schedule</span>
                          <span className="font-semibold text-[var(--sc-text)]">{booking.timeSlot}</span>
                          <span className="mx-1">•</span>
                          <span className="material-symbols-outlined text-sm text-[var(--sc-emerald)]">location_on</span>
                          <span>{booking.location}</span>
                        </p>
                        {booking.paymentAmount && (
                          <p className="text-[11px] text-[var(--sc-text-dimmer)]">
                            Amount: <span className="font-bold text-[var(--sc-text)]">{booking.paymentAmount}</span>
                            {booking.paymentMethod && (
                              <span className="text-[var(--sc-text-dimmer)]"> · {booking.paymentMethod}</span>
                            )}
                          </p>
                        )}
                        <p className="text-[11px] text-[var(--sc-text-dimmer)]">
                          Client: <span className="font-semibold text-[var(--sc-text)]">{booking.clientName}</span> ({booking.phone || booking.wa || booking.clientEmail})
                        </p>
                        {booking.rescheduleNotes && (
                          <p className="text-[10px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 italic w-max">
                            Note: "{booking.rescheduleNotes}"
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3 w-full md:w-auto justify-end border-t md:border-t-0 pt-3 md:pt-0 border-[var(--sc-border)]/50">
                      <button
                        onClick={() => handleOpenReschedule(booking)}
                        className="btn-royal px-4 py-2.5 bg-[var(--sc-emerald)] text-white rounded-xl text-[11px] font-bold hover:bg-[var(--sc-emerald-light)] transition-all flex items-center gap-1.5 shadow"
                      >
                        <span className="material-symbols-outlined text-sm">edit_calendar</span>
                        <span>Reschedule Date</span>
                      </button>

                      <button
                        onClick={() => setSelectedBookingDetails(booking)}
                        className="btn-royal px-4 py-2.5 bg-[var(--sc-accent-warm)] text-[var(--sc-text)] border border-[var(--sc-border)] rounded-xl text-[11px] hover:bg-[var(--sc-emerald)]/10 transition-all font-bold"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Jewellery Rentals & Orders Tab */}
          {activeTab === 'jewellery' && (
            <div className="space-y-4">
              {displayedJewelleryRentals.length === 0 ? (
                <div className="bg-[var(--sc-surface)] rounded-2xl p-8 text-center border border-[var(--sc-border)] space-y-3">
                  <span className="material-symbols-outlined text-4xl text-gray-400">diamond</span>
                  <p className="text-sm font-semibold text-[var(--sc-text)]">No jewellery rentals or orders found.</p>
                </div>
              ) : (
                displayedJewelleryRentals.map((rental) => (
                  <div
                    key={rental.id || rental.ref}
                    className="bg-[var(--sc-surface)] rounded-2xl p-6 border border-[var(--sc-border)] lux-card-shadow flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
                  >
                    <div className="flex gap-5 items-center">
                      <img
                        src={rental.image}
                        alt={rental.productName}
                        className="w-20 h-20 rounded-xl object-cover border border-[var(--sc-border)] shadow-xs"
                      />
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2.5 py-0.5 bg-[var(--sc-emerald)]/10 text-[var(--sc-emerald-dark)] text-[10px] font-bold rounded-full uppercase">
                            {rental.status}
                          </span>
                          <PaymentBadge status={rental.paymentStatus} />
                          <PaymentIdChip id={rental.transactionId} />
                          <span className="text-xs text-[var(--sc-text-dimmer)] font-mono font-bold">
                            REF: {rental.ref}
                          </span>
                        </div>
                        <h3 className="font-serif text-xl font-bold text-[var(--sc-text)]">
                          {rental.productName}
                        </h3>
                        <p className="text-xs text-[var(--sc-text-dim)]">
                          Amount / Rate: <span className="font-bold text-[var(--sc-emerald-dark)]">{rental.dailyRate}</span>
                        </p>
                        <p className="text-xs text-[var(--sc-text-dimmer)] font-semibold">
                          Delivery / Due Date: {rental.returnDue}
                        </p>
                        {rental.paymentMethod && (
                          <p className="text-[11px] text-[var(--sc-text-dimmer)]">Paid via {rental.paymentMethod}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto justify-end border-t md:border-t-0 pt-3 md:pt-0 border-[var(--sc-border)]/50">
                      <a
                        href={`https://wa.me/919363710342?text=${encodeURIComponent(
                          `Hi Shyam Creations, I am contacting you regarding my Jewellery Order/Rental ${rental.productName} (REF: ${rental.ref}).`
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-royal px-4 py-2.5 border border-[var(--sc-emerald)] text-[var(--sc-emerald-dark)] rounded-xl text-[11px] hover:bg-[var(--sc-emerald)] hover:text-white transition-all font-bold flex items-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-sm">chat</span>
                        <span>Contact Concierge</span>
                      </a>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}
      </main>
      </div>

      {/* Reschedule Mehendi Booking Modal */}
      {rescheduleBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-[var(--sc-surface)] rounded-3xl max-w-lg w-full p-6 md:p-8 border border-[var(--sc-emerald)]/50 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-[var(--sc-border)] pb-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-[var(--sc-emerald-dark)] tracking-widest bg-[var(--sc-emerald)]/10 px-2.5 py-0.5 rounded-full border border-[var(--sc-emerald)]/30">
                  Reschedule Appointment Date
                </span>
                <h3 className="font-serif text-2xl font-bold text-[var(--sc-text)] mt-1">
                  {rescheduleBooking.serviceName}
                </h3>
                <p className="text-xs text-[var(--sc-text-dimmer)] font-mono font-semibold">REF: {rescheduleBooking.ref}</p>
              </div>
              <button
                onClick={() => setRescheduleBooking(null)}
                className="p-1.5 hover:bg-[#2A2118] rounded-full text-[#8A7F72] transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {rescheduleStatus && (
              <div className={`p-3 rounded-xl text-xs font-semibold ${
                rescheduleStatus.includes('✓')
                  ? 'bg-emerald-50 border border-emerald-300 text-emerald-900'
                  : 'bg-amber-50 border border-amber-300 text-amber-900'
              }`}>
                {rescheduleStatus}
              </div>
            )}

            <form onSubmit={handleConfirmReschedule} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--sc-text)] uppercase tracking-wider flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm text-[var(--sc-emerald)]">calendar_month</span>
                  <span>Select New Mehendi Date *</span>
                </label>
                <input
                  type="date"
                  required
                  min={new Date().toISOString().split('T')[0]}
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-[var(--sc-accent-warm)] border border-[var(--sc-border)] text-xs font-bold focus:outline-none focus:border-[var(--sc-emerald)]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--sc-text)] uppercase tracking-wider flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm text-[var(--sc-emerald)]">schedule</span>
                  <span>Select Preferred Time Slot *</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {['09:00 AM', '11:30 AM', '02:00 PM', '04:30 PM', '06:00 PM'].map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setNewTimeSlot(slot)}
                      className={`py-2.5 px-3 text-xs rounded-xl border transition-all font-bold ${
                        newTimeSlot === slot
                          ? 'bg-[var(--sc-emerald)] text-white border-[var(--sc-emerald)] shadow'
                          : 'bg-[var(--sc-accent-warm)] text-[var(--sc-text-dim)] border-[var(--sc-border)] hover:bg-[var(--sc-emerald)]/10'
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--sc-text)] uppercase tracking-wider">
                  Reschedule Notes / Reason
                </label>
                <textarea
                  rows={2}
                  value={rescheduleNotes}
                  onChange={(e) => setRescheduleNotes(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-[var(--sc-accent-warm)] border border-[var(--sc-border)] text-xs focus:outline-none focus:border-[var(--sc-emerald)]"
                  placeholder="e.g. Venue timing updated, family event change..."
                />
              </div>

              <div className="border-t border-[var(--sc-border)] pt-4 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => setRescheduleBooking(null)}
                  className="px-4 py-2.5 border border-[var(--sc-border)] rounded-xl text-xs font-bold text-[var(--sc-text-dim)] hover:bg-[var(--sc-accent-warm)] hover:text-[var(--sc-text)] transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReschedule}
                  className="btn-royal px-6 py-2.5 bg-[var(--sc-emerald)] text-white rounded-xl text-xs font-bold hover:bg-[var(--sc-emerald-light)] shadow transition-all flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm">published_with_changes</span>
                  <span>Confirm Reschedule Date</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Booking Details Modal */}
      {selectedBookingDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[var(--sc-bg-soft)] rounded-3xl max-w-lg w-full p-6 border border-[var(--sc-border)] shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-[var(--sc-border)]/60 pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase text-[var(--sc-emerald-dark)]">Shyam Creations Booking</span>
                <h3 className="font-serif text-xl font-bold text-[var(--sc-text)]">
                  Reference #{selectedBookingDetails.ref}
                </h3>
              </div>
              <button
                onClick={() => setSelectedBookingDetails(null)}
                className="p-1 hover:bg-[var(--sc-accent-warm)] rounded-full text-[var(--sc-text-dim)] transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-3 text-xs text-[var(--sc-text)]">
              {/* Payment Status Hero */}
              <div className={`p-4 rounded-2xl border space-y-2 ${
                paymentTone(selectedBookingDetails.paymentStatus) === 'paid'
                  ? 'bg-emerald-50 border-emerald-200'
                  : paymentTone(selectedBookingDetails.paymentStatus) === 'pending'
                  ? 'bg-amber-50 border-amber-200'
                  : 'bg-[var(--sc-surface)] border-[var(--sc-border)]/60'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[var(--sc-text-dimmer)] uppercase tracking-wider text-[10px]">Payment Status</span>
                  <PaymentBadge status={selectedBookingDetails.paymentStatus} className="text-[11px] px-3 py-1" />
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  {selectedBookingDetails.paymentAmount && (
                    <span className="text-base font-black text-[var(--sc-text)]">{selectedBookingDetails.paymentAmount}</span>
                  )}
                  {selectedBookingDetails.paymentMethod && (
                    <span className="text-[var(--sc-text-dim)]">{selectedBookingDetails.paymentMethod}</span>
                  )}
                </div>
                {selectedBookingDetails.transactionId && (
                  <div className="pt-1 border-t border-[var(--sc-border)]/40">
                    <span className="text-[10px] font-bold text-[var(--sc-text-dimmer)] block mb-0.5">Transaction ID</span>
                    <span className="font-mono text-[11px] font-semibold text-[var(--sc-text)] break-all">
                      {selectedBookingDetails.transactionId}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <span className="font-bold text-[var(--sc-text-dimmer)] block">Service Title:</span>
                <span className="font-serif text-base font-semibold text-[var(--sc-text)]">
                  {selectedBookingDetails.serviceName}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="font-bold text-[var(--sc-text-dimmer)] block">Appointment Date:</span>
                  <span className="font-bold text-[var(--sc-emerald-dark)]">{selectedBookingDetails.date}</span>
                </div>
                <div>
                  <span className="font-bold text-[var(--sc-text-dimmer)] block">Time Slot:</span>
                  <span className="font-bold text-[var(--sc-text)]">{selectedBookingDetails.timeSlot}</span>
                </div>
              </div>

              <div>
                <span className="font-bold text-[var(--sc-text-dimmer)] block">Location / Address:</span>
                {selectedBookingDetails.location}
              </div>

              <div>
                <span className="font-bold text-[var(--sc-text-dimmer)] block">Client Contact:</span>
                {selectedBookingDetails.clientName} ({selectedBookingDetails.phone || selectedBookingDetails.wa || selectedBookingDetails.clientEmail})
              </div>

              {selectedBookingDetails.specialRequests && (
                <div>
                  <span className="font-bold text-[var(--sc-text-dimmer)] block">Special Notes:</span>
                  <p className="p-3 bg-[var(--sc-surface)] rounded-xl border border-[var(--sc-border)]/50 italic text-[var(--sc-text-dim)]">
                    "{selectedBookingDetails.specialRequests}"
                  </p>
                </div>
              )}
            </div>

            <div className="border-t border-[var(--sc-border)]/50 pt-4 flex justify-between items-center">
              <a
                href={`https://wa.me/919363710342?text=${encodeURIComponent(
                  `Concierge question regarding booking ${selectedBookingDetails.ref}`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-bold text-[#2C6B4F] flex items-center gap-1 hover:underline"
              >
                <span className="material-symbols-outlined text-sm">chat</span>
                <span>WhatsApp Studio Concierge</span>
              </a>
              <button
                onClick={() => setSelectedBookingDetails(null)}
                className="btn-royal px-6 py-2.5 bg-[var(--sc-emerald-deep)] text-white rounded-xl text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
