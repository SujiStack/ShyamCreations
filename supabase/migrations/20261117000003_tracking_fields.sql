-- Add tracking / consignment columns to both jewellery order tables.
-- Additive and nullable — safe for existing rows.
ALTER TABLE public.jewellery_customers
  ADD COLUMN IF NOT EXISTS tracking_courier TEXT,
  ADD COLUMN IF NOT EXISTS tracking_number TEXT,
  ADD COLUMN IF NOT EXISTS tracking_url TEXT;

ALTER TABLE public.jewellery_bookings
  ADD COLUMN IF NOT EXISTS tracking_courier TEXT,
  ADD COLUMN IF NOT EXISTS tracking_number TEXT,
  ADD COLUMN IF NOT EXISTS tracking_url TEXT;
