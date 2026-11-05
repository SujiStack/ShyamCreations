import React, { useState, useEffect } from 'react';
import { ViewMode, HennaBooking, JewelleryRental, CustomerAccount, PendingAuthAction, DisabledSlot } from '../types';
import {
  fetchAllUserBookingsAndOrdersByPhone,
  rescheduleSupabaseBooking,
  rescheduleSupabaseJewelleryBooking,
} from '../lib/supabaseService';
import { STUDIO_INFO } from '../data/mockData';
import { formatDateDDMMYY, getDateBadgeParts } from '../lib/dateFormat';
import { DateInputDDMMYY } from '../components/DateInputDDMMYY';

// Canonical slots — must match HennaBookingView / CheckAvailabilityView exactly.
// The old reschedule modal offered '09:00 AM', '11:00 AM', … which never
// matched the booked/disabled checks (exact string compare), so rescheduled
// bookings neither blocked their new slot nor were blocked by existing ones.
export const APPOINTMENT_SLOTS = [
  'Morning Slot (09:00 AM - 01:00 PM)',
  'Evening Slot (04:00 PM - 09:00 PM)',
] as const;

const digitsOf = (v?: string | null) => (v || '').replace(/[^0-9]/g, '');
const todayStr = () => new Date().toISOString().split('T')[0];

interface MyBookingsViewProps {
  hennaBookings: HennaBooking[];
  jewelleryRentals: JewelleryRental[];
  disabledSlots?: DisabledSlot[];
  onNavigate: (view: ViewMode) => void;
  onRescheduleBooking?: (bookingId: string, newDate: string, newTimeSlot: string, notes?: string) => void;
  onRescheduleJewelleryRental?: (bookingId: string, newStartDate: string, notes?: string) => void;
  customerUser?: CustomerAccount | null;
  onOpenAuthModal?: () => void;
  onRequireAuth?: (pendingAction?: PendingAuthAction) => void;
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

const PAYMENT_STYLES: Record<PaymentTone, string> = {
  paid: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  pending: 'bg-amber-50 text-amber-800 border-amber-200',
  failed: 'bg-red-50 text-red-700 border-red-200',
  refunded: 'bg-slate-100 text-slate-700 border-slate-200',
};

const PAYMENT_ICONS: Record<PaymentTone, string> = {
  paid: '✓',
  pending: '⋯',
  failed: '✕',
  refunded: '↺',
};

const StatusBadge: React.FC<{ status?: string; className?: string }> = ({ status, className = '' }) => {
  const tone = paymentTone(status);
  if (!tone) return null;
  return (
    <span
      className={`inline-flex items-center gap-1 px-3 py-1 text-[10px] font-bold rounded-full border capitalize ${PAYMENT_STYLES[tone]} ${className}`}
    >
      <span className="text-xs leading-none">{PAYMENT_ICONS[tone]}</span>
      {tone === 'paid' ? 'Paid' : tone === 'pending' ? 'Pending' : tone === 'failed' ? 'Failed' : 'Refunded'}
    </span>
  );
};

const RefChip: React.FC<{ id?: string }> = ({ id }) => {
  if (!id) return null;
  const short = id.length > 14 ? `${id.slice(0, 8)}…${id.slice(-4)}` : id;
  return (
    <span
      title={id}
      className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold text-[var(--sc-text-dimmer)] bg-[var(--sc-accent-warm)] border border-[var(--sc-border)] px-2.5 py-1 rounded-full"
    >
      <span>REF: {short}</span>
    </span>
  );
};

export const MyBookingsView: React.FC<MyBookingsViewProps> = ({
  hennaBookings,
  jewelleryRentals,
  disabledSlots = [],
  onNavigate,
  onRescheduleBooking,
  onRescheduleJewelleryRental,
  customerUser = null,
  onOpenAuthModal,
  onRequireAuth,
}) => {
  // Tab state: show a unified timeline of all bookings
  const [activeTab, setActiveTab] = useState<'all' | 'henna' | 'jewellery'>('all');
  const [selectedBooking, setSelectedBooking] = useState<HennaBooking | JewelleryRental | null>(null);
  const [rescheduleBooking, setRescheduleBooking] = useState<HennaBooking | JewelleryRental | null>(null);
  const [rescheduleKind, setRescheduleKind] = useState<'henna' | 'jewellery'>('henna');
  const [newDate, setNewDate] = useState<string>('');
  const [newTimeSlot, setNewTimeSlot] = useState<string>(APPOINTMENT_SLOTS[0]);
  const [rescheduleNotes, setRescheduleNotes] = useState<string>('');
  const [rescheduleStatus, setRescheduleStatus] = useState<string>('');
  const [rescheduleTone, setRescheduleTone] = useState<'success' | 'warn' | 'error'>('success');
  const [rescheduleSummary, setRescheduleSummary] = useState<string>('');
  const [isSubmittingReschedule, setIsSubmittingReschedule] = useState<boolean>(false);

  const [mobileInput, setMobileInput] = useState<string>(customerUser?.phone || '');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchedQuery, setSearchedQuery] = useState<string>(customerUser?.phone || '');
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [searchMessage, setSearchMessage] = useState<string>('');
  const [fetchedHennaBookings, setFetchedHennaBookings] = useState<HennaBooking[] | null>(null);
  const [fetchedJewelleryRentals, setFetchedJewelleryRentals] = useState<JewelleryRental[] | null>(null);

  useEffect(() => {
    if (customerUser && (customerUser.phone || customerUser.email)) {
      const userPhoneOrEmail = customerUser.phone || customerUser.email;
      setMobileInput(userPhoneOrEmail);
      handleFetchByMobile(undefined, userPhoneOrEmail);
    } else {
      handleClearLookup();
    }
  }, [customerUser]);

  const handleClearLookup = () => {
    setFetchedHennaBookings(null);
    setFetchedJewelleryRentals(null);
    setHasSearched(false);
    setMobileInput('');
    setSearchedQuery('');
    setSearchMessage('');
  };

  const handleTabSwitch = (tab: 'all' | 'henna' | 'jewellery') => {
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
    setSearchMessage('Searching database...');
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

  // A booking may only be rescheduled by its owner: either the signed-in
  // customer whose phone/email matches, or a guest who has just looked the
  // booking up with their own mobile number / ref. Previously the button was
  // shown on every row (the pre-search list contains ALL customers' bookings)
  // with no check at all.
  const isBookingOwner = (b: HennaBooking | JewelleryRental): boolean => {
    // Fetched jewellery rentals carry no phone/email on the rental object, so
    // ownership for them is proven by the phone/ref lookup itself.
    const bPhone = digitsOf((b as HennaBooking).phone);
    const bEmail = ((b as HennaBooking).clientEmail || '').toLowerCase();
    if (customerUser) {
      if (!bPhone && !bEmail) return hasSearched;
      const userDigits = digitsOf(customerUser.phone);
      if (userDigits && bPhone && (bPhone.includes(userDigits) || userDigits.includes(bPhone))) return true;
      if (customerUser.email && bEmail && bEmail === customerUser.email.toLowerCase()) return true;
      // Logged in as someone else — never allow rescheduling this booking.
      return false;
    }
    // Guest: must have searched in this session (phone/ref lookup).
    return hasSearched;
  };

  const isReschedulableStatus = (status?: string) => {
    const s = (status || '').toLowerCase();
    return s !== 'cancelled' && s !== 'completed' && s !== 'returned' && s !== 'delivered';
  };

  const handleOpenReschedule = (booking: HennaBooking | JewelleryRental, kind: 'henna' | 'jewellery') => {
    if (!isReschedulableStatus((booking as HennaBooking).status)) {
      setSearchMessage('This booking is already closed and cannot be rescheduled. Please contact the studio on WhatsApp.');
      return;
    }
    if (!customerUser && !hasSearched) {
      setSearchMessage('Please search with your mobile number or reference code first, then reschedule your appointment.');
      return;
    }
    if (customerUser && !isBookingOwner(booking)) {
      setSearchMessage('This booking belongs to a different customer. Please sign in with the phone number used for the booking to reschedule it.');
      if (onRequireAuth) onRequireAuth({ action: 'view-price', targetView: 'my-bookings' });
      else if (onOpenAuthModal) onOpenAuthModal();
      return;
    }
    const currentDate = kind === 'henna' ? (booking as HennaBooking).date : (booking as JewelleryRental).startDate;
    const currentSlot = kind === 'henna' ? (booking as HennaBooking).timeSlot : '';
    const slotIsCanonical = (APPOINTMENT_SLOTS as readonly string[]).includes(currentSlot);
    setRescheduleBooking(booking);
    setRescheduleKind(kind);
    setNewDate(currentDate || todayStr());
    setNewTimeSlot(slotIsCanonical ? currentSlot : APPOINTMENT_SLOTS[0]);
    setRescheduleNotes(kind === 'henna' ? (booking as HennaBooking).rescheduleNotes || '' : '');
    setRescheduleStatus('');
    setRescheduleTone('success');
    setRescheduleSummary('');
  };

  const handleConfirmReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleBooking || isSubmittingReschedule) return;

    const isHenna = rescheduleKind === 'henna';
    const bookingRef = (rescheduleBooking as HennaBooking).ref || (rescheduleBooking as JewelleryRental).ref || '';
    // Prefer ref for the DB lookup (local ids like `hb-…` are not DB ids);
    // App/local matching accepts ref OR id, so this is safe there too.
    const key = bookingRef || (rescheduleBooking as HennaBooking).id || '';
    const currentDate = isHenna ? (rescheduleBooking as HennaBooking).date : (rescheduleBooking as JewelleryRental).startDate;
    const currentSlot = isHenna ? (rescheduleBooking as HennaBooking).timeSlot : '';
    const fmt = (d: string) => formatDateDDMMYY(d);

    // --- Validation (previously: none beyond the HTML min attribute) ---
    if (!newDate) {
      setRescheduleTone('error');
      setRescheduleStatus('Please choose a new date.');
      return;
    }
    if (newDate < todayStr()) {
      setRescheduleTone('error');
      setRescheduleStatus('New date cannot be in the past. Please choose today or a future date.');
      return;
    }
    if (isHenna) {
      if (!newTimeSlot) {
        setRescheduleTone('error');
        setRescheduleStatus('Please choose a time slot.');
        return;
      }
      if (newDate === currentDate && newTimeSlot === currentSlot) {
        setRescheduleTone('error');
        setRescheduleStatus('This is the same date and slot as your current appointment. Please pick a different one.');
        return;
      }
      // Slot must be free: not booked by another appointment, not disabled by the studio.
      const poolByRef = new Map<string, HennaBooking>();
      [...(fetchedHennaBookings ?? []), ...hennaBookings].forEach((b) => {
        if (b?.ref) poolByRef.set(b.ref, b);
      });
      const slotTaken = Array.from(poolByRef.values()).some(
        (b) =>
          b.ref !== bookingRef &&
          b.id !== key &&
          b.date === newDate &&
          b.timeSlot === newTimeSlot &&
          (b.status || '').toLowerCase() !== 'cancelled'
      );
      if (slotTaken) {
        setRescheduleTone('error');
        setRescheduleStatus('That date and slot is already booked. Please choose another slot.');
        return;
      }
      const slotDisabled = disabledSlots.some((s) => s.date === newDate && s.timeSlot === newTimeSlot);
      if (slotDisabled) {
        setRescheduleTone('error');
        setRescheduleStatus('That date and slot is not available (disabled by the studio). Please choose another slot.');
        return;
      }
    } else if (newDate === currentDate) {
      setRescheduleTone('error');
      setRescheduleStatus('This is the same start date as your current rental. Please pick a different date.');
      return;
    }

    setIsSubmittingReschedule(true);
    setRescheduleStatus('Updating...');
    setRescheduleTone('success');
    try {
      const result = isHenna
        ? await rescheduleSupabaseBooking(key, newDate, newTimeSlot, rescheduleNotes)
        : await rescheduleSupabaseJewelleryBooking(key, newDate, rescheduleNotes);

      // Apply locally in every case (fetched list, selected modal, App state +
      // localStorage). Previously only App state was updated, so the list the
      // customer was looking at (fetched results) never changed until they
      // searched again, and device-only bookings always showed "failed".
      if (isHenna) {
        setFetchedHennaBookings((prev) =>
          prev
            ? prev.map((b) =>
                b.id === key || b.ref === bookingRef
                  ? { ...b, date: newDate, timeSlot: newTimeSlot, status: 'Rescheduled', rescheduleNotes: rescheduleNotes || b.rescheduleNotes }
                  : b
              )
            : prev
        );
        try { onRescheduleBooking?.(key, newDate, newTimeSlot, rescheduleNotes); } catch { /* local only */ }
      } else {
        setFetchedJewelleryRentals((prev) =>
          prev
            ? prev.map((r) =>
                r.id === key || r.ref === bookingRef
                  ? { ...r, startDate: newDate, returnDue: newDate, status: 'Rescheduled' }
                  : r
              )
            : prev
        );
        try { onRescheduleJewelleryRental?.(key, newDate, rescheduleNotes); } catch { /* local only */ }
      }
      setSelectedBooking((prev) => {
        if (!prev || ((prev as HennaBooking).ref || (prev as JewelleryRental).ref) !== bookingRef) return prev;
        return isHenna
          ? { ...(prev as HennaBooking), date: newDate, timeSlot: newTimeSlot, status: 'Rescheduled', rescheduleNotes: rescheduleNotes || (prev as HennaBooking).rescheduleNotes }
          : { ...(prev as JewelleryRental), startDate: newDate, returnDue: newDate, status: 'Rescheduled' };
      });

      const summary = isHenna
        ? `New appointment: ${fmt(newDate)} • ${newTimeSlot}`
        : `New rental start: ${fmt(newDate)}`;
      setRescheduleSummary(summary);

      if (result.success) {
        setRescheduleTone('success');
        setRescheduleStatus(`✓ Rescheduled successfully! ${summary}. Updated in the studio database.`);
      } else {
        // Local-only / offline / not-found-in-DB bookings: keep the customer's
        // change on this device and ask them to confirm with the studio,
        // instead of discarding it with a generic failure.
        setRescheduleTone('warn');
        setRescheduleStatus(
          `✓ Rescheduled on this device to ${summary}. ${result.error || 'The studio database was not updated — please WhatsApp the studio to confirm your new date.'}`
        );
      }
      window.setTimeout(() => setRescheduleBooking(null), 3500);
    } catch (err: any) {
      setRescheduleTone('error');
      setRescheduleStatus(`⚠ Reschedule failed: ${err?.message || err}. Please try again or WhatsApp the studio.`);
    } finally {
      setIsSubmittingReschedule(false);
    }
  };

  // Combine bookings for unified view
  const allHenna = fetchedHennaBookings ?? hennaBookings;
  const allJewellery = fetchedJewelleryRentals ?? jewelleryRentals;

  const displayedBookings = activeTab === 'all'
    ? [...allHenna, ...allJewellery]
    : activeTab === 'henna'
    ? allHenna
    : allJewellery;

  // Display format for all booking dates: DD/MM/YY.
  // Stored values remain ISO YYYY-MM-DD for the DB.
  const formatDate = (dateStr: string) => formatDateDDMMYY(dateStr);

  const getBookingType = (b: any): 'henna' | 'jewellery' => {
    // Respect the explicit type first. Jewellery orders are stored as
    // HennaBooking with serviceCategory 'Jewellery Rental & Sale', so the old
    // check (serviceName + serviceCategory => henna) mis-labelled every
    // jewellery order as a Mehendi appointment and offered Mehendi
    // rescheduling for it.
    if (b?.type === 'jewellery') return 'jewellery';
    if (b?.type === 'henna') return 'henna';
    const category = String(b?.serviceCategory || '').toLowerCase();
    if (category.includes('jewell')) return 'jewellery';
    if ('serviceName' in b && 'serviceCategory' in b) return 'henna';
    return 'jewellery';
  };

  const getBookingRef = (b: any): string => b.ref || b.id || '';
  const getBookingName = (b: any): string => b.serviceName || b.productName || 'Untitled';
  const getBookingDate = (b: any): string => b.date || b.startDate || '';
  const getBookingTime = (b: any): string => b.timeSlot || b.returnDue || '';
  const getBookingStatus = (b: any): string => b.status || '';
  const getBookingClient = (b: any): string => b.clientName || b.clientName || '';

  return (
    <div className="pt-20 pb-16 px-4 md:px-8 max-w-6xl mx-auto min-h-screen bg-[var(--sc-bg-soft)]">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-serif text-3xl md:text-4xl font-bold text-[var(--sc-text)]">My Bookings</h1>
        {customerUser && (
          <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-[var(--sc-emerald)]/10 rounded-full border border-[var(--sc-emerald)]/30">
            <span className="w-6 h-6 rounded-full bg-[var(--sc-emerald)] text-white flex items-center justify-center text-xs font-bold">
              {(customerUser.name || '').slice(0, 2).toUpperCase()}
            </span>
            <span className="font-semibold text-[var(--sc-emerald-dark)]">{customerUser.name}</span>
          </div>
        )}
      </div>

      {/* Search / Lookup */}
      <div className="bg-[var(--sc-surface)] rounded-2xl p-6 border border-[var(--sc-border)] shadow-md mb-6">
        <form onSubmit={handleFetchByMobile} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={mobileInput}
              onChange={(e) => setMobileInput(e.target.value)}
              placeholder={
                customerUser
                  ? `Phone: ${customerUser.phone || customerUser.email}`
                  : 'Enter 10-digit mobile number or REF code...'
              }
              className="w-full px-4 py-3 rounded-xl bg-[var(--sc-accent-warm)] border border-[var(--sc-border)] text-sm focus:outline-none focus:border-[var(--sc-emerald)]"
            />
          </div>
          <button
            type="submit"
            disabled={isSearching}
            className="px-6 py-3 bg-[var(--sc-emerald)] hover:bg-[var(--sc-emerald-light)] text-white rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
          >
            {isSearching ? 'Searching...' : 'Find Bookings'}
          </button>
          {customerUser && !isSearching && (
            <button
              type="button"
              onClick={() => handleClearLookup()}
              className="px-4 py-3 bg-[var(--sc-surface-alt)] hover:bg-[var(--sc-accent-warm)] text-[var(--sc-text-dim)] rounded-xl text-sm font-bold transition-all"
            >
              Clear
            </button>
          )}
        </form>
        {searchMessage && (
          <p className={`mt-3 text-xs font-semibold ${
            searchMessage.startsWith('✓') ? 'text-emerald-600' : 'text-amber-600'
          }`}>
            {searchMessage}
          </p>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 bg-[var(--sc-surface)] rounded-xl p-1.5 border border-[var(--sc-border)]">
        <button
          onClick={() => handleTabSwitch('all')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'all' ? 'bg-[var(--sc-emerald-dark)] text-white shadow' : 'text-[var(--sc-text-dim)] hover:text-[var(--sc-text)]'
          }`}
        >
          All ({allHenna.length + allJewellery.length})
        </button>
        <button
          onClick={() => handleTabSwitch('henna')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'henna' ? 'bg-[var(--sc-emerald-deep)] text-white shadow' : 'text-[var(--sc-text-dim)] hover:text-[var(--sc-text)]'
          }`}
        >
          Mehendi ({allHenna.length})
        </button>
        <button
          onClick={() => handleTabSwitch('jewellery')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'jewellery' ? 'bg-[var(--sc-emerald)] text-white shadow' : 'text-[var(--sc-text-dim)] hover:text-[var(--sc-text)]'
          }`}
        >
          Jewellery ({allJewellery.length})
        </button>
      </div>

      {/* Bookings List */}
      <div className="space-y-4">
        {displayedBookings.length === 0 ? (
          <div className="bg-[var(--sc-surface)] rounded-2xl p-12 text-center border border-[var(--sc-border)]">
            <div className="w-16 h-16 rounded-2xl bg-[var(--sc-accent-warm)] mx-auto flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-3xl text-[var(--sc-text-dimmer)]">
                {activeTab === 'henna' ? 'calendar_today' : activeTab === 'jewellery' ? 'diamond' : 'book'}
              </span>
            </div>
            <h3 className="font-serif text-xl font-bold text-[var(--sc-text)] mb-2">
              No {activeTab === 'all' ? 'bookings or orders' : activeTab === 'henna' ? 'mehendi appointments' : 'jewellery rentals'} found
            </h3>
            <p className="text-sm text-[var(--sc-text-dim)] max-w-md mx-auto">
              Enter your mobile number or reference code to fetch your bookings from our database.
            </p>
          </div>
        ) : (
          displayedBookings.map((booking) => {
            const type = getBookingType(booking);
            const isHenna = type === 'henna';
            const status = getBookingStatus(booking);
            const paymentStatus = (booking as any).paymentStatus;
            const trackingUrl = (booking as JewelleryRental).trackingUrl;
            const deliveryAddress = (booking as JewelleryRental).deliveryAddress;
            const trackingNumber = (booking as JewelleryRental).trackingNumber;

            return (
              <div key={getBookingRef(booking)} className="bg-[var(--sc-surface)] rounded-2xl p-5 border border-[var(--sc-border)] hover:border-[var(--sc-emerald)]/40 transition-all cursor-pointer shadow-sm"
                onClick={() => setSelectedBooking(booking)}
              >
                <div className="flex items-center gap-4">
                  {/* Date Badge */}
                  <div className={`w-16 h-16 rounded-xl flex flex-col items-center justify-center font-serif shadow-md shrink-0 ${
                    isHenna ? 'bg-[var(--sc-emerald-deep)] text-[var(--sc-emerald-lux)]' : 'bg-[#f3ebd9] text-[#3a4f3a]'
                  }`}>
                    <span className="text-[9px] uppercase font-bold tracking-wider">
                      {getDateBadgeParts(getBookingDate(booking)).month}
                    </span>
                    <span className="text-xl font-bold leading-none">
                      {getDateBadgeParts(getBookingDate(booking)).day}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-serif text-lg font-bold text-[var(--sc-text)]">
                          {getBookingName(booking)}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          {isHenna ? (
                            <StatusBadge status={status} />
                          ) : (
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                              paymentStatus === 'Paid' || paymentStatus === 'Completed' || paymentStatus === 'confirmed'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}>
                              {paymentStatus === 'Paid' || paymentStatus === 'Completed' || paymentStatus === 'confirmed' ? 'Paid' : 'Booked'}
                            </span>
                          )}
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                            isHenna ? 'bg-[var(--sc-emerald)]/10 text-[var(--sc-emerald-dark)] border-[var(--sc-emerald)]/20'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}>
                            {isHenna ? 'Mehendi' : 'Jewellery'}
                          </span>
                          <RefChip id={getBookingRef(booking)} />
                        </div>

                        {/* Additional Details for Mehendi */}
                        {isHenna && (
                          <div className="mt-2 space-y-1 text-xs text-[var(--sc-text-dim)]">
                            <div className="flex items-center gap-4 flex-wrap">
                              {booking.serviceCategory && (
                                <span>Category: <span className="text-[var(--sc-text)] font-medium">{booking.serviceCategory}</span></span>
                              )}
                              {booking.paymentAmount && (
                                <span>Amount: <span className="text-[var(--sc-text)] font-medium">{booking.paymentAmount}</span></span>
                              )}
                            </div>
                            <div className="flex items-center gap-4 flex-wrap">
                              {getBookingDate(booking) && (
                                <span>Date: <span className="text-[var(--sc-text)] font-medium">{formatDate(getBookingDate(booking))}</span></span>
                              )}
                              {getBookingTime(booking) && (
                                <span>Slot: <span className="text-[var(--sc-text)] font-medium">{getBookingTime(booking)}</span></span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        {isHenna ? (
                          <div className="text-right">
                            {getBookingTime(booking) && (
                              <p className="text-sm font-bold text-[var(--sc-emerald-dark)]">{getBookingTime(booking)}</p>
                            )}
                            {getBookingDate(booking) && (
                              <p className="text-xs text-[var(--sc-text-dim)] mt-1">
                                {formatDate(getBookingDate(booking))}
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <p className="text-sm font-bold text-[var(--sc-emerald-dark)]">{(booking as JewelleryRental).dailyRate || '---'}</p>
                            {(paymentStatus === 'Paid' || paymentStatus === 'Completed' || paymentStatus === 'confirmed') && (
                              <p className="text-xs text-[var(--sc-text-dim)] mt-1">
                                {(booking as JewelleryRental).returnDue ? `Due: ${(booking as JewelleryRental).returnDue}` : ''}
                              </p>
                            )}
                            {(trackingUrl || (trackingNumber && deliveryAddress)) && (
                              <a
                                href={trackingUrl || '#'}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-[10px] text-[var(--sc-emerald-dark)] hover:text-[var(--sc-emerald)] font-semibold flex items-center gap-1 justify-end"
                              >
                                <span>Track Shipment</span>
                                <span className="material-symbols-outlined text-xs">launch</span>
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {(isHenna || isReschedulableStatus(status)) && (
                  <div className="mt-3 pt-3 border-t border-[var(--sc-border)]/50 flex flex-wrap gap-2 text-xs">
                    {isReschedulableStatus(status) && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleOpenReschedule(booking as any, isHenna ? 'henna' : 'jewellery'); }}
                        className="px-3 py-1.5 bg-[var(--sc-emerald)]/10 text-[var(--sc-emerald-dark)] rounded-lg font-semibold hover:bg-[var(--sc-emerald)]/20 transition-all"
                      >
                        {isHenna ? 'Reschedule Appointment' : 'Reschedule Rental'}
                      </button>
                    )}
                    <a
                      href={`https://wa.me/${STUDIO_INFO.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                        `Hi, I have a question about my booking ${getBookingRef(booking)}.`
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="px-3 py-1.5 bg-amber-50 text-amber-800 rounded-lg font-semibold hover:bg-amber-100 transition-all"
                    >
                      WhatsApp Support
                    </a>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Booking Details Modal */}
      {selectedBooking && (() => {
        const isHenna = getBookingType(selectedBooking) === 'henna';
        const booking = selectedBooking;
        const paymentStatus = (booking as any).paymentStatus;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="bg-[var(--sc-surface)] rounded-3xl max-w-lg w-full p-6 border border-[var(--sc-border)] shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="flex justify-between items-start border-b border-[var(--sc-border)] pb-4 mb-4">
                <div>
                  <span className={`text-[10px] font-bold uppercase text-[var(--sc-emerald-dark)]`}>
                    {isHenna ? 'Mehendi Appointment' : 'Jewellery Rental / Order'}
                  </span>
                  <h3 className="font-serif text-xl font-bold text-[var(--sc-text)] mt-1">
                    {getBookingName(booking)}
                  </h3>
                  <RefChip id={getBookingRef(booking)} />
                </div>
                <button
                  onClick={() => setSelectedBooking(null)}
                  className="p-1 hover:bg-[var(--sc-accent-warm)] rounded-full text-[var(--sc-text-dim)] transition-colors"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="space-y-4 text-sm">
                <div>
                  <span className="text-xs font-bold text-[var(--sc-text-dimmer)] block mb-1">Reference Number</span>
                  <RefChip id={getBookingRef(booking)} />
                </div>

                {isHenna && (
                  <>
                    <div>
                      <span className="text-xs font-bold text-[var(--sc-text-dimmer)] block mb-1">Chosen Category</span>
                      <span className="text-[var(--sc-text)]">{(booking as HennaBooking).serviceCategory || 'Mehendi Service'}</span>
                    </div>
                    {booking.paymentAmount && (
                      <div>
                        <span className="text-xs font-bold text-[var(--sc-text-dimmer)] block mb-1">Amount</span>
                        <span className="text-[var(--sc-emerald-dark)] font-bold">{booking.paymentAmount}</span>
                      </div>
                    )}
                  </>
                )}

                <div>
                  <span className="text-xs font-bold text-[var(--sc-text-dimmer)] block mb-1">Date</span>
                  <span className="font-bold text-[var(--sc-text)]">
                    {formatDate(getBookingDate(booking))}
                  </span>
                </div>

                {getBookingTime(booking) && (
                  <div>
                    <span className="text-xs font-bold text-[var(--sc-text-dimmer)] block mb-1">Time Slot</span>
                    <span className="font-bold text-[var(--sc-text)]">{getBookingTime(booking)}</span>
                  </div>
                )}

                <div>
                  <span className="text-xs font-bold text-[var(--sc-text-dimmer)] block mb-1">Status</span>
                  <StatusBadge status={getBookingStatus(booking)} className="text-xs px-3 py-1" />
                </div>

                {isHenna ? (
                  <>
                    <div>
                      <span className="text-xs font-bold text-[var(--sc-text-dimmer)] block mb-1">Location</span>
                      <span className="text-[var(--sc-text)]">{(booking as HennaBooking).location || 'Studio / Client Venue'}</span>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-[var(--sc-text-dimmer)] block mb-1">Client</span>
                      <span className="text-[var(--sc-text)]">
                        {(booking as HennaBooking).clientName} ({getBookingRef(booking)})
                      </span>
                    </div>
                    {booking.specialRequests && (
                      <div>
                        <span className="text-xs font-bold text-[var(--sc-text-dimmer)] block mb-1">Special Requests</span>
                        <p className="text-[var(--sc-text-dim)] italic">"{booking.specialRequests}"</p>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div>
                      <span className="text-xs font-bold text-[var(--sc-text-dimmer)] block mb-1">Rate</span>
                      <span className="font-bold text-[var(--sc-emerald-dark)]">{(booking as JewelleryRental).dailyRate}</span>
                    </div>
                    {(booking as JewelleryRental).depositAmount && (booking as JewelleryRental).depositAmount !== '₹0' && (
                      <div>
                        <span className="text-xs font-bold text-[var(--sc-text-dimmer)] block mb-1">
                          {(booking as JewelleryRental).status === 'Returned'
                            ? 'Security Deposit (refunded after safe return)'
                            : 'Security Deposit (refundable after safe return)'}
                        </span>
                        <span className="font-bold text-[var(--sc-emerald-dark)]">{(booking as JewelleryRental).depositAmount}</span>
                      </div>
                    )}
                    {booking.returnDue && (
                      <div>
                        <span className="text-xs font-bold text-[var(--sc-text-dimmer)] block mb-1">Return Due</span>
                        <span className="text-[var(--sc-text)]">{booking.returnDue}</span>
                      </div>
                    )}
                    {(booking as JewelleryRental).deliveryAddress && (paymentStatus === 'Paid' || paymentStatus === 'Completed' || paymentStatus === 'confirmed') && (
                      <div>
                        <span className="text-xs font-bold text-[var(--sc-text-dimmer)] block mb-1">Delivery Address</span>
                        <span className="text-[var(--sc-text)]">{(booking as JewelleryRental).deliveryAddress}</span>
                      </div>
                    )}
                    {(booking as JewelleryRental).trackingUrl && (
                      <div>
                        <span className="text-xs font-bold text-[var(--sc-text-dimmer)] block mb-1">Track Shipment</span>
                        <a
                          href={(booking as JewelleryRental).trackingUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[var(--sc-emerald-dark)] font-semibold flex items-center gap-1"
                        >
                          <span>{(booking as JewelleryRental).trackingNumber || (booking as JewelleryRental).trackingUrl}</span>
                          <span className="material-symbols-outlined text-xs">launch</span>
                        </a>
                      </div>
                    )}
                  </>
                )}

                <div className="border-t border-[var(--sc-border)] pt-4 flex justify-end gap-2">
                  <button
                    onClick={() => setSelectedBooking(null)}
                    className="px-4 py-2 bg-[var(--sc-accent-warm)] text-[var(--sc-text)] rounded-xl font-bold text-sm"
                  >
                    Close
                  </button>
                  {!isHenna && (
                    <a
                      href={`https://wa.me/${STUDIO_INFO.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                        `Hello, I have a query about my ${getBookingName(booking)} (REF: ${getBookingRef(booking)}).`
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2 bg-[var(--sc-emerald)] text-white rounded-xl font-bold text-sm"
                    >
                      WhatsApp Support
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Reschedule Modal */}
      {rescheduleBooking && (() => {
        const isHenna = rescheduleKind === 'henna';
        const currentDate = isHenna ? (rescheduleBooking as HennaBooking).date : (rescheduleBooking as JewelleryRental).startDate;
        const currentSlot = isHenna ? (rescheduleBooking as HennaBooking).timeSlot : '';
        const bookingRef = (rescheduleBooking as HennaBooking).ref || (rescheduleBooking as JewelleryRental).ref || '';
        const bookingName = (rescheduleBooking as HennaBooking).serviceName || (rescheduleBooking as JewelleryRental).productName || 'Booking';
        // Legacy bookings may carry an old slot format — keep it selectable.
        const slotOptions: string[] = [...APPOINTMENT_SLOTS];
        if (currentSlot && !slotOptions.includes(currentSlot)) slotOptions.push(currentSlot);
        const poolByRef = new Map<string, HennaBooking>();
        [...(fetchedHennaBookings ?? []), ...hennaBookings].forEach((b) => { if (b?.ref) poolByRef.set(b.ref, b); });
        const slotBooked = (slot: string) =>
          Array.from(poolByRef.values()).some(
            (b) => b.ref !== bookingRef && b.date === newDate && b.timeSlot === slot && (b.status || '').toLowerCase() !== 'cancelled'
          );
        const slotDisabled = (slot: string) => disabledSlots.some((s) => s.date === newDate && s.timeSlot === slot);
        const waText = encodeURIComponent(
          `Hi Shyam Creations, I rescheduled my ${isHenna ? 'Mehendi appointment' : 'jewellery rental'} (REF: ${bookingRef}). New date: ${newDate}${isHenna ? `, Slot: ${newTimeSlot}` : ''}.${rescheduleNotes ? ` Reason: ${rescheduleNotes}` : ''} Please confirm.`
        );
        const toneClass =
          rescheduleTone === 'success'
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
            : rescheduleTone === 'warn'
              ? 'bg-amber-50 text-amber-800 border-amber-200'
              : 'bg-red-50 text-red-700 border-red-200';
        return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-[var(--sc-surface)] rounded-3xl max-w-lg w-full p-6 border border-[var(--sc-emerald)]/50 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-[var(--sc-border)] pb-4 mb-4">
              <div>
                <span className="text-[10px] font-bold uppercase text-[var(--sc-emerald-dark)] tracking-wide">
                  {isHenna ? 'Reschedule Appointment' : 'Reschedule Rental'}
                </span>
                <h3 className="font-serif text-xl font-bold text-[var(--sc-text)] mt-1">{bookingName}</h3>
              </div>
              <button
                onClick={() => setRescheduleBooking(null)}
                disabled={isSubmittingReschedule}
                className="p-1 hover:bg-[var(--sc-accent-warm)] rounded-full text-[var(--sc-text-dim)] disabled:opacity-40"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="mb-4 bg-[var(--sc-accent-warm)] border border-[var(--sc-border)] rounded-2xl p-3 text-xs space-y-1">
              <p><span className="font-bold text-[var(--sc-text-dimmer)]">Reference:</span> <span className="font-mono font-semibold">{bookingRef}</span></p>
              <p><span className="font-bold text-[var(--sc-text-dimmer)]">Current:</span> {formatDate(currentDate)}{currentSlot ? ` • ${currentSlot}` : ''}</p>
              {rescheduleSummary && (
                <p><span className="font-bold text-[var(--sc-text-dimmer)]">New:</span> <span className="font-semibold text-[var(--sc-emerald-dark)]">{rescheduleSummary}</span></p>
              )}
            </div>

            {rescheduleStatus && (
              <p className={`mb-4 text-xs font-semibold border rounded-xl px-3 py-2 ${toneClass}`}>
                {rescheduleStatus}
              </p>
            )}

            <form onSubmit={handleConfirmReschedule} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[var(--sc-text-dimmer)] mb-1">
                  {isHenna ? 'New Date' : 'New Rental Start Date'}
                </label>
                <DateInputDDMMYY
                  required
                  min={todayStr()}
                  value={newDate}
                  onChange={setNewDate}
                  disabled={isSubmittingReschedule}
                />
                {!isHenna && (
                  <p className="text-[11px] text-[var(--sc-text-dim)] mt-1">Your return date shifts by the same number of days, so the rental duration stays the same.</p>
                )}
              </div>

              {isHenna && (
                <div>
                  <label className="block text-xs font-bold text-[var(--sc-text-dimmer)] mb-2">Preferred Time Slot</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {slotOptions.map((slot) => {
                      const booked = slotBooked(slot);
                      const disabled = slotDisabled(slot);
                      const unavailable = booked || disabled;
                      const isSelected = newTimeSlot === slot;
                      return (
                        <button
                          key={slot}
                          type="button"
                          disabled={unavailable || isSubmittingReschedule}
                          onClick={() => setNewTimeSlot(slot)}
                          className={`py-2.5 px-3 text-xs rounded-xl border font-bold transition-all text-left ${
                            isSelected
                              ? 'bg-[var(--sc-emerald)] text-white border-[var(--sc-emerald)] shadow'
                              : unavailable
                                ? 'bg-slate-100 text-slate-400 border-slate-200 line-through cursor-not-allowed'
                                : 'bg-[var(--sc-accent-warm)] text-[var(--sc-text-dim)] border-[var(--sc-border)] hover:bg-[var(--sc-emerald)]/10'
                          }`}
                        >
                          {slot}
                          {booked && <span className="block text-[10px] font-semibold no-underline">Already booked</span>}
                          {!booked && disabled && <span className="block text-[10px] font-semibold">Not available</span>}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-[var(--sc-text-dim)] mt-1">Only free slots for the selected date are selectable.</p>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[var(--sc-text-dimmer)] mb-1">Reason / Notes (optional)</label>
                <textarea
                  rows={2}
                  value={rescheduleNotes}
                  onChange={(e) => setRescheduleNotes(e.target.value)}
                  placeholder="e.g. Venue timing updated, family event change..."
                  disabled={isSubmittingReschedule}
                  className="w-full px-4 py-3 rounded-xl bg-[var(--sc-accent-warm)] border border-[var(--sc-border)] text-sm focus:outline-none focus:border-[var(--sc-emerald)] disabled:opacity-50"
                />
              </div>

              <div className="flex flex-wrap justify-end gap-2 pt-2">
                {rescheduleSummary && (
                  <a
                    href={`https://wa.me/${STUDIO_INFO.phone.replace(/[^0-9]/g, '')}?text=${waText}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 bg-[#2C6B4F] text-white rounded-xl font-bold text-sm"
                  >
                    WhatsApp Studio to Confirm
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setRescheduleBooking(null)}
                  disabled={isSubmittingReschedule}
                  className="px-4 py-2 bg-[var(--sc-accent-warm)] text-[var(--sc-text-dim)] rounded-xl font-bold text-sm disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReschedule}
                  className="px-5 py-2 bg-[var(--sc-emerald)] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <span>{isSubmittingReschedule ? 'Updating…' : 'Confirm Reschedule'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
        );
      })()}
    </div>
  );
};
