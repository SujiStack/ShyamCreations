import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
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
    // Placeholder emails from the DB fallback mapping are not real contacts.
    const rawEmail = ((b as HennaBooking).clientEmail || '').toLowerCase();
    const bEmail = rawEmail === 'client@example.com' ? '' : rawEmail;
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

  const showRescheduleBlocked = (title: string, text: string, focusSearch = false) => {
    // Visible feedback at the click point — previously this only set a
    // message at the top of the page, so the button looked dead.
    setSearchMessage(text);
    if (focusSearch) {
      const input = document.getElementById('my-bookings-lookup');
      input?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      window.setTimeout(() => input?.focus(), 350);
    }
    void Swal.fire({ icon: 'warning', title, text, confirmButtonColor: 'var(--sc-emerald-dark)' });
  };

  const openRescheduleModal = (booking: HennaBooking | JewelleryRental, kind: 'henna' | 'jewellery') => {
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

  const handleOpenReschedule = async (booking: HennaBooking | JewelleryRental, kind: 'henna' | 'jewellery') => {
    if (!isReschedulableStatus((booking as HennaBooking).status)) {
      showRescheduleBlocked('Cannot Reschedule', 'This booking is already closed and cannot be rescheduled. Please contact the studio on WhatsApp.');
      return;
    }
    if (customerUser && !isBookingOwner(booking)) {
      showRescheduleBlocked('Not Your Booking', 'This booking belongs to a different customer. Please sign in with the phone number used for the booking to reschedule it.');
      return;
    }
    // Guest who hasn't searched yet: ask for their number/ref right here,
    // verify it finds this booking, then open the reschedule modal — no
    // need to scroll up and search manually first. This check exists because
    // the pre-search list shows every customer's bookings, so rescheduling
    // without it would let anyone change anyone else's appointment.
    if (!customerUser && !hasSearched) {
      const bookingRef = (booking as HennaBooking).ref || (booking as JewelleryRental).ref || '';
      const { value: query, isConfirmed } = await Swal.fire({
        icon: 'question',
        title: 'Verify to Reschedule',
        text: 'Enter the mobile number or reference code used for this booking to continue.',
        input: 'text',
        inputPlaceholder: '10-digit mobile number or REF code',
        inputAttributes: { autocomplete: 'off' },
        showCancelButton: true,
        confirmButtonText: 'Verify & Continue',
        cancelButtonText: 'Cancel',
        confirmButtonColor: 'var(--sc-emerald-dark)',
        inputValidator: (v) => (!v || v.trim().length < 4 ? 'Please enter your mobile number or REF code.' : null),
      });
      if (!isConfirmed || !query) return;
      const trimmed = String(query).trim();
      setIsSearching(true);
      try {
        const combined = await fetchAllUserBookingsAndOrdersByPhone(trimmed);
        const foundHenna = combined.hennaBookings.find((b) => b.ref === bookingRef);
        const foundRental = combined.jewelleryRentals.find((r) => r.ref === bookingRef);
        const foundBooking = foundHenna || foundRental;
        if (!foundBooking) {
          showRescheduleBlocked('Booking Not Found', `No booking found for "${trimmed}". Please check your mobile number or reference code and try again.`, true);
          return;
        }
        // Verified — keep the searched list so the card updates in place.
        setMobileInput(trimmed);
        setSearchedQuery(trimmed);
        setFetchedHennaBookings(combined.hennaBookings);
        setFetchedJewelleryRentals(combined.jewelleryRentals);
        setHasSearched(true);
        setSearchMessage(`✓ Found ${combined.hennaBookings.length} Mehendi Appointment(s) and ${combined.jewelleryRentals.length} Jewellery Order(s) for ${trimmed}.`);
        openRescheduleModal(foundBooking as any, kind);
      } catch (err) {
        console.error('Reschedule verification failed:', err);
        showRescheduleBlocked('Verification Failed', 'Could not verify your booking. Please try again or WhatsApp the studio.');
      } finally {
        setIsSearching(false);
      }
      return;
    }
    openRescheduleModal(booking, kind);
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

  // Actual price of the selection (full service price), distinct from the
  // amount actually paid shown in the Payment row (advance token vs full).
  const getActualPrice = (b: any, isHenna: boolean): string => {
    if (isHenna) {
      if (b?.totalPrice) return b.totalPrice;
      const fromName = String(b?.serviceName || '').match(/₹[\d,]+(?:\.\d+)?/g);
      if (fromName && fromName.length > 0) return fromName[fromName.length - 1];
      return b?.paymentAmount || '—';
    }
    return b?.totalAmount || b?.totalPrice || b?.dailyRate || '—';
  };

  // "Advance Paid ₹100" vs "Paid ₹2,000" vs "Pending" — from paymentStatus,
  // with the paid amount appended so it's clear what was actually paid.
  const getPaymentDisplay = (b: any): { label: string; tone: 'advance' | 'paid' | 'pending' | 'none' } => {
    // Advance flag may only exist in the requests text on DB-fetched rows
    // (payments ledger says PAID for both) — check it as a fallback.
    const isAdvance = /advance paid/i.test(String(b?.paymentStatus || '')) || /advance paid/i.test(String(b?.specialRequests || ''));
    const amountFromText = String(b?.specialRequests || '').match(/₹[\d,]+(?:\.\d+)?/)?.[0] || '';
    const amount = b?.paymentAmount || b?.totalAmount || amountFromText || '';
    if (isAdvance) return { label: `Advance Paid${amount ? ` • ${amount}` : ''}`, tone: 'advance' };
    const raw = String(b?.paymentStatus || '').trim();
    if (!raw) return { label: '—', tone: 'none' };
    const s = raw.toLowerCase();
    if (s.includes('paid') || s.includes('completed') || s.includes('captured') || s.includes('success') || s === 'confirmed')
      return { label: `Paid${amount ? ` • ${amount}` : ''}`, tone: 'paid' };
    if (s.includes('pending') || s.includes('processing')) return { label: `Pending${amount ? ` • ${amount}` : ''}`, tone: 'pending' };
    return { label: raw, tone: 'pending' };
  };

  return (
    <div className="pt-24 pb-20 px-4 md:px-8 max-w-6xl mx-auto min-h-screen bg-[var(--sc-bg-soft)]">
      {/* Header */}
      <div className="mb-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--sc-emerald-dark)]">Shyam Creations</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl md:text-4xl font-bold tracking-tight text-[var(--sc-text)]">My Bookings</h1>
            <p className="mt-1.5 text-sm text-[var(--sc-text-dim)]">View your appointments & orders, reschedule, and track delivery.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {customerUser && (
              <span className="inline-flex items-center gap-2 rounded-full border border-[var(--sc-border)] bg-[var(--sc-surface)] py-1.5 pl-1.5 pr-3 text-xs font-semibold text-[var(--sc-text)] shadow-xs">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--sc-emerald-deep)] text-[10px] font-bold text-[var(--sc-emerald-lux)]">
                  {(customerUser.name || '').slice(0, 2).toUpperCase()}
                </span>
                {customerUser.name}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--sc-border)] bg-[var(--sc-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--sc-text-dim)]">
              <span className="material-symbols-outlined text-sm leading-none">event_note</span>
              {allHenna.length + allJewellery.length} total
            </span>
          </div>
        </div>
      </div>

      {/* Search / Lookup */}
      <section className="rounded-2xl border border-[var(--sc-border)] bg-[var(--sc-surface)] p-5 shadow-xs mb-6">
        <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--sc-text-dimmer)]" htmlFor="my-bookings-lookup">
          Find your bookings
        </label>
        <form onSubmit={handleFetchByMobile} className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--sc-text-dimmer)]">
              <span className="material-symbols-outlined text-sm leading-none">search</span>
            </span>
            <input
              id="my-bookings-lookup"
              type="text"
              value={mobileInput}
              onChange={(e) => setMobileInput(e.target.value)}
              placeholder={
                customerUser
                  ? `Phone: ${customerUser.phone || customerUser.email}`
                  : 'Enter 10-digit mobile number or REF code'
              }
              className="w-full rounded-xl border border-[var(--sc-border)] bg-[var(--sc-accent-warm)] py-3 pl-10 pr-4 text-sm text-[var(--sc-text)] placeholder:text-[var(--sc-text-dimmer)] focus:border-[var(--sc-emerald)] focus:bg-[var(--sc-surface)] focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={isSearching}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--sc-emerald-deep)] px-6 py-3 text-sm font-bold text-[var(--sc-emerald-lux)] transition-colors hover:bg-[var(--sc-emerald-dark)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-sm leading-none">{isSearching ? 'progress_activity' : 'search'}</span>
            {isSearching ? 'Searching…' : 'Find Bookings'}
          </button>
          {customerUser && !isSearching && (
            <button
              type="button"
              onClick={() => handleClearLookup()}
              className="rounded-xl border border-[var(--sc-border)] px-4 py-3 text-sm font-semibold text-[var(--sc-text-dim)] transition-colors hover:bg-[var(--sc-accent-warm)] hover:text-[var(--sc-text)]"
            >
              Clear
            </button>
          )}
        </form>
        <p className="mt-2.5 text-[11px] text-[var(--sc-text-dimmer)]">Use the mobile number or reference (REF) from your booking confirmation.</p>
        {searchMessage && (
          <p role="status" className={`mt-3 flex items-start gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-semibold ${
            searchMessage.startsWith('✓')
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-amber-200 bg-amber-50 text-amber-800'
          }`}>
            <span className="material-symbols-outlined mt-0.5 text-sm leading-none">{searchMessage.startsWith('✓') ? 'check_circle' : 'info'}</span>
            <span>{searchMessage}</span>
          </p>
        )}
      </section>

      {/* Tabs */}
      <div className="mb-6 flex gap-1.5 rounded-2xl border border-[var(--sc-border)] bg-[var(--sc-surface)] p-1.5" role="tablist" aria-label="Filter bookings">
        {([
          { id: 'all' as const, label: 'All', icon: 'layers', count: allHenna.length + allJewellery.length },
          { id: 'henna' as const, label: 'Mehendi', icon: 'palette', count: allHenna.length },
          { id: 'jewellery' as const, label: 'Jewellery', icon: 'diamond', count: allJewellery.length },
        ]).map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => handleTabSwitch(tab.id)}
            className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
              activeTab === tab.id
                ? 'bg-[var(--sc-emerald-deep)] text-[var(--sc-emerald-lux)] shadow-xs'
                : 'text-[var(--sc-text-dim)] hover:bg-[var(--sc-accent-warm)] hover:text-[var(--sc-text)]'
            }`}
          >
            <span className="material-symbols-outlined text-sm leading-none">{tab.icon}</span>
            {tab.label}
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${activeTab === tab.id ? 'bg-white/15 text-inherit' : 'bg-[var(--sc-accent-warm)] text-[var(--sc-text-dim)]'}`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Bookings List — square cards, necessary data only */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {displayedBookings.length === 0 ? (
          <div className="col-span-full rounded-3xl border border-dashed border-[var(--sc-border)] bg-[var(--sc-surface)] px-6 py-14 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--sc-accent-warm)]">
              <span className="material-symbols-outlined text-2xl leading-none text-[var(--sc-text-dimmer)]">
                {activeTab === 'henna' ? 'calendar_today' : activeTab === 'jewellery' ? 'diamond' : 'event_note'}
              </span>
            </div>
            <h3 className="font-serif text-xl font-bold text-[var(--sc-text)]">
              No {activeTab === 'all' ? 'bookings or orders' : activeTab === 'henna' ? 'Mehendi appointments' : 'Jewellery rentals'} found
            </h3>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-[var(--sc-text-dim)]">
              {hasSearched
                ? 'We could not find anything for that number or reference. Check the details, or place a new booking.'
                : 'Enter your mobile number or reference code above to fetch your bookings.'}
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              <button onClick={() => onNavigate('henna-booking')} className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--sc-emerald-deep)] px-4 py-2.5 text-xs font-bold text-[var(--sc-emerald-lux)] transition-colors hover:bg-[var(--sc-emerald-dark)]">
                <span className="material-symbols-outlined text-sm leading-none">palette</span> Book Mehendi
              </button>
              <button onClick={() => onNavigate('product')} className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--sc-border)] px-4 py-2.5 text-xs font-bold text-[var(--sc-text)] transition-colors hover:bg-[var(--sc-accent-warm)]">
                <span className="material-symbols-outlined text-sm leading-none">diamond</span> Browse Jewellery
              </button>
            </div>
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

            const badge = getDateBadgeParts(getBookingDate(booking));
            const isPaid = paymentStatus === 'Paid' || paymentStatus === 'Completed' || paymentStatus === 'confirmed';
            const canReschedule =
              isReschedulableStatus(status) &&
              !String((booking as JewelleryRental).productName || '').includes('(Express Dispatch)');
            const rawTime = getBookingTime(booking) || '—';
            const slotLabel = rawTime.includes('Morning') ? 'Morning Slot' : rawTime.includes('Evening') ? 'Evening Slot' : rawTime;
            return (
              <article
                key={getBookingRef(booking)}
                onClick={() => setSelectedBooking(booking)}
                className={`group flex h-full min-h-[260px] cursor-pointer flex-col rounded-2xl border border-[var(--sc-border)] bg-[var(--sc-surface)] p-5 shadow-xs transition-all hover:-translate-y-0.5 hover:border-[var(--sc-emerald)]/50 hover:shadow-md ${isHenna ? 'border-t-4 border-t-[var(--sc-emerald-deep)]' : 'border-t-4 border-t-[#C08A34]'}`}
              >
                {/* Top row: date + status */}
                <div className="flex items-start justify-between gap-3">
                  <div className={`flex w-14 shrink-0 flex-col items-center justify-center rounded-xl px-2 py-2.5 ${isHenna ? 'bg-[var(--sc-emerald-deep)] text-[var(--sc-emerald-lux)]' : 'border border-[#E8CE9B] bg-[#F7EEDD] text-[#6F4A18]'}`}>
                    <span className="text-[9px] font-bold uppercase tracking-[0.2em]">{badge.month}</span>
                    <span className="font-serif text-2xl font-bold leading-none">{badge.day}</span>
                  </div>
                  {isHenna ? (
                    paymentStatus ? (
                      (() => {
                        const p = getPaymentDisplay(booking);
                        return (
                          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${p.tone === 'paid' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : p.tone === 'advance' ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-[var(--sc-border)] bg-[var(--sc-accent-warm)] text-[var(--sc-text-dim)]'}`}>
                            {p.tone === 'advance' ? 'Advance Paid' : p.tone === 'paid' ? 'Paid' : p.tone === 'pending' ? 'Pending' : p.label}
                          </span>
                        );
                      })()
                    ) : status ? (
                      <span className="inline-flex items-center rounded-full border border-[var(--sc-border)] bg-[var(--sc-accent-warm)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--sc-text-dim)]">{status}</span>
                    ) : null
                  ) : (
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${isPaid ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
                      {String(paymentStatus || '').toLowerCase().includes('advance') ? 'Advance Paid' : isPaid ? 'Paid' : 'Booked'}
                    </span>
                  )}
                </div>

                {/* Necessary data only — fixed-height title keeps meta aligned */}
                <h3 className="mt-3 line-clamp-2 min-h-[2.75rem] font-serif text-base font-bold leading-snug text-[var(--sc-text)]">{getBookingName(booking)}</h3>
                <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-[var(--sc-text-dim)]">
                  <span className="material-symbols-outlined text-[11px] leading-none">{isHenna ? 'palette' : 'diamond'}</span>
                  {isHenna ? 'Mehendi' : 'Jewellery'}
                  <span aria-hidden="true">·</span>
                  <RefChip id={getBookingRef(booking)} />
                </p>

                {/* Aligned rows — values never truncate, full date always visible */}
                <dl className="mt-3 space-y-2 border-t border-[var(--sc-border)]/70 pt-3 text-xs">
                  <div className="flex items-center justify-between gap-3">
                    <dt className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-[var(--sc-text-dimmer)]">{isHenna ? 'Date' : 'Start'}</dt>
                    <dd className="font-bold text-[var(--sc-text)]">{formatDate(getBookingDate(booking)) || '—'}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-[var(--sc-text-dimmer)]">{isHenna ? 'Slot' : 'Return'}</dt>
                    <dd className="text-right font-semibold leading-snug text-[var(--sc-text)]">{slotLabel}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-[var(--sc-text-dimmer)]">Amount</dt>
                    <dd className="font-bold text-[var(--sc-text)]">{getActualPrice(booking, isHenna)}</dd>
                  </div>
                </dl>

                {/* Actions pinned to the bottom of the square card */}
                <div className="mt-auto flex items-center gap-2 pt-4">
                  {canReschedule && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleOpenReschedule(booking as any, isHenna ? 'henna' : 'jewellery'); }}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[var(--sc-emerald-deep)] px-3 py-2.5 text-xs font-bold text-[var(--sc-emerald-lux)] transition-colors hover:bg-[var(--sc-emerald-dark)]"
                    >
                      <span className="material-symbols-outlined text-sm leading-none">calendar_month</span>
                      Reschedule
                    </button>
                  )}
                  {(trackingUrl || (trackingNumber && deliveryAddress)) && (
                    <a
                      href={trackingUrl || '#'}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      title="Track Shipment"
                      className="inline-flex items-center justify-center rounded-xl border border-[var(--sc-border)] px-3 py-2.5 text-xs font-semibold text-[var(--sc-text)] transition-colors hover:bg-[var(--sc-accent-warm)]"
                    >
                      <span className="material-symbols-outlined text-sm leading-none">local_shipping</span>
                    </a>
                  )}
                  <a
                    href={`https://wa.me/${STUDIO_INFO.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                      `Hi, I have a question about my booking ${getBookingRef(booking)}.`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    title="WhatsApp Support"
                    className="inline-flex items-center justify-center rounded-xl border border-[var(--sc-border)] px-3 py-2.5 text-xs font-semibold text-[var(--sc-text-dim)] transition-colors hover:bg-emerald-50 hover:text-emerald-800"
                  >
                    <span className="material-symbols-outlined text-sm leading-none">chat</span>
                  </a>
                  <span className={`flex items-center justify-center rounded-xl border border-[var(--sc-border)] px-3 py-2.5 text-[var(--sc-text-dimmer)] ${canReschedule ? '' : 'ml-auto'}`} title="View details">
                    <span className="material-symbols-outlined text-sm leading-none">chevron_right</span>
                  </span>
                </div>
              </article>
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs" onClick={() => setSelectedBooking(null)}>
            <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-[var(--sc-border)] bg-[var(--sc-surface)] p-6 shadow-2xl animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
              <div className="mb-5 flex items-start justify-between gap-4 border-b border-[var(--sc-border)] pb-4">
                <div className="min-w-0">
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--sc-emerald-dark)]">
                    <span className="material-symbols-outlined text-[11px] leading-none">{isHenna ? 'palette' : 'diamond'}</span>
                    {isHenna ? 'Mehendi Appointment' : 'Jewellery Rental / Order'}
                  </span>
                  <h3 className="mt-1.5 font-serif text-xl font-bold leading-snug text-[var(--sc-text)]">
                    {getBookingName(booking)}
                  </h3>
                  <div className="mt-2"><RefChip id={getBookingRef(booking)} /></div>
                </div>
                <button
                  onClick={() => setSelectedBooking(null)}
                  aria-label="Close details"
                  className="shrink-0 rounded-full border border-[var(--sc-border)] p-1.5 text-[var(--sc-text-dim)] transition-colors hover:bg-[var(--sc-accent-warm)] hover:text-[var(--sc-text)]"
                >
                  <span className="material-symbols-outlined block text-sm leading-none">close</span>
                </button>
              </div>

              <div className="space-y-5 text-sm">
                {/* Booking only */}
                <section>
                  <h4 className="mb-2.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--sc-emerald-dark)]">
                    <span className="material-symbols-outlined text-sm leading-none">event_note</span> Booking
                  </h4>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-2xl border border-[var(--sc-border)] bg-[var(--sc-bg-soft)] p-4">
                    <div>
                      <dt className="text-[10px] font-bold uppercase tracking-wider text-[var(--sc-text-dimmer)]">Reference</dt>
                      <dd className="mt-1"><RefChip id={getBookingRef(booking)} /></dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-bold uppercase tracking-wider text-[var(--sc-text-dimmer)]">Status</dt>
                      <dd className="mt-1 font-semibold text-[var(--sc-text)]">{getBookingStatus(booking) || '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-bold uppercase tracking-wider text-[var(--sc-text-dimmer)]">{isHenna ? 'Date' : 'Start Date'}</dt>
                      <dd className="mt-1 font-semibold text-[var(--sc-text)]">{formatDate(getBookingDate(booking)) || '—'}</dd>
                    </div>
                    {getBookingTime(booking) && (
                      <div>
                        <dt className="text-[10px] font-bold uppercase tracking-wider text-[var(--sc-text-dimmer)]">{isHenna ? 'Time Slot' : 'Return Due'}</dt>
                        <dd className="mt-1 font-semibold text-[var(--sc-text)]">{formatDate(getBookingTime(booking)) === getBookingTime(booking) ? getBookingTime(booking) : formatDate(getBookingTime(booking))}</dd>
                      </div>
                    )}
                    <div>
                      <dt className="text-[10px] font-bold uppercase tracking-wider text-[var(--sc-text-dimmer)]">Amount</dt>
                      <dd className="mt-1 font-semibold text-[var(--sc-text)]">{getActualPrice(booking, isHenna)}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-bold uppercase tracking-wider text-[var(--sc-text-dimmer)]">Payment</dt>
                      <dd className="mt-1">
                        {(() => {
                          const p = getPaymentDisplay(booking);
                          return (
                            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold ${
                              p.tone === 'paid' ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                              : p.tone === 'advance' ? 'border-amber-200 bg-amber-50 text-amber-800'
                              : 'border-[var(--sc-border)] bg-[var(--sc-accent-warm)] text-[var(--sc-text-dim)]'
                            }`}>
                              <span className="material-symbols-outlined text-[11px] leading-none">{p.tone === 'paid' ? 'check_circle' : p.tone === 'advance' ? 'schedule' : 'info'}</span>
                              {p.label}
                            </span>
                          );
                        })()}
                      </dd>
                    </div>
                    {!isHenna && (booking as JewelleryRental).depositAmount && (booking as JewelleryRental).depositAmount !== '₹0' && (
                      <div>
                        <dt className="text-[10px] font-bold uppercase tracking-wider text-[var(--sc-text-dimmer)]">
                          {(booking as JewelleryRental).status === 'Returned' ? 'Deposit (refunded)' : 'Deposit (refundable)'}
                        </dt>
                        <dd className="mt-1 font-bold text-[var(--sc-emerald-dark)]">{(booking as JewelleryRental).depositAmount}</dd>
                      </div>
                    )}
                  </dl>
                </section>

                {/* Address only — just the address text */}
                <section>
                  <h4 className="mb-2.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--sc-emerald-dark)]">
                    <span className="material-symbols-outlined text-sm leading-none">location_on</span> Address
                  </h4>
                  <p className="rounded-2xl border border-[var(--sc-border)] bg-[var(--sc-bg-soft)] p-4 font-semibold leading-relaxed text-[var(--sc-text)]">
                    {isHenna
                      ? ((booking as HennaBooking).deliveryAddress || (booking as HennaBooking).location || 'Studio / Client Venue')
                      : ((booking as JewelleryRental).deliveryAddress || 'Studio Pickup')}
                  </p>
                </section>

                <div className="flex justify-end gap-2 border-t border-[var(--sc-border)] pt-4">
                  <button
                    onClick={() => setSelectedBooking(null)}
                    className="rounded-xl border border-[var(--sc-border)] px-4 py-2.5 text-sm font-semibold text-[var(--sc-text)] transition-colors hover:bg-[var(--sc-accent-warm)]"
                  >
                    Close
                  </button>
                  {(
                    <a
                      href={`https://wa.me/${STUDIO_INFO.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                        `Hello, I have a query about my ${getBookingName(booking)} (REF: ${getBookingRef(booking)}).`
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--sc-emerald-deep)] px-4 py-2.5 text-sm font-bold text-[var(--sc-emerald-lux)] transition-colors hover:bg-[var(--sc-emerald-dark)]"
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
