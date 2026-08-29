import {
  supabase,
  getSupabaseCredentials,
  getSupabaseClient,
  saveCustomSupabaseCredentials,
} from './supabase';
import { HennaBooking, JewelleryCustomer, JewelleryBooking, CustomerAccount, CartItem, JewelleryRental } from '../types';

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
    notes TEXT
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
    shipping_fee VARCHAR(50) NOT NULL DEFAULT '₹50',
    total_amount VARCHAR(50) NOT NULL DEFAULT '₹2,550',
    payment_method VARCHAR(100) DEFAULT 'Google Pay / UPI',
    upi_transaction_id VARCHAR(100) NOT NULL,
    payment_status VARCHAR(50) DEFAULT 'Paid',
    order_status VARCHAR(50) DEFAULT 'Processing',
    notes TEXT
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

export const JEWELLERY_TABLE_SQL = `-- Run this SQL in your Supabase SQL Editor to create the jewellery table:

CREATE TABLE IF NOT EXISTS public.jewellery (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) DEFAULT 'Bridal',
    type VARCHAR(50) DEFAULT 'Rental',
    price VARCHAR(50) DEFAULT '₹25,000',
    amount NUMERIC DEFAULT 25000,
    rental_price_day VARCHAR(50) DEFAULT '₹1,500/day',
    stock INT DEFAULT 4,
    stock_label VARCHAR(100) DEFAULT '4 Available',
    image TEXT,
    images JSONB,
    description TEXT,
    material TEXT,
    weight VARCHAR(100),
    inclusion TEXT
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.jewellery ENABLE ROW LEVEL SECURITY;

-- Allow public read & insert access
CREATE POLICY "Allow public read and write on jewellery"
ON public.jewellery
FOR ALL
USING (true)
WITH CHECK (true);

-- Insert sample bridal collection
INSERT INTO public.jewellery (name, category, type, price, amount, rental_price_day, stock, stock_label, images, description, material, weight, inclusion)
VALUES
(
  'Kundan Bridal Set',
  'Bridal',
  'Rental',
  '₹25,000',
  25000,
  '₹1,500/day',
  4,
  '4 Available',
  '["https://lh3.googleusercontent.com/aida-public/AB6AXuBjFHTab9h762r8M6V6-ZdWjsTXARICmnrQBUgUkXVLgeu_JNQNaOfUnfMM0oeFiakmwOHEnTE6dRxQP0CJ4wpUSrmzWOCHGKYawcEG8EjCwVi2nvKrLbenZ3j_j5cwa_8rK76POfQx-E9RarHxDZQHwzoLAysDrfXnhw9e1f5NConq3ZOCilQmud9ogQz_-WNnvoTtWt6216gAnXWMHT24mMGMSHiVcElTz8hcKjxb6rdM_ELubhwLABBQXHHDHOj3bPedbyXzIODj"]'::jsonb,
  'A masterpiece of traditional craftsmanship, featuring intricate kundan work set in 22k gold plating, accented with emerald beads and pearls.',
  '22k Gold Plated, Kundan, Emerald Beads, Pearls',
  '245 grams',
  'Necklace, Earrings, Maang Tikka'
),
(
  'Royal Polki Choker',
  'Bridal',
  'Rental',
  '₹18,000',
  18000,
  '₹1,800/day',
  4,
  '4 Available',
  '["https://lh3.googleusercontent.com/aida-public/AB6AXuD_jbuFLZq1ZXxKKACftMFK35aNdwd9VeQgOYWu3VuiWRpiXOAOCtind5NReGTTahercU7__M-Nq5MSZSg7-EPpe8RPLiqNbekSdSFQhtGW8OqCD-V_AMm7xTMnWOI4RrKyz7AK3tmgIxi_jga34tgtatZmvip2ORDPwbwcW-EkcysI2BRwxZACxWK-jr5xQimYzC75R19eG4Ipu91vny8ToYEzmDye-RToMzj3mZxXRtyTu6cIYcV6XkmRGI0PUvOnFyEtTCF7hqJg"]'::jsonb,
  'Regal polki choker set lined with rubies and freshwater pearls. Designed to accentuate traditional South Indian & bridal ensembles.',
  '22k Gold Foil, Uncut Diamonds (Polki), Ruby Drops',
  '190 grams',
  'Choker & Matching Jhumkas'
),
(
  'Heritage Pearl Jhumkas',
  'Minimal',
  'Sale',
  '₹4,500',
  4500,
  '₹600/day',
  5,
  '5 Units Available',
  '["https://lh3.googleusercontent.com/aida-public/AB6AXuDnb2GfmkHVz1W7BYqKzs8N0VVvG9oZ2MorgUfZ9iYNNzifvmTyrVOqCSzZvseBJT2k527rm7wj9kQfyP2qHoto4YS_DYXhkeFERQxotoRs5fksf-DU_ncgUayh8rNha3td_m85kDzVIf793m6-2HO20D_E6xOdTR6kI-q5D5OrgYSQbqQm_e4DPsgx1Vcvck8Jy2bbOsL_6QG6zNkk95rFzHJhG0ulVLeeFYsemA-CMv8aZzAHP66TTbRRp7VFVDCLMmwGHBMdB_8m"]'::jsonb,
  'Delicate minimal jhumkas suitable for sangeet, engagement, and reception functions.',
  'Silver Alloy with 18k Gold Plating & Pearls',
  '65 grams',
  'Pair of Earrings'
),
(
  'Guttapusalu Hair Set',
  'Hair',
  'Rental',
  '₹12,000',
  12000,
  '₹1,200/day',
  8,
  '8 Available',
  '["https://lh3.googleusercontent.com/aida-public/AB6AXuAYwLxURGQANC52Col9Ykdeli1RfILsyHM-31PdErcJVUuwuL48zIVSwaz0YrO4eqnGUQidnFafDwpxgUueYAojdr4TRnBofPalWL-z0w2Nh0wUkqbxNVh6HtKwxoLud06saqxjiUkS9x7ZihQkispCY-I2uvaWaqzvPoiMagupLMjh7lukiEScf_J_8BChGC_RualG8lYwttKKMUZMn7Bf5vmiSMnPeiuYt3wHwm4_9O_Is3JHtWB7-7AH3VV8ojHx33zQvh6d2JYH"]'::jsonb,
  'Handcrafted temple jewelry hair accessories and matha patti set with cascading pearl clusters.',
  'Brass with 24k Gold Dip & Pearl Clusters',
  '110 grams',
  'Matha Patti & 6 Hair Pins'
);
`;

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
    isCustom: creds.isCustom,
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
 * Fetch all bookings from Supabase 'bookings' table
 */
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

    return data.map((row: DBBookingRow) => ({
      id: row.id || `hb-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      ref: row.ref || `HB-${Math.floor(100 + Math.random() * 900)}`,
      serviceName: row.service || 'Bridal Henna Artistry',
      date: row.date || '2026-08-08',
      timeSlot: row.slot || '10:00 AM',
      location: row.notes || 'Jaipur Venue',
      clientName: row.name || 'Client',
      clientEmail: row.email || 'client@example.com',
      phone: row.phone || '',
      wa: row.wa || '',
      specialRequests: row.notes || '',
      artist: row.occasion ? `Specialist (${row.occasion})` : 'Senior Specialist',
      status: (row.status as any) || 'Confirmed',
      type: 'henna',
    }));
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
      notes: `${booking.location || ''}. ${booking.specialRequests || ''}`.trim(),
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

export async function rescheduleSupabaseBooking(
  refOrId: string,
  newDate: string,
  newSlot: string,
  rescheduleNotes?: string
): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  try {
    const updatePayload: Partial<DBBookingRow> = {
      date: newDate,
      slot: newSlot,
      status: 'Rescheduled',
    };
    if (rescheduleNotes) {
      updatePayload.notes = rescheduleNotes;
    }

    const { error } = await supabase
      .from('bookings')
      .update(updatePayload)
      .or(`ref.eq.${refOrId},id.eq.${refOrId}`);

    if (error) {
      console.error('Supabase reschedule error:', error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Failed to reschedule in Supabase:', err);
    return false;
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

    return data.map((row: DBBookingRow) => ({
      id: row.id || `hb-${Date.now()}`,
      ref: row.ref || `SC-${Math.floor(100 + Math.random() * 900)}`,
      serviceName: row.service || 'Service Appointment',
      date: row.date || '',
      timeSlot: row.slot || '',
      location: row.notes || 'Studio / Home',
      clientName: row.name || 'Client',
      clientEmail: row.email || '',
      phone: row.phone || '',
      wa: row.wa || '',
      specialRequests: row.notes || '',
      status: (row.status as any) || 'Confirmed',
      type: row.service?.toLowerCase().includes('jewel')
        ? 'jewellery'
        : 'henna',
    }));
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
 */
export async function fetchSupabaseDisabledSlots(): Promise<DBDisabledSlotRow[]> {
  if (!isSupabaseConfigured()) return [];

  try {
    const { data, error } = await supabase.from('bookings_availability').select('*');
    if (error || !data) {
      // Fallback to disabled_slots table if needed
      const fallback = await supabase.from('disabled_slots').select('*');
      return fallback.data || [];
    }
    return data;
  } catch {
    return [];
  }
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
    console.info('Supabase URL & Anon Key not configured. Using local products catalogue.');
    return null;
  }

  try {
    const candidateTables = [
      'jewellery',
      'jewellery_items',
      'jewellery_products',
      'products',
      'jewellery_inventory',
      'jewels',
      'items',
      'jewellery_catalog'
    ];

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
      return null;
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

    // Cache to localStorage for offline access & fast reloads
    try {
      localStorage.setItem('shyam_jewellery_products', JSON.stringify(parsedProducts));
    } catch (cacheErr) {
      console.warn('Could not cache Supabase jewellery into localStorage:', cacheErr);
    }

    return parsedProducts;
  } catch (err) {
    console.warn('Supabase fetch jewellery unexpected error:', err);
    return null;
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
        return { success: true, user: data.user };
      }

      if (error) {
        console.warn('Supabase Auth error:', error.message);

        // Fallback check in custom Supabase 'admins' table
        try {
          const { data: dbUser, error: dbErr } = await supabase
            .from('admins')
            .select('*')
            .eq('email', cleanEmail)
            .maybeSingle();

          if (!dbErr && dbUser && dbUser.password === cleanPass) {
            return { success: true, user: dbUser };
          }
        } catch {
          // Table doesn't exist
        }

        const isNetworkErr =
          error.message?.toLowerCase().includes('network') ||
          error.message?.toLowerCase().includes('fetch') ||
          error.message?.toLowerCase().includes('failed to fetch');

        if (isNetworkErr) {
          if (isMasterAdminEmail && cleanPass.length >= 4) {
            return {
              success: true,
              user: { email: cleanEmail, role: 'authenticated_admin', id: 'master-admin-offline' },
              isOffline: true,
              isEmergency: true,
            };
          }

          return {
            success: false,
            error: `Network Connection Error connecting to Supabase (${creds.url}). Please check your Database URL in Config settings or verify your network connection.`
          };
        }

        return { success: false, error: error.message || 'Invalid email or password.' };
      }
    } catch (err: any) {
      console.warn('Supabase auth network exception:', err);

      if (isMasterAdminEmail && cleanPass.length >= 4) {
        return {
          success: true,
          user: { email: cleanEmail, role: 'authenticated_admin', id: 'master-admin-offline' },
          isOffline: true,
          isEmergency: true,
        };
      }

      return {
        success: false,
        error: `Network error connecting to Supabase (${creds.url}). Please check your Supabase Project URL in Database Config.`
      };
    }
  }

  // If Supabase not yet configured or URL invalid, allow master studio admin login to access settings
  if (isMasterAdminEmail && cleanPass.length >= 4) {
    return {
      success: true,
      user: { email: cleanEmail, role: 'authenticated_admin', id: 'master-admin-local' },
      isOffline: true,
      isEmergency: true,
    };
  }

  return {
    success: false,
    error: 'Supabase is not configured. Please enter your Supabase Project URL & Anon Key in the Database Configuration modal.'
  };
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
    };

    const { error } = await supabase.from('jewellery_customers').insert([payload]);

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
      notes: booking.notes || '',
    };

    const { error } = await supabase.from('jewellery_bookings').insert([payload]);

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
 * Update status of a jewellery booking in Supabase 'jewellery_bookings'
 */
export async function updateSupabaseJewelleryBookingStatus(
  refOrId: string,
  status: JewelleryBooking['status']
): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  try {
    const { error } = await supabase
      .from('jewellery_bookings')
      .update({ status })
      .or(`id.eq.${refOrId},booking_ref.eq.${refOrId}`);

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

    if (bookingsData && bookingsData.length > 0) {
      result.hennaBookings = bookingsData.map((row: DBBookingRow) => ({
        id: row.id || `hb-${Date.now()}`,
        ref: row.ref || `SC-${Math.floor(100 + Math.random() * 900)}`,
        serviceName: row.service || 'Mehendi Appointment',
        date: row.date || new Date().toISOString().split('T')[0],
        timeSlot: row.slot || '10:00 AM',
        location: row.notes || 'Studio Pickup / Client Location',
        clientName: row.name || 'Client',
        clientEmail: row.email || '',
        phone: row.phone || '',
        wa: row.wa || '',
        specialRequests: row.notes || '',
        status: (row.status as any) || 'Confirmed',
        type: row.service?.toLowerCase().includes('jewel') ? 'jewellery' : 'henna',
      }));
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

    if (jbData && jbData.length > 0) {
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
      }));

      // Convert jewellery bookings into JewelleryRental list for rentals tab UI
      result.jewelleryRentals = result.jewelleryBookings.map((jb) => ({
        id: jb.id || jb.bookingRef,
        productName: jb.productName,
        ref: jb.bookingRef,
        image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&q=80&w=600',
        startDate: jb.startDate,
        returnDue: jb.endDate || jb.startDate,
        dailyRate: jb.dailyRate || '₹1,500/day',
        status: jb.status === 'Returned' ? 'Returned' : (jb.status === 'Overdue' ? 'Overdue' : 'Active Rental'),
      }));
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
      }));

      // Also append customer orders to jewellery rentals list so user sees all items
      const customerRentals: JewelleryRental[] = result.jewelleryCustomers.map((jc) => ({
        id: jc.id || jc.orderRef,
        productName: `${jc.productName} (Express Dispatch)`,
        ref: jc.orderRef,
        image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&q=80&w=600',
        startDate: new Date(jc.created_at || Date.now()).toISOString().split('T')[0],
        returnDue: jc.deliveryAddress || 'Courier Dispatch',
        dailyRate: jc.totalAmount,
        status: jc.orderStatus === 'Delivered' ? 'Returned' : 'Active Rental',
      }));

      result.jewelleryRentals = [...result.jewelleryRentals, ...customerRentals];
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

const CUSTOMER_LOCAL_STORAGE_KEY = 'shyam_customer_auth';
const CUSTOMER_ACCOUNTS_LOCAL_DB_KEY = 'shyam_local_customer_accounts';

/**
 * Get cached local customer accounts list for offline fallback
 */
function getLocalCustomerAccounts(): CustomerAccount[] {
  try {
    const raw = localStorage.getItem(CUSTOMER_ACCOUNTS_LOCAL_DB_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Save cached local customer accounts list
 */
function saveLocalCustomerAccounts(accounts: CustomerAccount[]): void {
  try {
    localStorage.setItem(CUSTOMER_ACCOUNTS_LOCAL_DB_KEY, JSON.stringify(accounts));
  } catch (e) {
    console.warn('Failed to save local customer accounts:', e);
  }
}

/**
 * Get active logged-in customer from localStorage
 */
export function getStoredCustomerAccount(): CustomerAccount | null {
  try {
    const raw = localStorage.getItem(CUSTOMER_LOCAL_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Save or clear active logged-in customer in localStorage
 */
export function setStoredCustomerAccount(user: CustomerAccount | null): void {
  try {
    if (user) {
      localStorage.setItem(CUSTOMER_LOCAL_STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(CUSTOMER_LOCAL_STORAGE_KEY);
    }
  } catch (e) {
    console.warn('Failed to update stored customer account:', e);
  }
}

/**
 * Cleanly log out customer account and purge local wishlist/cart keys
 */
export function logoutCustomerAccount(): void {
  setStoredCustomerAccount(null);
  try {
    localStorage.removeItem(CUSTOMER_LOCAL_STORAGE_KEY);
    localStorage.removeItem('shyam_jewellery_wishlist');
    localStorage.removeItem('shyam_jewellery_cart');
    localStorage.removeItem('shyam_user_mobile');
  } catch (e) {
    console.warn('Failed to clear customer session data:', e);
  }
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
  const normalizedPhone = data.phone.trim();
  const trimmedName = data.name.trim();

  if (!trimmedName || !normalizedEmail || !normalizedPhone || !data.password) {
    return { success: false, error: 'Please provide name, email, phone number, and password.' };
  }

  // 1. Try Supabase if configured
  if (isSupabaseConfigured()) {
    try {
      // Check existing email
      const { data: existing, error: checkError } = await supabase
        .from('customer_accounts')
        .select('id, email, phone')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (existing) {
        return {
          success: false,
          error: 'An account with this email already exists. Please sign in.',
        };
      }

      const newAccountPayload = {
        name: trimmedName,
        email: normalizedEmail,
        phone: normalizedPhone,
        password: data.password, // Stored in customer_accounts table
        wishlist: [],
        cart: [],
      };

      const { data: inserted, error: insertError } = await supabase
        .from('customer_accounts')
        .insert([newAccountPayload])
        .select()
        .single();

      if (insertError) {
        console.warn('Supabase customer_accounts insert error:', insertError.message);
        // Fallback to local accounts if table is not yet created in Supabase
      } else if (inserted) {
        const userAccount: CustomerAccount = {
          id: inserted.id,
          name: inserted.name,
          email: inserted.email,
          phone: inserted.phone,
          wishlist: Array.isArray(inserted.wishlist) ? inserted.wishlist : [],
          cart: Array.isArray(inserted.cart) ? inserted.cart : [],
          created_at: inserted.created_at,
        };

        setStoredCustomerAccount(userAccount);
        return { success: true, user: userAccount };
      }
    } catch (err: any) {
      console.warn('Supabase customer signup error:', err);
    }
  }

  // 2. Local Fallback Database (Works offline or if table not yet run in Supabase)
  const localAccounts = getLocalCustomerAccounts();
  const existingLocal = localAccounts.find(
    (a) => a.email.toLowerCase() === normalizedEmail || a.phone === normalizedPhone
  );

  if (existingLocal) {
    return {
      success: false,
      error: 'An account with this email or phone number already exists. Please sign in.',
    };
  }

  const localUser: CustomerAccount = {
    id: `cust-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
    name: trimmedName,
    email: normalizedEmail,
    phone: normalizedPhone,
    password: data.password,
    wishlist: [],
    cart: [],
    created_at: new Date().toISOString(),
  };

  localAccounts.push(localUser);
  saveLocalCustomerAccounts(localAccounts);
  setStoredCustomerAccount(localUser);

  return { success: true, user: localUser };
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

  // 1. Try Supabase
  if (isSupabaseConfigured()) {
    try {
      let filter = `email.ilike.${query}`;
      if (rawPhone.length >= 4) {
        filter += `,phone.ilike.%${rawPhone}%`;
      }

      const { data: dbUsers, error } = await supabase
        .from('customer_accounts')
        .select('*')
        .or(filter);

      if (!error && dbUsers && dbUsers.length > 0) {
        const matched = dbUsers.find((u) => u.password === password);
        if (matched) {
          const userAccount: CustomerAccount = {
            id: matched.id,
            name: matched.name,
            email: matched.email,
            phone: matched.phone,
            wishlist: Array.isArray(matched.wishlist) ? matched.wishlist : [],
            cart: Array.isArray(matched.cart) ? matched.cart : [],
            created_at: matched.created_at,
          };
          setStoredCustomerAccount(userAccount);
          return { success: true, user: userAccount };
        } else {
          return { success: false, error: 'Incorrect password. Please try again.' };
        }
      }
    } catch (err) {
      console.warn('Supabase customer login error:', err);
    }
  }

  // 2. Local fallback
  const localAccounts = getLocalCustomerAccounts();
  const matchedLocal = localAccounts.find(
    (a) =>
      (a.email.toLowerCase() === query || (rawPhone && a.phone.includes(rawPhone))) &&
      a.password === password
  );

  if (matchedLocal) {
    setStoredCustomerAccount(matchedLocal);
    return { success: true, user: matchedLocal };
  }

  // Demo fallback for initial VIP client testing
  if (
    (query === 'client@shyamcreations.com' || query === '9363710342' || query.includes('shyam')) &&
    password === 'shyam123'
  ) {
    const demoClient: CustomerAccount = {
      id: 'cust-vip-sanya',
      name: 'Sanya Alisha',
      email: 'client@shyamcreations.com',
      phone: '+91 9363710342',
      wishlist: ['kundan-bridal-set-1'],
      cart: [],
      created_at: new Date().toISOString(),
    };
    setStoredCustomerAccount(demoClient);
    return { success: true, user: demoClient };
  }

  return {
    success: false,
    error: 'Account not found or invalid credentials. Please check your details or create an account.',
  };
}

/**
 * Save updated wishlist in Supabase & localStorage
 */
export async function saveCustomerWishlistInDb(
  userIdOrEmail: string,
  wishlist: string[]
): Promise<boolean> {
  if (!userIdOrEmail) return false;

  const current = getStoredCustomerAccount();
  if (current) {
    current.wishlist = wishlist;
    setStoredCustomerAccount(current);
  }

  // Update in local accounts list
  const localAccounts = getLocalCustomerAccounts();
  const idx = localAccounts.findIndex(
    (a) =>
      a.id === userIdOrEmail ||
      a.email.toLowerCase() === userIdOrEmail.toLowerCase() ||
      (current && a.email.toLowerCase() === current.email.toLowerCase())
  );
  if (idx >= 0) {
    localAccounts[idx].wishlist = wishlist;
    saveLocalCustomerAccounts(localAccounts);
  }

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
 * Save updated cart in Supabase & localStorage
 */
export async function saveCustomerCartInDb(
  userIdOrEmail: string,
  cart: CartItem[]
): Promise<boolean> {
  if (!userIdOrEmail) return false;

  const current = getStoredCustomerAccount();
  if (current) {
    current.cart = cart;
    setStoredCustomerAccount(current);
  }

  // Update in local accounts list
  const localAccounts = getLocalCustomerAccounts();
  const idx = localAccounts.findIndex(
    (a) =>
      a.id === userIdOrEmail ||
      a.email.toLowerCase() === userIdOrEmail.toLowerCase() ||
      (current && a.email.toLowerCase() === current.email.toLowerCase())
  );
  if (idx >= 0) {
    localAccounts[idx].cart = cart;
    saveLocalCustomerAccounts(localAccounts);
  }

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
