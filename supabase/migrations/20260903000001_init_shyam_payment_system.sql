-- =============================================================
-- Shyam Creations — Razorpay Payment Tracking System
-- Migration: init_shyam_payment_system
--
-- Tables created (all idempotent — safe to re-run):
--   payments             -> master ledger, full lifecycle status
--   payment_events       -> audit trail of EVERY Razorpay webhook event
--   refunds              -> bank-return / refund tracking
--   bookings             -> henna bookings (payment flow target)
--   bookings_availability-> slot availability
--   jewellery            -> catalogue + stock (decremented on sale)
--   jewellery_customers  -> jewellery sale orders
--   jewellery_bookings   -> jewellery rental bookings
--
-- payment_status lifecycle in `payments`:
--   PENDING_PAYMENT -> INITIATED -> AUTHORIZED (bank sent/authorized)
--   -> CAPTURED (success)
--   -> FAILED (failure)
--   -> REVERSED / REFUNDED (bank return)
-- =============================================================

-- -----------------------------------------------------------------
-- 1. payments (master ledger)
-- -----------------------------------------------------------------
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

-- Lifecycle columns (safe even if payments table already existed)
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS authorized_at TIMESTAMPTZ;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS captured_at TIMESTAMPTZ;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS failed_at TIMESTAMPTZ;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS reversed_at TIMESTAMPTZ;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS failure_reason TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS amount_refunded NUMERIC(10, 2) DEFAULT 0.00;

CREATE INDEX IF NOT EXISTS idx_payments_booking_ref ON public.payments(booking_ref);
CREATE INDEX IF NOT EXISTS idx_payments_razorpay_order ON public.payments(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_payments_razorpay_payment ON public.payments(razorpay_payment_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(payment_status);

-- -----------------------------------------------------------------
-- 2. payment_events (full audit trail of every webhook event)
--    UNIQUE(entity_id, event_type) makes log inserts idempotent
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payment_events (
    id BIGSERIAL PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100),
    razorpay_order_id VARCHAR(100),
    razorpay_payment_id VARCHAR(100),
    booking_ref VARCHAR(100),
    status VARCHAR(50),
    amount NUMERIC(10, 2),
    method VARCHAR(50),
    error_description TEXT,
    raw_payload JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (entity_id, event_type)
);

CREATE INDEX IF NOT EXISTS idx_payment_events_order ON public.payment_events(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_payment ON public.payment_events(razorpay_payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_booking ON public.payment_events(booking_ref);
CREATE INDEX IF NOT EXISTS idx_payment_events_type ON public.payment_events(event_type);

-- -----------------------------------------------------------------
-- 3. refunds (bank return tracking)
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.refunds (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    razorpay_refund_id VARCHAR(100) UNIQUE,
    razorpay_payment_id VARCHAR(100),
    razorpay_order_id VARCHAR(100),
    booking_ref VARCHAR(100),
    amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(10) DEFAULT 'INR',
    refund_status VARCHAR(50) DEFAULT 'INITIATED',
    refund_reason TEXT,
    processed_at TIMESTAMPTZ,
    raw_payload JSONB
);

CREATE INDEX IF NOT EXISTS idx_refunds_payment ON public.refunds(razorpay_payment_id);
CREATE INDEX IF NOT EXISTS idx_refunds_order ON public.refunds(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_refunds_booking ON public.refunds(booking_ref);
CREATE INDEX IF NOT EXISTS idx_refunds_status ON public.refunds(refund_status);

-- -----------------------------------------------------------------
-- 4. bookings (henna bookings — target of payment confirmations)
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ref VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    wa VARCHAR(50),
    service VARCHAR(255),
    occasion VARCHAR(255),
    notes TEXT,
    date DATE,
    slot VARCHAR(50),
    status VARCHAR(50) DEFAULT 'Confirmed'
);

CREATE INDEX IF NOT EXISTS idx_bookings_ref ON public.bookings(ref);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON public.bookings(date);

-- -----------------------------------------------------------------
-- 5. bookings_availability — slot availability (disabled/blocked slots)
--    NOTE: Previously existed as a VIEW. Converted to a proper table
--    for full CRUD support (insert, update, delete via anon key).
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bookings_availability (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    date DATE NOT NULL,
    slot VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'disabled',
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_bookings_availability_date ON public.bookings_availability(date);
CREATE INDEX IF NOT EXISTS idx_bookings_availability_slot ON public.bookings_availability(slot);
CREATE INDEX IF NOT EXISTS idx_bookings_availability_status ON public.bookings_availability(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_availability_unique_slot ON public.bookings_availability(date, slot);

ALTER TABLE public.bookings_availability ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read and write on bookings_availability" ON public.bookings_availability;
CREATE POLICY "Allow public read and write on bookings_availability"
ON public.bookings_availability FOR ALL USING (true) WITH CHECK (true);

-- Drop legacy views if they exist (they blocked CRUD operations)
DROP VIEW IF EXISTS public.bookings_availability_view;
-- Note: Cannot drop bookings_availability view if it was created before as a view
-- The CREATE TABLE IF NOT EXISTS above will fail silently if a view with that name exists,
-- but the policies ensure full access.

-- -----------------------------------------------------------------
-- 6. jewellery (catalogue + stock, decremented on sale)
-- -----------------------------------------------------------------
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

-- -----------------------------------------------------------------
-- 7. jewellery_customers (jewellery sale orders)
-- -----------------------------------------------------------------
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

CREATE INDEX IF NOT EXISTS idx_jewellery_customers_order ON public.jewellery_customers(order_ref);

-- -----------------------------------------------------------------
-- 8. jewellery_bookings (jewellery rental bookings)
-- -----------------------------------------------------------------
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

CREATE INDEX IF NOT EXISTS idx_jewellery_bookings_ref ON public.jewellery_bookings(booking_ref);

-- -----------------------------------------------------------------
-- updated_at auto-maintenance trigger
-- -----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_payments_updated_at ON public.payments;
CREATE TRIGGER trg_payments_updated_at
    BEFORE UPDATE ON public.payments
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_refunds_updated_at ON public.refunds;
CREATE TRIGGER trg_refunds_updated_at
    BEFORE UPDATE ON public.refunds
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------
-- Row Level Security (matches existing app convention: public
-- read/write with anon key; service-role key from Edge Functions
-- bypasses RLS for authoritative updates)
-- -----------------------------------------------------------------
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jewellery ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jewellery_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jewellery_bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public access on payments" ON public.payments;
CREATE POLICY "Allow public access on payments"
ON public.payments FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read on payment_events" ON public.payment_events;
CREATE POLICY "Allow public read on payment_events"
ON public.payment_events FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public access on refunds" ON public.refunds;
CREATE POLICY "Allow public access on refunds"
ON public.refunds FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public access on bookings" ON public.bookings;
CREATE POLICY "Allow public access on bookings"
ON public.bookings FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public access on jewellery" ON public.jewellery;
CREATE POLICY "Allow public access on jewellery"
ON public.jewellery FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public access on jewellery_customers" ON public.jewellery_customers;
CREATE POLICY "Allow public access on jewellery_customers"
ON public.jewellery_customers FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public access on jewellery_bookings" ON public.jewellery_bookings;
CREATE POLICY "Allow public access on jewellery_bookings"
ON public.jewellery_bookings FOR ALL USING (true) WITH CHECK (true);
