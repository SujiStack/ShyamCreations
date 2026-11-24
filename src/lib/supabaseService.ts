import {
  supabase,
  getSupabaseCredentials,
} from './supabase';
import { HennaBooking, JewelleryCustomer, JewelleryBooking, CustomerAccount, CartItem, JewelleryRental } from '../types';
import { formatDateDDMMYY } from './dateFormat';

export interface DBJewelleryBookingRow {
  id?: string;
  created_at?: string;
  booking_ref: string;
  client_name: string;
  phone: string;
  email?: string;
  product_name: string;
  jewellery_id?: string;
  booking_type?: string;
  start_date?: string;
  end_date?: string;
  duration_days?: number;
  daily_rate?: string;
  deposit_amount?: string;
  total_price: string;
  location?: string;
  payment_status?: string;
  payment_method?: string;
  transaction_id?: string;
  status: string;
  notes?: string;
  tracking_courier?: string;
  tracking_number?: string;
  tracking_url?: string;
}

export const JEWELLERY_BOOKINGS_TABLE_SQL = `-- Run this SQL in your Supabase SQL Editor to create the jewellery_bookings table:

CREATE TABLE IF NOT EXISTS public.jewellery_bookings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    booking_ref VARCHAR(100) NOT NULL,
    client_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255),
    product_name VARCHAR(255) NOT NULL,
    jewellery_id VARCHAR(100),
    booking_type VARCHAR(50) DEFAULT 'Rental',
    start_date DATE,
    end_date DATE,
    duration_days INT DEFAULT 1,
    daily_rate VARCHAR(50),
    deposit_amount VARCHAR(50) DEFAULT '₹0',
    total_price VARCHAR(50) NOT NULL,
    location TEXT DEFAULT 'Studio Pickup',
    payment_status VARCHAR(50) DEFAULT 'Confirmed',
    payment_method VARCHAR(100) DEFAULT 'Google Pay / UPI',
    transaction_id VARCHAR(100),
    status VARCHAR(50) DEFAULT 'Active Rental',
    notes TEXT,
    tracking_courier TEXT,
    tracking_number TEXT,
    tracking_url TEXT
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.jewellery_bookings ENABLE ROW LEVEL SECURITY;

-- Allow anonymous & authenticated users to insert & select jewellery bookings
CREATE POLICY "Allow public insert and select on jewellery_bookings"
ON public.jewellery_bookings
FOR ALL
USING (true)
WITH CHECK (true);
`;

export interface DBJewelleryCustomerRow {
  id?: string;
  created_at?: string;
  order_ref: string;
  customer_name: string;
  phone: string;
  whatsapp?: string;
  email?: string;
  delivery_address: string;
  product_name: string;
  jewellery_id?: string;
  item_price: string;
  shipping_fee: string;
  total_amount: string;
  payment_method: string;
  upi_transaction_id: string;
  payment_status: string;
  order_status: string;
  notes?: string;
  tracking_courier?: string;
  tracking_number?: string;
  tracking_url?: string;
}

export const JEWELLERY_CUSTOMERS_TABLE_SQL = `-- Run this SQL in your Supabase SQL Editor to create the jewellery_customers table:

CREATE TABLE IF NOT EXISTS public.jewellery_customers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    order_ref VARCHAR(100) NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    whatsapp VARCHAR(50),
    email VARCHAR(255),
    delivery_address TEXT NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    jewellery_id VARCHAR(100),
    item_price VARCHAR(50) NOT NULL DEFAULT '₹2,500',
    shipping_fee VARCHAR(50) NOT NULL DEFAULT '₹60',
    total_amount VARCHAR(50) NOT NULL DEFAULT '₹2,560',
    payment_method VARCHAR(100) DEFAULT 'Google Pay / UPI',
    upi_transaction_id VARCHAR(100) NOT NULL,
    payment_status VARCHAR(50) DEFAULT 'Paid',
    order_status VARCHAR(50) DEFAULT 'Processing',
    notes TEXT,
    tracking_courier TEXT,
    tracking_number TEXT,
    tracking_url TEXT
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.jewellery_customers ENABLE ROW LEVEL SECURITY;

-- Allow anonymous & authenticated users to insert & select jewellery customers
CREATE POLICY "Allow public insert and select on jewellery_customers"
ON public.jewellery_customers
FOR ALL
USING (true)
WITH CHECK (true);
`;

export const PAYMENTS_TABLE_SQL = `-- Run this SQL in your Supabase SQL Editor to create the payments audit table for Razorpay:

CREATE TABLE IF NOT EXISTS public.payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    booking_ref VARCHAR(100) NOT NULL,
    order_type VARCHAR(50) DEFAULT 'henna',
    razorpay_order_id VARCHAR(100) UNIQUE,
    razorpay_payment_id VARCHAR(100),
    razorpay_signature TEXT,
    amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(10) DEFAULT 'INR',
    customer_name VARCHAR(255),
    customer_email VARCHAR(255),
    customer_phone VARCHAR(50),
    payment_method VARCHAR(100) DEFAULT 'Razorpay (UPI / Cards / NetBanking)',
    payment_status VARCHAR(50) DEFAULT 'PENDING_PAYMENT',
    notes TEXT
);

-- Index for instant lookup by booking_ref or razorpay_order_id
CREATE INDEX IF NOT EXISTS idx_payments_booking_ref ON public.payments(booking_ref);
CREATE INDEX IF NOT EXISTS idx_payments_razorpay_order ON public.payments(razorpay_order_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Allow public select & insert (restricted updates to secure service/Edge Functions)
CREATE POLICY "Allow public read and insert on payments"
ON public.payments
FOR ALL
USING (true)
WITH CHECK (true);
`;

export interface DBPaymentRow {
  id?: string;
  created_at?: string;
  updated_at?: string;
  booking_ref: string;
  order_type?: string;
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
  amount: number;
  currency?: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  payment_method?: string;
  payment_status: string;
  notes?: string;
}

export interface DBBookingRow {
  id?: string;
  ref: string;
  name: string;
  email?: string;
  phone?: string;
  wa?: string;
  service: string;
  occasion?: string;
  notes?: string;
  date: string;
  slot: string;
  status: string;
  created_at?: string;
}

export interface DBDisabledSlotRow {
  id?: string;
  date: string;
  slot: string;
  status?: string;
}

export interface DBMessageRow {
  id?: number;
  from_number: string;
  contact_name?: string;
  message_text: string;
  timestamp?: string;
  direction?: string;
  read?: boolean;
  created_at?: string;
}

export interface DBJewelleryRow {
  id?: string;
  name: string;
  category?: string;
  type?: string;
  price?: string;
  amount?: number | string;
  rental_price_day?: string;
  stock?: number;
  stock_count?: number;
  stock_label?: string;
  image?: string;
  images?: string | string[];
  description?: string;
  material?: string;
  weight?: string;
  inclusion?: string;
  created_at?: string;
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseCredentials().isConfigured;
}

export interface SupabaseDiagnosticResult {
  isConfigured: boolean;
  url: string;
  isCustom: boolean;
  reachable: boolean;
  jewelleryTableExists: boolean;
  jewelleryRowCount: number;
  jewelleryError?: string;
  bookingsTableExists: boolean;
  bookingsRowCount: number;
  bookingsError?: string;
  authWorking: boolean;
  authError?: string;
  suggestion?: string;
}

/**
 * Diagnostic tool to test connection to Supabase and query tables
 */
export async function testSupabaseConnection(): Promise<SupabaseDiagnosticResult> {
  const creds = getSupabaseCredentials();
  const result: SupabaseDiagnosticResult = {
    isConfigured: creds.isConfigured,
    url: creds.url,
    isCustom: false,
    reachable: false,
    jewelleryTableExists: false,
    jewelleryRowCount: 0,
    bookingsTableExists: false,
    bookingsRowCount: 0,
    authWorking: false,
  };

  if (!creds.isConfigured) {
    result.suggestion = 'Supabase Project URL and Anon API Key are not configured.';
    return result;
  }

  // 1. Test query on jewellery table
  try {
    const { data: jewelData, error: jewelErr } = await supabase
      .from('jewellery')
      .select('id, name')
      .limit(50);

    if (!jewelErr) {
      result.reachable = true;
      result.jewelleryTableExists = true;
      result.jewelleryRowCount = Array.isArray(jewelData) ? jewelData.length : 0;
    } else {
      result.jewelleryError = jewelErr.message;
      if (!jewelErr.message.toLowerCase().includes('network') && !jewelErr.message.toLowerCase().includes('fetch')) {
        result.reachable = true; // Connected to server, but table/permission issue
      }
    }
  } catch (err: any) {
    result.jewelleryError = err?.message || 'Network fetch failed';
  }

  // 2. Test query on bookings table
  try {
    const { data: bData, error: bErr } = await supabase
      .from('bookings')
      .select('id')
      .limit(10);

    if (!bErr) {
      result.reachable = true;
      result.bookingsTableExists = true;
      result.bookingsRowCount = Array.isArray(bData) ? bData.length : 0;
    } else {
      result.bookingsError = bErr.message;
      if (!bErr.message.toLowerCase().includes('network') && !bErr.message.toLowerCase().includes('fetch')) {
        result.reachable = true;
      }
    }
  } catch (err: any) {
    result.bookingsError = err?.message || 'Network fetch failed';
  }

  if (!result.reachable) {
    result.suggestion = `Network error connecting to ${creds.url}. Please verify that the project URL is active in Supabase and your internet connection is active.`;
  } else if (!result.jewelleryTableExists) {
    result.suggestion = 'The "jewellery" table was not found or has Row Level Security (RLS) enabled without a SELECT policy. Run the Table SQL script in Supabase SQL Editor.';
  } else if (result.jewelleryRowCount === 0) {
    result.suggestion = 'The "jewellery" table exists but returned 0 rows. If you have rows in Supabase, ensure RLS SELECT policy is created: CREATE POLICY "Allow public select on jewellery" ON public.jewellery FOR SELECT USING (true);';
  } else {
    result.suggestion = `Successfully connected! Found ${result.jewelleryRowCount} items in the "jewellery" table.`;
  }

  return result;
}

/**
 * The `bookings.notes` column historically stores
 * `${location}. ${specialRequests}` in a single blob (specialRequests itself
 * contains Occasion/Duration and the [Payment Info] block), so reading the
 * whole column as the address shows payment/occasion text in "Address".
 * Extract just the location part. New rows use a `Location: … | …` format.
 */
export function parseBookingNotes(notes?: string | null): { location: string; requests: string } {
  const FALLBACK_LOCATION = 'Studio / Client Venue';
  const raw = String(notes || '').trim();
  if (!raw) return { location: FALLBACK_LOCATION, requests: '' };

  // New structured format: "Location: <addr> | <requests>"
  if (/^Location:/i.test(raw)) {
    const rest = raw.replace(/^Location:\s*/i, '');
    const sep = rest.indexOf(' | ');
    if (sep >= 0) {
      return { location: rest.slice(0, sep).trim() || FALLBACK_LOCATION, requests: rest.slice(sep + 3).trim() };
    }
    return { location: rest.trim() || FALLBACK_LOCATION, requests: '' };
  }

  // Legacy format: "<location>. <occasion/duration/payment info>"
  const dotSep = raw.indexOf('. ');
  if (dotSep > 0) {
    const location = raw.slice(0, dotSep).trim().replace(/\.$/, '');
    const requests = raw.slice(dotSep + 2).trim();
    if (location) return { location, requests };
  }

  return { location: raw.replace(/\.$/, '').trim() || FALLBACK_LOCATION, requests: '' };
}

/**
 * Fetch all bookings from Supabase 'bookings' table
 */
/** Jewellery orders carry JW-/BAG- refs (Mehendi uses SC-) — the bookings table has no type column. */
const isJewelleryOrderRef = (ref?: string | null): boolean => {
  const r = String(ref || '').toUpperCase();
  return r.startsWith('JW-') || r.startsWith('BAG-');
};

export async function fetchSupabaseBookings(): Promise<HennaBooking[] | null> {
  if (!isSupabaseConfigured()) return null;

  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Supabase fetch bookings error:', error.message);
      return null;
    }

    if (!data) return [];

    // Merge payment info (status + amount actually paid) so Advance Paid vs
    // Paid is correct on first load, not only after a phone search.
    const paymentInfoMap = await fetchPaymentInfoByRefs(data.map((r: any) => r.ref));

    return data.map((row: DBBookingRow) => {
      const parsed = parseBookingNotes(row.notes);
      const payInfo = paymentInfoMap.get((row.ref || '').toUpperCase());
      return {
        id: row.id || `hb-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        ref: row.ref || `HB-${Math.floor(100 + Math.random() * 900)}`,
        serviceName: row.service || 'Bridal Henna Artistry',
        date: row.date || '2026-08-08',
        timeSlot: row.slot || '10:00 AM',
        location: parsed.location,
        clientName: row.name || 'Client',
        clientEmail: row.email || 'client@example.com',
        phone: row.phone || '',
        wa: row.wa || '',
        specialRequests: parsed.requests,
        artist: row.occasion ? `Specialist (${row.occasion})` : 'Senior Specialist',
        status: (row.status as any) || 'Confirmed',
        type: isJewelleryOrderRef(row.ref) || row.service?.toLowerCase().includes('jewel') ? 'jewellery' : 'henna',
        paymentStatus: isAdvancePaymentText(parsed.requests) ? 'Advance Paid' : payInfo?.status || undefined,
        paymentAmount: payInfo?.amount || extractPaidAmountFromRequests(parsed.requests) || undefined,
        totalPrice: extractServicePrice(row.service) || payInfo?.amount || undefined,
        paymentMethod: payInfo?.method || undefined,
        transactionId: payInfo?.paymentId || undefined,
      };
    });
  } catch (err) {
    console.warn('Supabase bookings query failed:', err);
    return null;
  }
}

/**
 * Insert a new booking into Supabase 'bookings' table
 */
export async function insertSupabaseBooking(
  booking: HennaBooking,
  extra?: { phone?: string; wa?: string; occasion?: string }
): Promise<{ success: boolean; error?: string; isConfigured: boolean }> {
  if (!isSupabaseConfigured()) {
    console.info('Supabase environment variables (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY) are not set. Saving locally in browser.');
    return { success: false, isConfigured: false, error: 'Supabase URL & Anon Key environment variables not configured in settings.' };
  }

  try {
    const payload: DBBookingRow = {
      ref: booking.ref,
      name: booking.clientName,
      email: booking.clientEmail || '',
      phone: booking.phone || extra?.phone || '',
      wa: booking.wa || extra?.wa || '',
      service: booking.serviceName,
      occasion: extra?.occasion || 'Bridal Ceremony',
      // Structured so the address can be read back cleanly — see
      // parseBookingNotes(). The old `${location}. ${requests}` blob leaked
      // occasion/payment text into the Address field.
      notes: booking.specialRequests
        ? `Location: ${booking.location || ''} | ${booking.specialRequests}`
        : `Location: ${booking.location || ''}`,
      date: booking.date,
      slot: booking.timeSlot || '10:00 AM',
      status: booking.status || 'Confirmed',
    };

    const { error } = await supabase.from('bookings').insert([payload]);

    if (error) {
      console.error('Supabase insert booking error:', error.message, error.details, error.hint);
      return { success: false, isConfigured: true, error: error.message };
    }

    console.log('Successfully saved booking to Supabase table "bookings":', booking.ref);
    return { success: true, isConfigured: true };
  } catch (err: any) {
    console.error('Failed to insert booking to Supabase:', err);
    return { success: false, isConfigured: true, error: err?.message || 'Network error connecting to Supabase.' };
  }
}

export interface RescheduleResult {
  success: boolean;
  isConfigured: boolean;
  /** 'not-configured' | 'not-found' | 'error' — lets the UI fall back to a
   *  device-local reschedule instead of showing a generic failure for
   *  bookings that only exist in localStorage. */
  reason?: 'not-configured' | 'not-found' | 'error';
  error?: string;
}

const isUuidValue = (v: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

export async function rescheduleSupabaseBooking(
  refOrId: string,
  newDate: string,
  newSlot: string,
  rescheduleNotes?: string
): Promise<RescheduleResult> {
  if (!refOrId?.trim() || !newDate?.trim() || !newSlot?.trim()) {
    return { success: false, isConfigured: isSupabaseConfigured(), reason: 'error', error: 'Booking reference, date and time slot are required.' };
  }
  if (!isSupabaseConfigured()) {
    return { success: false, isConfigured: false, reason: 'not-configured', error: 'Supabase is not configured.' };
  }

  try {
    // 1. Find the row first (prefer `ref`; only query `id` when it is a real
    //    UUID — PostgREST errors out on `id.eq.<non-uuid>` for uuid columns,
    //    which made every local `hb-…` / `bag-order-…` id fail silently).
    let existing: DBBookingRow | null = null;
    const byRef = await supabase.from('bookings').select('*').eq('ref', refOrId.trim()).maybeSingle();
    if (byRef.error) {
      console.error('Supabase reschedule lookup error:', byRef.error.message);
      return { success: false, isConfigured: true, reason: 'error', error: byRef.error.message };
    }
    existing = (byRef.data as DBBookingRow | null) || null;

    if (!existing && isUuidValue(refOrId.trim())) {
      const byId = await supabase.from('bookings').select('*').eq('id', refOrId.trim()).maybeSingle();
      if (byId.error) {
        console.error('Supabase reschedule lookup error:', byId.error.message);
        return { success: false, isConfigured: true, reason: 'error', error: byId.error.message };
      }
      existing = (byId.data as DBBookingRow | null) || null;
    }

    if (!existing) {
      return { success: false, isConfigured: true, reason: 'not-found', error: `No booking found in the database for "${refOrId}". It may only exist on this device.` };
    }

    // 2. Preserve the original notes (insert stores `location. specialRequests`
    //    in `notes`). Previously the reschedule reason overwrote them entirely.
    const updatePayload: Partial<DBBookingRow> = {
      date: newDate,
      slot: newSlot,
      status: 'Rescheduled',
    };
    if (rescheduleNotes?.trim()) {
      updatePayload.notes = existing.notes
        ? `${existing.notes} | Rescheduled: ${rescheduleNotes.trim()}`
        : `Rescheduled: ${rescheduleNotes.trim()}`;
    }

    const { error } = await supabase
      .from('bookings')
      .update(updatePayload)
      .eq('id', existing.id as string);

    if (error) {
      console.error('Supabase reschedule error:', error.message);
      return { success: false, isConfigured: true, reason: 'error', error: error.message };
    }

    return { success: true, isConfigured: true };
  } catch (err: any) {
    console.error('Failed to reschedule in Supabase:', err);
    return { success: false, isConfigured: true, reason: 'error', error: err?.message || 'Network error connecting to Supabase.' };
  }
}

/**
 * Reschedule a jewellery rental/booking: shift its start date (and end date
 * by the same number of days, preserving the rental duration).
 */
export async function rescheduleSupabaseJewelleryBooking(
  refOrId: string,
  newStartDate: string,
  rescheduleNotes?: string
): Promise<RescheduleResult> {
  if (!refOrId?.trim() || !newStartDate?.trim()) {
    return { success: false, isConfigured: isSupabaseConfigured(), reason: 'error', error: 'Booking reference and new date are required.' };
  }
  if (!isSupabaseConfigured()) {
    return { success: false, isConfigured: false, reason: 'not-configured', error: 'Supabase is not configured.' };
  }

  try {
    const byRef = await supabase.from('jewellery_bookings').select('*').eq('booking_ref', refOrId.trim()).maybeSingle();
    if (byRef.error) {
      console.error('Supabase jewellery reschedule lookup error:', byRef.error.message);
      return { success: false, isConfigured: true, reason: 'error', error: byRef.error.message };
    }
    let existing = (byRef.data as DBJewelleryBookingRow | null) || null;

    if (!existing && isUuidValue(refOrId.trim())) {
      const byId = await supabase.from('jewellery_bookings').select('*').eq('id', refOrId.trim()).maybeSingle();
      if (byId.error) {
        console.error('Supabase jewellery reschedule lookup error:', byId.error.message);
        return { success: false, isConfigured: true, reason: 'error', error: byId.error.message };
      }
      existing = (byId.data as DBJewelleryBookingRow | null) || null;
    }

    if (!existing) {
      return { success: false, isConfigured: true, reason: 'not-found', error: `No jewellery booking found in the database for "${refOrId}". It may only exist on this device.` };
    }

    // Shift end date by the same delta so the rental duration is preserved.
    let newEndDate = existing.end_date || existing.start_date || '';
    if (existing.start_date && existing.end_date && newEndDate) {
      const oldStart = new Date(existing.start_date).getTime();
      const oldEnd = new Date(existing.end_date).getTime();
      const deltaDays = Math.round((new Date(newStartDate).getTime() - oldStart) / 86400000);
      if (!Number.isNaN(deltaDays)) {
        newEndDate = new Date(oldEnd + deltaDays * 86400000).toISOString().split('T')[0];
      }
    } else if (!existing.end_date) {
      newEndDate = newStartDate;
    }

    const updatePayload: Partial<DBJewelleryBookingRow> = {
      start_date: newStartDate,
      end_date: newEndDate,
    };
    if (rescheduleNotes?.trim()) {
      updatePayload.notes = existing.notes
        ? `${existing.notes} | Rescheduled: ${rescheduleNotes.trim()}`
        : `Rescheduled: ${rescheduleNotes.trim()}`;
    }

    const { error } = await supabase
      .from('jewellery_bookings')
      .update(updatePayload)
      .eq('id', existing.id as string);

    if (error) {
      console.error('Supabase jewellery reschedule error:', error.message);
      return { success: false, isConfigured: true, reason: 'error', error: error.message };
    }

    return { success: true, isConfigured: true };
  } catch (err: any) {
    console.error('Failed to reschedule jewellery booking in Supabase:', err);
    return { success: false, isConfigured: true, reason: 'error', error: err?.message || 'Network error connecting to Supabase.' };
  }
}

/**
 * Fetch a specific booking by ref code or phone number
 */
export async function fetchBookingByRefOrPhone(searchQuery: string): Promise<HennaBooking[] | null> {
  if (!isSupabaseConfigured()) return null;

  try {
    const trimmed = searchQuery.trim();
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .or(`ref.ilike.%${trimmed}%,phone.ilike.%${trimmed}%,wa.ilike.%${trimmed}%`);

    if (error || !data) return null;

    return data.map((row: DBBookingRow) => {
      const parsed = parseBookingNotes(row.notes);
      return {
        id: row.id || `hb-${Date.now()}`,
        ref: row.ref || `SC-${Math.floor(100 + Math.random() * 900)}`,
        serviceName: row.service || 'Service Appointment',
        date: row.date || '',
        timeSlot: row.slot || '',
        location: parsed.location,
        clientName: row.name || 'Client',
        clientEmail: row.email || '',
        phone: row.phone || '',
        wa: row.wa || '',
        specialRequests: parsed.requests,
        status: (row.status as any) || 'Confirmed',
        type: (row.service?.toLowerCase().includes('jewel') ? 'jewellery' : 'henna') as 'henna' | 'jewellery',
        totalPrice: extractServicePrice(row.service) || undefined,
      };
    });
  } catch (err) {
    console.error('Fetch booking by ref/phone failed:', err);
    return null;
  }
}

/**
 * Update booking status in Supabase
 */
export async function updateSupabaseBookingStatus(refOrId: string, status: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  try {
    const { error } = await supabase
      .from('bookings')
      .update({ status })
      .or(`ref.eq.${refOrId},id.eq.${refOrId}`);

    if (error) {
      console.error('Supabase update status error:', error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Failed to update status in Supabase:', err);
    return false;
  }
}

/**
 * Delete booking from Supabase
 */
export async function deleteSupabaseBooking(refOrId: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  try {
    const { error } = await supabase
      .from('bookings')
      .delete()
      .or(`ref.eq.${refOrId},id.eq.${refOrId}`);

    if (error) {
      console.error('Supabase delete error:', error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Failed to delete booking in Supabase:', err);
    return false;
  }
}

/**
 * Availability / Disabled slots API using bookings_availability table
 *
 * Slots can live in either `bookings_availability` (current table) or the
 * legacy `disabled_slots` table: writes fall back to the legacy table when
 * the primary insert is rejected (e.g. a missing RLS policy for the anon
 * role). Reads must therefore union BOTH sources, otherwise admin-disabled
 * slots silently disappear from booking + availability checks.
 */
export async function fetchSupabaseDisabledSlots(): Promise<DBDisabledSlotRow[]> {
  if (!isSupabaseConfigured()) return [];

  const rows: DBDisabledSlotRow[] = [];

  try {
    const { data, error } = await supabase.from('bookings_availability').select('*');
    if (!error && data) {
      rows.push(...data);
    }
  } catch (err) {
    console.warn('[Supabase] bookings_availability read failed:', err);
  }

  try {
    const { data, error } = await supabase.from('disabled_slots').select('*');
    if (!error && data) {
      rows.push(...data);
    }
  } catch {
    // Legacy table may not exist on fresh installs — optional source.
  }

  const seen = new Set<string>();
  return rows.filter((r) => {
    if (!r?.date || !r?.slot) return false;
    const key = `${r.date}|${r.slot}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function addSupabaseDisabledSlot(date: string, slot: string, status: string = 'disabled'): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  try {
    const { error } = await supabase.from('bookings_availability').insert([{ date, slot, status }]);
    if (error) {
      const fallback = await supabase.from('disabled_slots').insert([{ date, slot }]);
      return !fallback.error;
    }
    return true;
  } catch {
    return false;
  }
}

export async function deleteSupabaseDisabledSlot(date: string, slot: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  let ok = false;

  // Delete from BOTH tables — a slot may live in either one depending on
  // which path created it. Deleting only the primary table leaves legacy
  // rows behind, so the slot reappears after reload.
  try {
    const { error } = await supabase
      .from('bookings_availability')
      .delete()
      .eq('date', date)
      .eq('slot', slot);
    if (!error) ok = true;
  } catch {
    /* primary unavailable — legacy delete below may still succeed */
  }

  try {
    const { error } = await supabase
      .from('disabled_slots')
      .delete()
      .eq('date', date)
      .eq('slot', slot);
    if (!error) ok = true;
  } catch {
    /* legacy table may not exist */
  }

  return ok;
}

/**
 * Messages API
 */
export async function fetchSupabaseMessages(): Promise<DBMessageRow[]> {
  if (!isSupabaseConfigured()) return [];

  try {
    const { data, error } = await supabase.from('messages').select('*').order('created_at', { ascending: false });
    if (error || !data) return [];
    return data;
  } catch {
    return [];
  }
}

export async function sendSupabaseMessage(msg: Omit<DBMessageRow, 'id' | 'created_at'>): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  try {
    const { error } = await supabase.from('messages').insert([msg]);
    return !error;
  } catch {
    return false;
  }
}

/**
 * Fetch Jewellery details from Supabase across tables ('jewellery', 'jewellery_items', 'jewellery_products', 'products', 'jewellery_inventory', 'jewels', 'items')
 * Retrieves image, amount/price, rental rates, stock counts, names, categories, and full product details.
 */
export async function fetchSupabaseJewellery(): Promise<any[] | null> {
  const creds = getSupabaseCredentials();
  if (!creds.isConfigured) {
    console.info('Supabase URL & Anon Key not configured. No jewellery data will be displayed.');
    return [];
  }

  try {
    const candidateTables = ['jewellery'];

    let combinedRows: any[] = [];
    const seenIds = new Set<string>();

    for (const table of candidateTables) {
      try {
        // Query rows from table directly
        const { data, error } = await supabase
          .from(table)
          .select('*');

        if (error) {
          console.warn(`[Supabase] Table "${table}" fetch notice:`, error.message);
          continue;
        }

        if (Array.isArray(data) && data.length > 0) {
          console.log(`[Supabase] Successfully fetched ${data.length} items from table "${table}"`);
          for (const item of data) {
            const uniqueKey = String(item.id || item.name || item.title || item.product_name || Math.random());
            if (!seenIds.has(uniqueKey)) {
              seenIds.add(uniqueKey);
              combinedRows.push(item);
            }
          }
        }
      } catch (tableErr: any) {
        console.warn(`[Supabase] Table query exception for "${table}":`, tableErr?.message);
      }
    }

    if (combinedRows.length === 0) {
      console.info('[Supabase] 0 jewellery rows returned. If rows exist in Supabase, ensure RLS SELECT policy is enabled (CREATE POLICY "Allow public select" ON jewellery FOR SELECT USING (true);)');
      return []; // Return empty array instead of null for consistency
    }

    // Sort by created_at if available
    combinedRows.sort((a, b) => {
      if (a.created_at && b.created_at) {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      return 0;
    });

    const parsedProducts = combinedRows.map((row: any, index: number) => {
      // 1. Resolve Name
      const resolvedName =
        row.name ||
        row.title ||
        row.product_name ||
        row.item_name ||
        row.jewellery_name ||
        'Handcrafted Heritage Jewellery';

      // 2. Resolve Category & Type
      let resolvedCategory: 'Bridal' | 'Minimal' | 'Hair' | 'Royal' = 'Bridal';
      const rawCategory = String(row.category || row.type || row.collection || row.tag || '').toLowerCase();
      if (rawCategory.includes('min') || rawCategory.includes('earring') || rawCategory.includes('jhumka')) {
        resolvedCategory = 'Minimal';
      } else if (rawCategory.includes('hair') || rawCategory.includes('guttapusalu') || rawCategory.includes('patti')) {
        resolvedCategory = 'Hair';
      } else if (rawCategory.includes('royal') || rawCategory.includes('polki') || rawCategory.includes('choker')) {
        resolvedCategory = 'Royal';
      } else {
        resolvedCategory = 'Bridal';
      }

      let resolvedType: 'Rental' | 'Sale' = 'Rental';
      const rawType = String(row.type || row.booking_type || '').toLowerCase();
      if (rawType.includes('sale') || rawType.includes('buy') || row.is_sale) {
        resolvedType = 'Sale';
      } else {
        resolvedType = 'Rental';
      }

      // 3. Resolve Images
      let imageList: string[] = [];
      const rawImages = row.images || row.photos || row.image_urls;
      const singleImage = row.image || row.photo || row.image_url || row.img || row.thumbnail || row.pic_url || row.url;

      if (Array.isArray(rawImages) && rawImages.length > 0) {
        imageList = rawImages.filter((img) => typeof img === 'string' && img.trim().length > 0);
      } else if (typeof rawImages === 'string' && rawImages.trim()) {
        try {
          const parsed = JSON.parse(rawImages);
          if (Array.isArray(parsed) && parsed.length > 0) {
            imageList = parsed;
          } else {
            imageList = [rawImages];
          }
        } catch {
          if (rawImages.includes(',')) {
            imageList = rawImages.split(',').map((s) => s.trim()).filter(Boolean);
          } else {
            imageList = [rawImages];
          }
        }
      }

      if (imageList.length === 0 && singleImage && typeof singleImage === 'string' && singleImage.trim()) {
        imageList = [singleImage.trim()];
      }

      if (imageList.length === 0) {
        // High quality bridal jewellery fallback image
        imageList = [
          'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&q=80&w=800'
        ];
      }

      // 4. Resolve Price / Purchase Amount
      let priceStr = row.price;
      const numericAmount = row.amount ?? row.cost ?? row.sale_price ?? row.selling_price ?? row.rate;
      if (!priceStr && numericAmount !== undefined && numericAmount !== null) {
        const num = typeof numericAmount === 'number' ? numericAmount : parseInt(String(numericAmount).replace(/[^0-9]/g, ''), 10);
        priceStr = isNaN(num) ? '₹15,000' : `₹${num.toLocaleString('en-IN')}`;
      }
      if (!priceStr || !priceStr.includes('₹')) {
        const cleanDigits = String(priceStr || '').replace(/[^0-9]/g, '');
        priceStr = cleanDigits ? `₹${parseInt(cleanDigits, 10).toLocaleString('en-IN')}` : '₹18,000';
      }

      // 5. Resolve Rental Price
      let rentalPriceDay =
        row.rental_price_day ||
        row.rental_rate ||
        row.rental_price ||
        row.rent_per_day ||
        row.daily_rate;

      if (!rentalPriceDay) {
        rentalPriceDay = '₹1,500/day';
      } else if (!rentalPriceDay.includes('/day') && !rentalPriceDay.includes('day')) {
        rentalPriceDay = `${rentalPriceDay}/day`;
      }

      // 6. Resolve Stock
      const stockNum =
        row.stock !== undefined && row.stock !== null
          ? Number(row.stock)
          : (row.stock_count !== undefined && row.stock_count !== null
              ? Number(row.stock_count)
              : (row.quantity !== undefined && row.quantity !== null
                  ? Number(row.quantity)
                  : (row.qty !== undefined ? Number(row.qty) : (row.available_stock !== undefined ? Number(row.available_stock) : 4))));

      const safeStock = isNaN(stockNum) || stockNum < 0 ? 0 : stockNum;
      const stockLabel =
        row.stock_label ||
        (safeStock === 0 ? 'Out of Stock' : (safeStock === 1 ? '1 Unit Available' : `${safeStock} Available`));

      // 7. Resolve Product Details
      const description =
        row.description ||
        row.details ||
        row.desc ||
        row.summary ||
        'Exquisite traditional handcrafted piece curated for grand occasions, weddings, and celebrations.';

      const material =
        row.material ||
        row.metal ||
        row.finish ||
        '22k Gold Plated, Kundan & Hand-strung Pearls';

      const weight = row.weight || row.gram_weight || row.net_weight || '180 grams';
      const inclusion = row.inclusion || row.inclusions || row.package_contents || 'Complete Jewellery Set with velvet box';

      return {
        id: String(row.id || `supa-jewel-${index}-${Date.now()}`),
        name: resolvedName,
        category: resolvedCategory,
        type: resolvedType,
        price: priceStr,
        rentalPriceDay,
        stock: safeStock,
        stockLabel,
        images: imageList,
        description,
        material,
        weight,
        inclusion,
      };
    });

    return parsedProducts;
  } catch (err) {
    console.warn('Supabase fetch jewellery unexpected error:', err);
    return [];
  }
}

/**
 * Insert or update a jewellery item into Supabase 'jewellery' or 'products' table
 */
export async function insertSupabaseJewellery(item: DBJewelleryRow): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  const numericAmount = typeof item.price === 'string'
    ? parseInt(item.price.replace(/[^0-9]/g, '')) || 15000
    : (typeof item.amount === 'number' ? item.amount : 15000);

  const mainImageUrl = Array.isArray(item.images) && item.images.length > 0
    ? item.images[0]
    : (typeof item.image === 'string' ? item.image : '');

  // Build clean row payload
  const rowPayload: Record<string, any> = {
    name: item.name,
    category: item.category || 'Bridal',
    type: item.type || 'Sale',
    price: item.price || `₹${numericAmount.toLocaleString('en-IN')}`,
    amount: numericAmount,
    rental_price_day: item.rental_price_day || '₹1,500/day',
    stock: item.stock ?? 5,
    stock_count: item.stock ?? 5,
    stock_label: item.stock_label || `${item.stock ?? 5} Available`,
    image: mainImageUrl,
    images: item.images,
    description: item.description || '',
    material: item.material || '',
    weight: item.weight || '',
    inclusion: item.inclusion || '',
  };

  // Only pass id if it is a valid UUID or integer, to prevent postgres type mismatch errors
  const isUuid = item.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(item.id));
  const isIntId = item.id && /^\d+$/.test(String(item.id));
  if (isUuid || isIntId) {
    rowPayload.id = item.id;
  }

  try {
    // 1. Try 'jewellery' table first
    let res = await supabase.from('jewellery').upsert([rowPayload]);
    if (res.error) {
      console.warn('Upsert to jewellery table warning, trying insert without id:', res.error.message);
      const { id, ...noIdPayload } = rowPayload;
      res = await supabase.from('jewellery').insert([noIdPayload]);
    }

    if (!res.error) return true;

    // 2. Try 'products' table fallback
    console.warn('Jewellery table insert failed, falling back to products table:', res.error?.message);
    let prodRes = await supabase.from('products').upsert([rowPayload]);
    if (prodRes.error) {
      const { id, ...noIdPayload } = rowPayload;
      prodRes = await supabase.from('products').insert([noIdPayload]);
    }

    if (!prodRes.error) return true;

    console.error('Failed to insert into both jewellery and products tables:', prodRes.error?.message);
    return false;
  } catch (err) {
    console.error('Supabase insert jewellery exception:', err);
    return false;
  }
}

/**
 * Delete jewellery item from Supabase 'jewellery' or 'products' table
 */
export async function deleteSupabaseJewellery(id: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  try {
    const { error: err1 } = await supabase.from('jewellery').delete().eq('id', id);
    if (err1) {
      await supabase.from('products').delete().eq('id', id);
    }
    return true;
  } catch (err) {
    console.error('Supabase delete jewellery error:', err);
    return false;
  }
}

/**
 * Admin Login strictly via Supabase Auth with network resilience
 */
export async function loginSupabaseAdmin(
  email: string,
  password: string
): Promise<{ success: boolean; user?: any; error?: string; isOffline?: boolean; isEmergency?: boolean }> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanPass = password.trim();

  if (!cleanEmail || !cleanPass) {
    return { success: false, error: 'Please enter both email and password.' };
  }

  const creds = getSupabaseCredentials();

  // Known admin/studio emails for emergency fallback when network/DNS fails
  const isMasterAdminEmail =
    cleanEmail === 'sujishyamala0517@gmail.com' ||
    cleanEmail === 'shyamcreationstudio@gmail.com' ||
    cleanEmail === 'admin@shyamcreations.com';

  if (creds.isConfigured) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPass,
      });

      if (!error && data?.user) {
        // Verify the user is an admin via app_metadata role
        const userRole = (data.user as any)?.app_metadata?.role;
        const isAdminByRole = userRole === 'admin' || userRole === 'super_admin' || userRole === 'service_role';
        const isAdminByEmail = isMasterAdminEmail;

        if (isAdminByRole || isAdminByEmail) {
          return { success: true, user: data.user };
        }

        // Not an admin - sign out and return error
        await supabase.auth.signOut();
        return { 
          success: false, 
          error: `Access denied. User "${cleanEmail}" does not have admin privileges in Supabase (app_metadata.role = "${userRole || 'none'}"). Please set role to "admin" in Supabase Auth → Users → ${cleanEmail} → Edit → App Metadata.` 
        };
      }

      if (error) {
        console.warn('Supabase Auth error:', error.message);
        return { success: false, error: error.message || 'Invalid email or password.' };
      }
    } catch (err: any) {
      console.warn('Supabase auth network exception:', err);
      return {
        success: false,
        error: `Could not reach Supabase (${creds.url}). Check your network connection and try again.`
      };
    }
  }

  return { success: false, error: 'Admin portal requires the Supabase backend to be configured and reachable.' };
}

/**
 * Fetch all jewellery customer details and orders from Supabase 'jewellery_customers' table
 */
export async function fetchSupabaseJewelleryCustomers(): Promise<JewelleryCustomer[] | null> {
  if (!isSupabaseConfigured()) return null;

  try {
    const { data, error } = await supabase
      .from('jewellery_customers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Supabase fetch jewellery customers error:', error.message);
      return null;
    }

    if (!data) return [];

    return data.map((row: DBJewelleryCustomerRow) => ({
      id: row.id,
      created_at: row.created_at,
      orderRef: row.order_ref,
      customerName: row.customer_name,
      phone: row.phone,
      whatsapp: row.whatsapp || row.phone,
      email: row.email || '',
      deliveryAddress: row.delivery_address,
      productName: row.product_name,
      jewelleryId: row.jewellery_id || '',
      itemPrice: row.item_price,
      shippingFee: row.shipping_fee,
      totalAmount: row.total_amount,
      paymentMethod: row.payment_method,
      upiTransactionId: row.upi_transaction_id,
      paymentStatus: (row.payment_status as any) || 'Paid',
      orderStatus: (row.order_status as any) || 'Processing',
      notes: row.notes || '',
      trackingCourier: row.tracking_courier || undefined,
      trackingNumber: row.tracking_number || undefined,
      trackingUrl: row.tracking_url || undefined,
    }));
  } catch (err) {
    console.warn('Supabase jewellery_customers query failed:', err);
    return null;
  }
}

/**
 * Insert new customer details & order into Supabase 'jewellery_customers' table
 */
export async function insertSupabaseJewelleryCustomer(
  customer: Omit<JewelleryCustomer, 'id' | 'created_at'>
): Promise<{ success: boolean; error?: string; isConfigured: boolean }> {
  if (!isSupabaseConfigured()) {
    console.info('Supabase is not configured. Customer details saved in local session.');
    return { success: false, isConfigured: false, error: 'Supabase URL/Key environment variables not set.' };
  }

  try {
    const payload: DBJewelleryCustomerRow = {
      order_ref: customer.orderRef,
      customer_name: customer.customerName,
      phone: customer.phone,
      whatsapp: customer.whatsapp || customer.phone,
      email: customer.email || '',
      delivery_address: customer.deliveryAddress,
      product_name: customer.productName,
      jewellery_id: customer.jewelleryId || '',
      item_price: customer.itemPrice,
      shipping_fee: customer.shippingFee,
      total_amount: customer.totalAmount,
      payment_method: customer.paymentMethod || 'Google Pay / UPI',
      upi_transaction_id: customer.upiTransactionId,
      payment_status: customer.paymentStatus || 'Paid',
      order_status: customer.orderStatus || 'Processing',
      notes: customer.notes || '',
      tracking_courier: customer.trackingCourier || null,
      tracking_number: customer.trackingNumber || null,
      tracking_url: customer.trackingUrl || null,
    };

    // Update-if-exists by order_ref — the payment verification function may
    // auto-register a minimal row on payment; this fills in the full details
    // (and avoids duplicate rows for the same ref).
    const { data: existingCustomer, error: lookupError } = await supabase
      .from('jewellery_customers')
      .select('id')
      .eq('order_ref', customer.orderRef)
      .maybeSingle();

    let error: any = lookupError || null;
    if (!error) {
      if (existingCustomer?.id) {
        const { error: updateError } = await supabase
          .from('jewellery_customers')
          .update(payload)
          .eq('id', existingCustomer.id);
        error = updateError || null;
      } else {
        const { error: insertError } = await supabase.from('jewellery_customers').insert([payload]);
        error = insertError || null;
      }
    }

    if (error) {
      console.error('Supabase insert jewellery customer error:', error.message);
      // Fallback: try inserting as a booking into 'bookings' table
      const fallbackBookingPayload: DBBookingRow = {
        ref: customer.orderRef,
        name: customer.customerName,
        phone: customer.phone,
        wa: customer.whatsapp || customer.phone,
        email: customer.email || '',
        service: `Jewellery Order: ${customer.productName}`,
        notes: `Delivery Address: ${customer.deliveryAddress} | UTR: ${customer.upiTransactionId}`,
        date: new Date().toISOString().split('T')[0],
        slot: 'Express Shipping',
        status: customer.orderStatus || 'Confirmed',
      };
      await supabase.from('bookings').insert([fallbackBookingPayload]);

      return { success: false, isConfigured: true, error: error.message };
    }

    console.log('Successfully saved customer details to Supabase table "jewellery_customers":', customer.orderRef);
    return { success: true, isConfigured: true };
  } catch (err: any) {
    console.error('Failed to insert customer details to Supabase:', err);
    return { success: false, isConfigured: true, error: err?.message || 'Network error connecting to Supabase.' };
  }
}

/**
 * Update consignment / tracking details for a jewellery customer order or booking.
 */
export interface JewelleryTrackingInput {
  trackingCourier?: string;
  trackingNumber?: string;
  trackingUrl?: string;
}

export async function updateSupabaseJewelleryTracking(
  table: 'jewellery_customers' | 'jewellery_bookings',
  idOrRef: string,
  tracking: JewelleryTrackingInput
): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  const refColumn = table === 'jewellery_customers' ? 'order_ref' : 'booking_ref';

  const payload: Record<string, string | null> = {};
  if (tracking.trackingCourier !== undefined) payload.tracking_courier = tracking.trackingCourier || null;
  if (tracking.trackingNumber !== undefined) payload.tracking_number = tracking.trackingNumber || null;
  if (tracking.trackingUrl !== undefined) payload.tracking_url = tracking.trackingUrl || null;

  if (Object.keys(payload).length === 0) return true;

  try {
    const { error } = await supabase
      .from(table)
      .update(payload)
      .or(`id.eq.${idOrRef},${refColumn}.eq.${idOrRef}`);

    if (error) {
      console.error(`Supabase update tracking (${table}) error:`, error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.error('Failed to update tracking details in Supabase:', err);
    return false;
  }
}

/**
 * Update order status of a jewellery customer in Supabase
 */
export async function updateSupabaseJewelleryCustomerStatus(
  idOrRef: string,
  orderStatus: JewelleryCustomer['orderStatus']
): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  try {
    const { error } = await supabase
      .from('jewellery_customers')
      .update({ order_status: orderStatus })
      .or(`id.eq.${idOrRef},order_ref.eq.${idOrRef}`);

    if (error) {
      console.error('Supabase update customer status error:', error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Failed to update customer status in Supabase:', err);
    return false;
  }
}

/**
 * Delete a customer record from Supabase 'jewellery_customers' table
 */
export async function deleteSupabaseJewelleryCustomer(idOrRef: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  try {
    const { error } = await supabase
      .from('jewellery_customers')
      .delete()
      .or(`id.eq.${idOrRef},order_ref.eq.${idOrRef}`);

    if (error) {
      console.error('Supabase delete customer error:', error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Failed to delete customer in Supabase:', err);
    return false;
  }
}

/**
 * Fetch all jewellery bookings from Supabase 'jewellery_bookings' table
 */
export async function fetchSupabaseJewelleryBookings(): Promise<JewelleryBooking[] | null> {
  if (!isSupabaseConfigured()) return null;

  try {
    const { data, error } = await supabase
      .from('jewellery_bookings')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Supabase fetch jewellery_bookings error:', error.message);
      return null;
    }

    if (!data) return [];

    return data.map((row: DBJewelleryBookingRow) => ({
      id: row.id,
      created_at: row.created_at,
      bookingRef: row.booking_ref,
      clientName: row.client_name,
      phone: row.phone,
      email: row.email || '',
      productName: row.product_name,
      jewelleryId: row.jewellery_id || '',
      bookingType: (row.booking_type as any) || 'Rental',
      startDate: row.start_date || new Date().toISOString().split('T')[0],
      endDate: row.end_date || '',
      durationDays: row.duration_days || 1,
      dailyRate: row.daily_rate || '₹1,500/day',
      depositAmount: row.deposit_amount || '₹0',
      totalPrice: row.total_price,
      location: row.location || 'Studio Pickup',
      paymentStatus: (row.payment_status as any) || 'Confirmed',
      paymentMethod: row.payment_method || 'Google Pay / UPI',
      transactionId: row.transaction_id || '',
      status: (row.status as any) || 'Active Rental',
      notes: row.notes || '',
      trackingCourier: row.tracking_courier || undefined,
      trackingNumber: row.tracking_number || undefined,
      trackingUrl: row.tracking_url || undefined,
    }));
  } catch (err) {
    console.warn('Supabase jewellery_bookings query failed:', err);
    return null;
  }
}

/**
 * Insert a new jewellery booking into Supabase 'jewellery_bookings' table
 */
export async function insertSupabaseJewelleryBooking(
  booking: Omit<JewelleryBooking, 'id' | 'created_at'>
): Promise<{ success: boolean; error?: string; isConfigured: boolean }> {
  if (!isSupabaseConfigured()) {
    console.info('Supabase is not configured. Jewellery booking saved in local session.');
    return { success: false, isConfigured: false, error: 'Supabase environment variables not configured.' };
  }

  try {
    const payload: DBJewelleryBookingRow = {
      booking_ref: booking.bookingRef,
      client_name: booking.clientName,
      phone: booking.phone,
      email: booking.email || '',
      product_name: booking.productName,
      jewellery_id: booking.jewelleryId || '',
      booking_type: booking.bookingType || 'Rental',
      start_date: booking.startDate,
      end_date: booking.endDate || booking.startDate,
      duration_days: booking.durationDays || 1,
      daily_rate: booking.dailyRate || '₹1,500/day',
      deposit_amount: booking.depositAmount || '₹0',
      total_price: booking.totalPrice,
      location: booking.location || 'Studio Pickup',
      payment_status: booking.paymentStatus || 'Confirmed',
      payment_method: booking.paymentMethod || 'Google Pay / UPI',
      transaction_id: booking.transactionId || '',
      status: booking.status || 'Active Rental',
      tracking_courier: booking.trackingCourier || null,
      tracking_number: booking.trackingNumber || null,
      tracking_url: booking.trackingUrl || null,
      notes: booking.notes || '',
    };

    // Update-if-exists by booking_ref — the payment verification function may
    // auto-register a minimal row on payment; this fills in the full details
    // (including the rental From/To dates) and avoids duplicate rows.
    const { data: existingBooking, error: lookupError } = await supabase
      .from('jewellery_bookings')
      .select('id')
      .eq('booking_ref', booking.bookingRef)
      .maybeSingle();

    let error: any = lookupError || null;
    if (!error) {
      if (existingBooking?.id) {
        const { error: updateError } = await supabase
          .from('jewellery_bookings')
          .update(payload)
          .eq('id', existingBooking.id);
        error = updateError || null;
      } else {
        const { error: insertError } = await supabase.from('jewellery_bookings').insert([payload]);
        error = insertError || null;
      }
    }

    if (error) {
      console.error('Supabase insert jewellery_bookings error:', error.message);
      // Fallback: insert as booking in 'bookings' table
      const fallbackPayload: DBBookingRow = {
        ref: booking.bookingRef,
        name: booking.clientName,
        phone: booking.phone,
        wa: booking.phone,
        email: booking.email || '',
        service: `Jewellery ${booking.bookingType || 'Rental'}: ${booking.productName}`,
        notes: `Dates: ${booking.startDate} to ${booking.endDate || booking.startDate} | Total: ${booking.totalPrice}`,
        date: booking.startDate,
        slot: 'Rental Booking',
        status: booking.status || 'Confirmed',
      };
      await supabase.from('bookings').insert([fallbackPayload]);
      return { success: false, isConfigured: true, error: error.message };
    }

    console.log('Successfully saved jewellery booking to Supabase table "jewellery_bookings":', booking.bookingRef);
    return { success: true, isConfigured: true };
  } catch (err: any) {
    console.error('Failed to insert jewellery booking to Supabase:', err);
    return { success: false, isConfigured: true, error: err?.message || 'Network error connecting to Supabase.' };
  }
}

/**
 * Update status of a jewellery booking in Supabase 'jewellery_bookings'.
 * When a rental is marked Returned (safe recovery), the security deposit
 * refund is recorded in the notes so the studio has an audit trail — the
 * actual money refund is processed via Razorpay/UPI outside this app.
 */
export async function updateSupabaseJewelleryBookingStatus(
  refOrId: string,
  status: JewelleryBooking['status']
): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  try {
    // Look the row up first (ref, then UUID id) instead of
    // `.or(id.eq.<ref>,booking_ref.eq.<ref>)`, which errors on the UUID
    // column when a text ref is passed.
    let existing: DBJewelleryBookingRow | null = null;
    const byRef = await supabase.from('jewellery_bookings').select('*').eq('booking_ref', refOrId.trim()).maybeSingle();
    if (byRef.error) {
      console.error('Supabase jewellery booking lookup error:', byRef.error.message);
      return false;
    }
    existing = (byRef.data as DBJewelleryBookingRow | null) || null;
    if (!existing && isUuidValue(refOrId.trim())) {
      const byId = await supabase.from('jewellery_bookings').select('*').eq('id', refOrId.trim()).maybeSingle();
      if (byId.error) {
        console.error('Supabase jewellery booking lookup error:', byId.error.message);
        return false;
      }
      existing = (byId.data as DBJewelleryBookingRow | null) || null;
    }
    if (!existing) return false;

    const updatePayload: Partial<DBJewelleryBookingRow> = { status };
    const deposit = existing.deposit_amount || '₹0';
    if (
      status === 'Returned' &&
      deposit !== '₹0' &&
      !(existing.notes || '').includes('deposit refunded')
    ) {
      const refundNote = `Security deposit ${deposit} refunded on safe return (${formatDateDDMMYY(new Date().toISOString().split('T')[0])}).`;
      updatePayload.notes = existing.notes ? `${existing.notes} | ${refundNote}` : refundNote;
    }

    const { error } = await supabase
      .from('jewellery_bookings')
      .update(updatePayload)
      .eq('id', existing.id as string);

    if (error) {
      console.error('Supabase update jewellery_bookings status error:', error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Failed to update jewellery_bookings status in Supabase:', err);
    return false;
  }
}

/**
 * Delete a booking from Supabase 'jewellery_bookings' table
 */
export async function deleteSupabaseJewelleryBooking(refOrId: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  try {
    const { error } = await supabase
      .from('jewellery_bookings')
      .delete()
      .or(`id.eq.${refOrId},booking_ref.eq.${refOrId}`);

    if (error) {
      console.error('Supabase delete jewellery_bookings error:', error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Failed to delete jewellery_bookings record in Supabase:', err);
    return false;
  }
}

export interface UserCombinedBookings {
  hennaBookings: HennaBooking[];
  jewelleryRentals: JewelleryRental[];
  jewelleryBookings: JewelleryBooking[];
  jewelleryCustomers: JewelleryCustomer[];
}

/**
 * Fetch bookings and orders matching mobile number or reference code from ALL tables:
 * 1. 'bookings' (Henna & Mehendi appointments)
 * 2. 'jewellery_bookings' (Jewellery rentals & order bookings)
 * 3. 'jewellery_customers' (Jewellery express checkout dispatch orders)
 */
// Maps Razorpay payment statuses to customer-friendly labels
export function getPaymentDisplayLabel(status?: string): 'Paid' | 'Pending' | 'Failed' | 'Refunded' | null {
  if (!status) return null;
  const s = status.toUpperCase();
  if (['PAID', 'CAPTURED', 'COMPLETED'].includes(s) || s.includes('PAID')) return 'Paid';
  if (['FAILED', 'FAILURE'].includes(s)) return 'Failed';
  if (['REVERSED', 'REFUNDED'].includes(s) || s.includes('REFUND')) return 'Refunded';
  return 'Pending';
}

/** True when the booking was paid as an advance (token) payment, not in full.
 *  The advance flag lives in the booking's requests text ("Status: Advance
 *  Paid…") — the `payments` table only records PAID for both cases. */
export function isAdvancePaymentText(text?: string | null): boolean {
  return /advance paid/i.test(String(text || ''));
}

/** Amount actually paid, recovered from the requests text when the
 *  `payments` ledger has no row (e.g. test-mode/simulated payments). */
export function extractPaidAmountFromRequests(text?: string | null): string {
  const m = String(text || '').match(/₹[\d,]+(?:\.\d+)?/);
  return m ? m[0] : '';
}

/** Actual price of the selected service, embedded in the service name at
 *  booking time as "Mehendi: Minimal Design (₹200)". The advance token
 *  actually paid is stored separately (paymentAmount) — this is the full
 *  price that belongs in the "Amount" field. */
export function extractServicePrice(serviceName?: string | null): string {
  const matches = String(serviceName || '').match(/₹[\d,]+(?:\.\d+)?/g);
  return matches && matches.length > 0 ? matches[matches.length - 1] : '';
}

/**
 * Fetch payment records for a list of booking refs (idempotent, safe with empty list).
 * Returns a map: booking_ref (uppercase) -> { status, method, paymentId, amount }
 * `amount` is what was actually paid (token amount for advance payments,
 * full amount for full payments) from the `payments` ledger.
 */
export async function fetchPaymentInfoByRefs(
  refs: string[]
): Promise<Map<string, { status: string; method: string; paymentId: string; amount: string }>> {
  const map = new Map<string, { status: string; method: string; paymentId: string; amount: string }>();
  const uniqueRefs = Array.from(new Set((refs || []).filter(Boolean)));
  if (uniqueRefs.length === 0) return map;

  try {
    if (!isSupabaseConfigured()) return map;
    const { data } = await supabase
      .from('payments')
      .select('booking_ref, payment_status, payment_method, razorpay_payment_id, amount')
      .in('booking_ref', uniqueRefs);

    if (Array.isArray(data)) {
      for (const row of data as any[]) {
        const key = String(row.booking_ref || '').toUpperCase();
        if (!key) continue;
        // Prefer the most recent record per ref (latest by created order in response)
        const amt = Number(row.amount);
        map.set(key, {
          status: String(row.payment_status || ''),
          method: String(row.payment_method || ''),
          paymentId: String(row.razorpay_payment_id || ''),
          amount: Number.isFinite(amt) && amt > 0 ? `₹${amt.toLocaleString('en-IN')}` : '',
        });
      }
    }
  } catch (err) {
    console.warn('Payment info lookup failed:', err);
  }
  return map;
}

export async function fetchAllUserBookingsAndOrdersByPhone(
  searchQuery: string
): Promise<UserCombinedBookings> {
  const result: UserCombinedBookings = {
    hennaBookings: [],
    jewelleryRentals: [],
    jewelleryBookings: [],
    jewelleryCustomers: [],
  };

  if (!searchQuery || !searchQuery.trim()) return result;
  const trimmed = searchQuery.trim();
  const digitsOnly = trimmed.replace(/[^0-9]/g, '');

  if (!isSupabaseConfigured()) return result;

  try {
    // 1. Query 'bookings' table
    let bookingQueryFilter = `ref.ilike.%${trimmed}%,phone.ilike.%${trimmed}%,wa.ilike.%${trimmed}%,name.ilike.%${trimmed}%`;
    if (digitsOnly.length >= 4) {
      bookingQueryFilter += `,phone.ilike.%${digitsOnly}%,wa.ilike.%${digitsOnly}%`;
    }

    const { data: bookingsData } = await supabase
      .from('bookings')
      .select('*')
      .or(bookingQueryFilter);

    // Fetch payment records for the found booking refs so the customer can
    // see Paid / Pending status and the Razorpay transaction id
    const paymentInfoMap = await fetchPaymentInfoByRefs(
      (bookingsData || []).map((r: any) => r.ref)
    );

    if (bookingsData && bookingsData.length > 0) {
      result.hennaBookings = bookingsData.map((row: DBBookingRow) => {
        const payInfo = paymentInfoMap.get((row.ref || '').toUpperCase());
        const parsed = parseBookingNotes(row.notes);
        return {
          id: row.id || `hb-${Date.now()}`,
          ref: row.ref || `SC-${Math.floor(100 + Math.random() * 900)}`,
          serviceName: row.service || 'Mehendi Appointment',
          date: row.date || new Date().toISOString().split('T')[0],
          timeSlot: row.slot || '10:00 AM',
          location: parsed.location,
          clientName: row.name || 'Client',
          clientEmail: row.email || '',
          phone: row.phone || '',
          wa: row.wa || '',
          specialRequests: parsed.requests,
          status: (row.status as any) || 'Confirmed',
          type: isJewelleryOrderRef(row.ref) || row.service?.toLowerCase().includes('jewel') ? 'jewellery' : 'henna',
          // Advance flag only exists in the requests text — the payments
          // ledger says PAID for both advance and full payments, so restore
          // "Advance Paid" here or DB-fetched bookings lose it.
          paymentStatus: isAdvancePaymentText(parsed.requests)
            ? 'Advance Paid'
            : payInfo?.status || undefined,
          paymentAmount: payInfo?.amount || extractPaidAmountFromRequests(parsed.requests) || undefined,
          totalPrice: extractServicePrice(row.service) || payInfo?.amount || undefined,
          paymentMethod: payInfo?.method || undefined,
          transactionId: payInfo?.paymentId || undefined,
        };
      });
    }

    // 2. Query 'jewellery_bookings' table
    let jbFilter = `booking_ref.ilike.%${trimmed}%,phone.ilike.%${trimmed}%,client_name.ilike.%${trimmed}%`;
    if (digitsOnly.length >= 4) {
      jbFilter += `,phone.ilike.%${digitsOnly}%`;
    }

    const { data: jbData } = await supabase
      .from('jewellery_bookings')
      .select('*')
      .or(jbFilter);

    const jbRefs = new Set<string>();
    if (jbData && jbData.length > 0) {
      for (const row of jbData) {
        if (row?.booking_ref) jbRefs.add(String(row.booking_ref));
      }
      result.jewelleryBookings = jbData.map((row: DBJewelleryBookingRow) => ({
        id: row.id,
        bookingRef: row.booking_ref,
        clientName: row.client_name,
        phone: row.phone,
        email: row.email || '',
        productName: row.product_name,
        jewelleryId: row.jewellery_id || '',
        bookingType: (row.booking_type as any) || 'Rental',
        startDate: row.start_date || new Date().toISOString().split('T')[0],
        endDate: row.end_date || '',
        durationDays: row.duration_days || 1,
        dailyRate: row.daily_rate || '₹1,500/day',
        depositAmount: row.deposit_amount || '₹0',
        totalPrice: row.total_price,
        location: row.location || 'Studio Pickup',
        paymentStatus: (row.payment_status as any) || 'Confirmed',
        paymentMethod: row.payment_method || 'Google Pay / UPI',
        transactionId: row.transaction_id || '',
        status: (row.status as any) || 'Active Rental',
        notes: row.notes || '',
        trackingCourier: row.tracking_courier || undefined,
        trackingNumber: row.tracking_number || undefined,
        trackingUrl: row.tracking_url || undefined,
      }));
    }

    // Build ONE card per jewellery order, keyed by ref. 'jewellery_bookings'
    // carries the rental window (From/To), 'jewellery_customers' carries the
    // order details (totals, shipping, address). Both tables get a row for the
    // same order, so we merge them by ref instead of showing the order twice.
    const rentalsByRef = new Map<string, JewelleryRental>();
    for (const jb of result.jewelleryBookings) {
      const isPurchase = String(jb.bookingType || '').toLowerCase() === 'purchase';
      rentalsByRef.set(jb.bookingRef, {
        id: jb.id || jb.bookingRef,
        productName: jb.productName,
        ref: jb.bookingRef,
        clientName: jb.clientName,
        phone: jb.phone,
        email: jb.email,
        image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&q=80&w=600',
        startDate: jb.startDate,
        returnDue: jb.endDate || jb.startDate,
        dailyRate: jb.dailyRate || '₹1,500/day',
        depositAmount: jb.depositAmount,
        durationDays: jb.durationDays,
        status: isPurchase
          ? jb.status || 'Confirmed'
          : jb.status === 'Returned'
            ? 'Returned'
            : (jb.status === 'Overdue' ? 'Overdue' : 'Active Rental'),
        bookingType: jb.bookingType,
        paymentStatus: jb.paymentStatus,
        paymentMethod: jb.paymentMethod,
        transactionId: jb.transactionId,
        totalAmount: jb.totalPrice,
        trackingCourier: jb.trackingCourier,
        trackingNumber: jb.trackingNumber,
        trackingUrl: jb.trackingUrl,
      });
    }

    // 3. Query 'jewellery_customers' table
    let jcFilter = `order_ref.ilike.%${trimmed}%,phone.ilike.%${trimmed}%,customer_name.ilike.%${trimmed}%`;
    if (digitsOnly.length >= 4) {
      jcFilter += `,phone.ilike.%${digitsOnly}%`;
    }

    const { data: jcData } = await supabase
      .from('jewellery_customers')
      .select('*')
      .or(jcFilter);

    if (jcData && jcData.length > 0) {
      result.jewelleryCustomers = jcData.map((row: DBJewelleryCustomerRow) => ({
        id: row.id,
        created_at: row.created_at,
        orderRef: row.order_ref,
        customerName: row.customer_name,
        phone: row.phone,
        whatsapp: row.whatsapp || row.phone,
        email: row.email || '',
        deliveryAddress: row.delivery_address,
        productName: row.product_name,
        jewelleryId: row.jewellery_id || '',
        itemPrice: row.item_price,
        shippingFee: row.shipping_fee,
        totalAmount: row.total_amount,
        paymentMethod: row.payment_method,
        upiTransactionId: row.upi_transaction_id,
        paymentStatus: (row.payment_status as any) || 'Paid',
        orderStatus: (row.order_status as any) || 'Processing',
        notes: row.notes || '',
        trackingCourier: row.tracking_courier || undefined,
        trackingNumber: row.tracking_number || undefined,
        trackingUrl: row.tracking_url || undefined,
      }));

      // Merge customer order details into the same ref-keyed card (or create one)
      for (const jc of result.jewelleryCustomers) {
        const existing = rentalsByRef.get(jc.orderRef);
        const orderCard: JewelleryRental = {
          id: jc.id || jc.orderRef,
          productName: jc.productName,
          ref: jc.orderRef,
          clientName: jc.customerName,
          phone: jc.phone,
          email: jc.email,
          image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&q=80&w=600',
          startDate: new Date(jc.created_at || Date.now()).toISOString().split('T')[0],
          returnDue: jc.deliveryAddress || 'Courier Dispatch',
          dailyRate: jc.totalAmount,
          status: jc.orderStatus === 'Delivered' ? 'Returned' : 'Active Rental',
          paymentStatus: jc.paymentStatus,
          paymentMethod: jc.paymentMethod,
          transactionId: jc.upiTransactionId,
          totalAmount: jc.totalAmount,
          itemPrice: jc.itemPrice,
          shippingFee: jc.shippingFee,
          deliveryAddress: jc.deliveryAddress,
          trackingCourier: jc.trackingCourier,
          trackingNumber: jc.trackingNumber,
          trackingUrl: jc.trackingUrl,
        };
        if (existing) {
          // Rental window (From/To) comes from jewellery_bookings; the order
          // totals/address/payment come from jewellery_customers.
          rentalsByRef.set(jc.orderRef, {
            ...existing,
            productName: orderCard.productName,
            totalAmount: orderCard.totalAmount,
            paymentStatus: orderCard.paymentStatus,
            paymentMethod: orderCard.paymentMethod,
            transactionId: orderCard.transactionId,
            itemPrice: orderCard.itemPrice,
            shippingFee: orderCard.shippingFee,
            deliveryAddress: orderCard.deliveryAddress,
            image: orderCard.image,
            id: orderCard.id,
            trackingCourier: orderCard.trackingCourier || existing.trackingCourier,
            trackingNumber: orderCard.trackingNumber || existing.trackingNumber,
            trackingUrl: orderCard.trackingUrl || existing.trackingUrl,
          });
        } else {
          rentalsByRef.set(jc.orderRef, orderCard);
        }
      }
    }

    result.jewelleryRentals = [...rentalsByRef.values()];

    // Exclude jewellery orders from the 'bookings' table list — every such row
    // has a richer twin in the jewellery tables above (same ref). Keeping both
    // showed one order twice with different fields.
    if (jbRefs.size > 0 || rentalsByRef.size > 0) {
      const jewelleryRefSet = new Set<string>([...jbRefs, ...rentalsByRef.keys()]);
      result.hennaBookings = result.hennaBookings.filter(
        (b) => !b.ref || !jewelleryRefSet.has(b.ref)
      );
    }
  } catch (err) {
    console.error('Error fetching combined user bookings by phone:', err);
  }

  return result;
}

// ----------------------------------------------------
// CUSTOMER ACCOUNTS, WISHLIST, CART & STOCK SERVICES
// ----------------------------------------------------

export const CUSTOMER_ACCOUNTS_TABLE_SQL = `-- Run this SQL in your Supabase SQL Editor to create the customer_accounts table:

CREATE TABLE IF NOT EXISTS public.customer_accounts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50) NOT NULL,
    password VARCHAR(255) NOT NULL,
    wishlist JSONB DEFAULT '[]'::jsonb,
    cart JSONB DEFAULT '[]'::jsonb
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.customer_accounts ENABLE ROW LEVEL SECURITY;

-- Allow public insert and select on customer_accounts
CREATE POLICY "Allow public insert and select on customer_accounts"
ON public.customer_accounts
FOR ALL
USING (true)
WITH CHECK (true);
`;

/**
 * Customer accounts are backed by Supabase Auth (sessions managed by the
 * Supabase Auth SDK — no app data is kept in localStorage). Behaviour:
 *  - signup  → supabase.auth.signUp  + profile row in customer_accounts (id = auth user id)
 *  - sign in → supabase.auth.signInWithPassword (phone identifiers resolve to the account email)
 *  - session restore → supabase.auth.getSession() on app start
 *  - password reset → supabase.auth.resetPasswordForEmail / updateUser
 *  - NO local account database, NO stored passwords, NO session snapshots in localStorage.
 */

export async function getCurrentCustomerAccount(): Promise<CustomerAccount | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const authUser = sessionData.session?.user;
    if (!authUser) return null;

    // 1) Profile linked by auth user id
    let { data: profile } = await supabase
      .from('customer_accounts')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle();

    // 2) Fallback: match by email (legacy rows) and link it to the auth id
    if (!profile && authUser.email) {
      const { data: byEmail } = await supabase
        .from('customer_accounts')
        .select('*')
        .ilike('email', authUser.email)
        .maybeSingle();
      if (byEmail) {
        const { data: linked } = await supabase
          .from('customer_accounts')
          .update({ id: authUser.id })
          .eq('id', byEmail.id)
          .select()
          .maybeSingle();
        profile = linked || { ...byEmail, id: authUser.id };
      }
    }

    // 3) Fallback: never auto-create on a read-only lookup — just return a
    //    session-derived skeleton. Profile creation belongs in signup/sign-in,
    //    not here (it caused a NOT NULL violation retry loop on legacy tables).
    if (!profile && authUser.email) {
      const meta = (authUser as any).user_metadata || {};
      return {
        id: authUser.id,
        name: meta.name || authUser.email.split('@')[0],
        email: authUser.email,
        phone: meta.phone || '',
        wishlist: [],
        cart: [],
      };
    }

    if (!profile) return null;
    return {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      phone: profile.phone,
      wishlist: Array.isArray(profile.wishlist) ? profile.wishlist : [],
      cart: Array.isArray(profile.cart) ? profile.cart : [],
      created_at: profile.created_at,
    };
  } catch (e) {
    console.warn('Failed to load current customer account:', e);
    return null;
  }
}

/** Backward-compatible alias — now async and session-based (nothing cached locally). */
export async function getStoredCustomerAccount(): Promise<CustomerAccount | null> {
  return getCurrentCustomerAccount();
}

/**
 * Sign the customer out (clears the Supabase Auth session).
 */
export async function logoutCustomerAccount(): Promise<void> {
  try {
    await supabase.auth.signOut();
  } catch (e) {
    console.warn('Failed to sign out customer:', e);
  }
}

/**
 * Check if customer exists by email or phone (Supabase only)
 */
export async function checkCustomerExists(
  emailOrPhone: string
): Promise<{ exists: boolean; matchedBy?: 'email' | 'phone'; user?: Partial<CustomerAccount> }> {
  const query = emailOrPhone.trim().toLowerCase();
  const digitsOnly = emailOrPhone.replace(/[^0-9]/g, '');

  if (!query) return { exists: false };

  // Check Supabase
  if (isSupabaseConfigured()) {
    try {
      let filter = `email.ilike.${query}`;
      if (digitsOnly.length >= 7) {
        filter += `,phone.ilike.%${digitsOnly}%`;
      }

      const { data, error } = await supabase
        .from('customer_accounts')
        .select('id, name, email, phone')
        .or(filter);

      if (!error && data && data.length > 0) {
        const found = data[0];
        const matchedBy = found.email.toLowerCase() === query ? 'email' : 'phone';
        return { exists: true, matchedBy, user: found };
      }
    } catch (e) {
      console.warn('Error checking customer existence in Supabase:', e);
    }
  }

  return { exists: false };
}

/**
 * Register a new Customer Account in Supabase and locally
 */
export async function signupCustomerAccount(data: {
  name: string;
  email: string;
  phone: string;
  password: string;
}): Promise<{ success: boolean; user?: CustomerAccount; error?: string }> {
  const normalizedEmail = data.email.trim().toLowerCase();
  const rawPhone = data.phone.trim();
  const digitsOnly = rawPhone.replace(/[^0-9]/g, '');
  const trimmedName = data.name.trim();

  if (!trimmedName || !normalizedEmail || digitsOnly.length < 10 || !data.password) {
    return { success: false, error: 'Please provide valid name, email, 10-digit phone number, and password.' };
  }

  // 1. Try Supabase if configured
  if (isSupabaseConfigured()) {
    try {
      // Check existing email
      const { data: emailMatch } = await supabase
        .from('customer_accounts')
        .select('id, email, phone')
        .ilike('email', normalizedEmail)
        .maybeSingle();

      if (emailMatch) {
        return {
          success: false,
          error: 'An account with this email address already exists. Please sign in or use Forgot Password.',
        };
      }

      // Check existing phone
      const { data: phoneMatch } = await supabase
        .from('customer_accounts')
        .select('id, email, phone')
        .or(`phone.ilike.%${digitsOnly}%,phone.eq.${rawPhone}`)
        .maybeSingle();

      if (phoneMatch) {
        return {
          success: false,
          error: 'An account with this mobile phone number already exists. Please sign in or use Forgot Password.',
        };
      }

      const newAccountPayload = {
        id: '', // filled from the auth user id below
        name: trimmedName,
        email: normalizedEmail,
        phone: rawPhone,
        wishlist: [],
        cart: [],
      };

      // 1. Create the Supabase Auth user (password lives in auth.users, hashed)
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password: data.password,
        options: {
          data: { name: trimmedName, phone: rawPhone },
        },
      });

      if (signUpError) {
        const msg = signUpError.message?.toLowerCase().includes('already')
          ? 'An account with this email address already exists. Please sign in or use Forgot Password.'
          : signUpError.message || 'Could not create your account. Please try again.';
        return { success: false, error: msg };
      }

      const authUser = signUpData.user;
      if (!authUser?.id) {
        return { success: false, error: 'Could not create your account. Please try again.' };
      }

      // 2. Create the profile row (id = auth user id, NO password stored)
      const payload = { ...newAccountPayload, id: authUser.id };
      const { data: inserted, error: insertError } = await supabase
        .from('customer_accounts')
        .upsert([payload], { onConflict: 'id' })
        .select()
        .maybeSingle();

      if (insertError) {
        console.warn('customer_accounts profile upsert warning:', insertError.message);
      }

      const profile = inserted || { ...payload, created_at: new Date().toISOString() };
      const userAccount: CustomerAccount = {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
        wishlist: [],
        cart: [],
        created_at: profile.created_at,
      };

      // If the project requires email confirmation, there is no session yet —
      // sign in now succeeds only if confirmation is disabled.
      if (!signUpData.session) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password: data.password,
        });
        if (signInError) {
          return {
            success: false,
            error: 'Account created! Please confirm your email address (check your inbox) and then sign in.',
          };
        }
      }

      return { success: true, user: userAccount };
    } catch (err: any) {
      console.warn('Supabase customer signup error:', err);
      return { success: false, error: 'Could not create your account right now. Please try again.' };
    }
  }

  return {
    success: false,
    error: 'Sign-ups are unavailable — the studio database is not configured. Please contact the studio.',
  };
}

/**
 * Request Password Reset: Verifies account exists and creates a 6-digit reset OTP
 */
export async function requestCustomerPasswordReset(
  emailOrPhone: string
): Promise<{ success: boolean; otp?: string; error?: string; accountName?: string; contactTarget?: string }> {
  const query = emailOrPhone.trim().toLowerCase();
  const digitsOnly = emailOrPhone.replace(/[^0-9]/g, '');

  if (!query) {
    return { success: false, error: 'Please enter your registered Email address or Mobile number.' };
  }

  // Resolve to the account email (phone numbers are mapped to their email)
  let email = query.includes('@') ? query : '';
  let accountName = 'Client';

  if (isSupabaseConfigured()) {
    try {
      let rows: any[] | null = null;
      if (email) {
        const { data } = await supabase
          .from('customer_accounts')
          .select('id, name, email, phone')
          .ilike('email', email)
          .limit(1);
        rows = data;
      } else if (digitsOnly.length >= 7) {
        const { data } = await supabase
          .from('customer_accounts')
          .select('id, name, email, phone')
          .ilike('phone', `%${digitsOnly}%`)
          .limit(1);
        rows = data;
      }
      const found = rows && rows.length > 0 ? rows[0] : null;
      if (found) {
        email = found.email;
        accountName = found.name || 'Client';
      }
    } catch (e) {
      console.warn('Error resolving account for password reset:', e);
    }
  }

  // Always respond with a success-style message to avoid account enumeration —
  // Supabase Auth sends the actual reset email (configure SMTP for production).
  if (email && isSupabaseConfigured()) {
    const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/` : undefined;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) {
      console.warn('resetPasswordForEmail error:', error.message);
      return { success: false, error: 'Could not send the reset email. Please try again later.' };
    }
    return {
      success: true,
      accountName,
      contactTarget: email,
    };
  }

  return {
    success: false,
    error: 'No account found with this email or phone number. Please check the details or create a new account.',
  };
}

/**
 * Reset Customer Account Password in Supabase and local cache
 */
export async function resetCustomerPassword(
  _emailOrPhone: string,
  newPassword: string
): Promise<{ success: boolean; error?: string; user?: CustomerAccount }> {
  if (!newPassword || newPassword.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters long.' };
  }

  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Password reset is unavailable — the studio database is not configured.' };
  }

  // Requires an active recovery session (set by Supabase after the reset link).
  const { error } = await supabase.auth.updateUser({ password: newPassword.trim() });
  if (error) {
    return {
      success: false,
      error: 'Could not update your password. Please open the reset link from your email again.',
    };
  }

  const user = await getCurrentCustomerAccount();
  return { success: true, user: user || undefined };
}

/**
 * Log in an existing Customer by Email or Phone + Password
 */
export async function loginCustomerAccount(
  emailOrPhone: string,
  password: string
): Promise<{ success: boolean; user?: CustomerAccount; error?: string }> {
  const query = emailOrPhone.trim().toLowerCase();
  const rawPhone = emailOrPhone.replace(/[^0-9]/g, '');

  if (!query || !password) {
    return { success: false, error: 'Please enter your email/phone and password.' };
  }

  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Sign-in is unavailable — the studio database is not configured.' };
  }

  // Resolve the account email (mobile numbers are mapped via customer_accounts.phone)
  let email = query.includes('@') ? query : '';
  if (!email && rawPhone.length >= 7) {
    try {
      const { data, error } = await supabase
        .from('customer_accounts')
        .select('email')
        .ilike('phone', `%${rawPhone}%`)
        .limit(1);
      if (!error && data && data.length > 0) {
        email = (data[0] as any).email || '';
      }
    } catch (e) {
      console.warn('Phone → email lookup failed:', e);
    }
  }

  if (!email) {
    return {
      success: false,
      error: 'No account found with this email or phone number. Please check the details or create an account.',
    };
  }

  const { data: signInData, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !signInData.user) {
    const msg = (error?.message || '').toLowerCase();
    if (msg.includes('invalid')) {
      return { success: false, error: 'Incorrect password. Please try again.' };
    }
    return { success: false, error: 'Could not sign you in. Please check your details or try again.' };
  }

  const user = await getCurrentCustomerAccount();
  if (user) {
    return { success: true, user };
  }

  // Profile lookup failed — return a minimal session-derived account
  return {
    success: true,
    user: {
      id: signInData.user.id,
      name: (signInData.user.user_metadata as any)?.name || email.split('@')[0],
      email,
      phone: (signInData.user.user_metadata as any)?.phone || '',
      wishlist: [],
      cart: [],
    },
  };
}

/**
 * Save updated wishlist in Supabase
 */
export async function saveCustomerWishlistInDb(
  userIdOrEmail: string,
  wishlist: string[]
): Promise<boolean> {
  if (!userIdOrEmail) return false;

  if (isSupabaseConfigured()) {
    try {
      const isEmail = userIdOrEmail.includes('@');
      let query = supabase.from('customer_accounts').update({ wishlist });
      if (isEmail) {
        query = query.ilike('email', userIdOrEmail.trim());
      } else {
        query = query.eq('id', userIdOrEmail.trim());
      }
      const { error } = await query;
      if (error) {
        console.warn('Failed to update customer wishlist in Supabase:', error.message);
      } else {
        return true;
      }
    } catch (e) {
      console.warn('Failed to update wishlist in Supabase:', e);
    }
  }

  return true;
}

/**
 * Save updated cart in Supabase
 */
export async function saveCustomerCartInDb(
  userIdOrEmail: string,
  cart: CartItem[]
): Promise<boolean> {
  if (!userIdOrEmail) return false;

  if (isSupabaseConfigured()) {
    try {
      const isEmail = userIdOrEmail.includes('@');
      let query = supabase.from('customer_accounts').update({ cart });
      if (isEmail) {
        query = query.ilike('email', userIdOrEmail.trim());
      } else {
        query = query.eq('id', userIdOrEmail.trim());
      }
      const { error } = await query;
      if (error) {
        console.warn('Failed to update customer cart in Supabase:', error.message);
      } else {
        return true;
      }
    } catch (e) {
      console.warn('Failed to update cart in Supabase:', e);
    }
  }

  return true;
}

/**
 * Decrement stock in Supabase 'jewellery' or 'products' table and locally
 */
export async function decrementProductStockInDb(
  productId: string,
  decrementQty: number
): Promise<boolean> {
  if (!isSupabaseConfigured()) return true;

  try {
    // 1. Fetch current stock from table
    const { data: item } = await supabase
      .from('jewellery')
      .select('id, stock, stock_count')
      .eq('id', productId)
      .maybeSingle();

    if (item) {
      const currentStock = typeof item.stock === 'number' ? item.stock : (item.stock_count || 1);
      const newStock = Math.max(0, currentStock - decrementQty);
      await supabase
        .from('jewellery')
        .update({
          stock: newStock,
          stock_count: newStock,
          stock_label: newStock === 0 ? 'Out of Stock' : `${newStock} Available`,
        })
        .eq('id', productId);
      return true;
    }

    // 2. Try products table fallback
    const { data: prodItem } = await supabase
      .from('products')
      .select('id, stock, stock_count')
      .eq('id', productId)
      .maybeSingle();

    if (prodItem) {
      const currentStock = typeof prodItem.stock === 'number' ? prodItem.stock : (prodItem.stock_count || 1);
      const newStock = Math.max(0, currentStock - decrementQty);
      await supabase
        .from('products')
        .update({
          stock: newStock,
          stock_count: newStock,
          stock_label: newStock === 0 ? 'Out of Stock' : `${newStock} Available`,
        })
        .eq('id', productId);
      return true;
    }
  } catch (err) {
    console.warn('Error decrementing stock in Supabase:', err);
  }

  return true;
}

/**
 * Fetch all payment logs from Supabase 'payments' table
 */
export async function fetchSupabasePayments(): Promise<DBPaymentRow[]> {
  if (!isSupabaseConfigured()) return [];

  try {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Supabase fetch payments error:', error.message);
      return [];
    }

    return (data as DBPaymentRow[]) || [];
  } catch (err) {
    console.warn('Supabase payments query failed:', err);
    return [];
  }
}

/**
 * Insert or log payment into Supabase 'payments' table
 */
export async function insertSupabasePayment(payment: DBPaymentRow): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { success: true };
  }

  try {
    const { error } = await supabase
      .from('payments')
      .upsert([payment], { onConflict: 'razorpay_order_id' });

    if (error) {
      console.warn('Failed to insert payment log:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.warn('Error inserting payment:', err);
    return { success: false, error: err?.message };
  }
}
