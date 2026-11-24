-- =============================================================
-- Fix disabled-slot availability
--
-- Two problems on the live database:
--   1. The anon role has no INSERT policy on bookings_availability
--      (RLS error 42501), so every "Disable Slot" write is rejected
--      and falls back to the legacy disabled_slots table.
--   2. Slots stranded in the legacy disabled_slots table were never
--      copied into bookings_availability, so they are invisible to
--      booking + availability checks.
--
-- This migration is idempotent — safe to re-run.
-- =============================================================

-- 1. Re-create the public read/write policy on the current table.
ALTER TABLE public.bookings_availability ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read and write on bookings_availability"
ON public.bookings_availability;

CREATE POLICY "Allow public read and write on bookings_availability"
ON public.bookings_availability FOR ALL
USING (true)
WITH CHECK (true);

-- 2. Backfill any legacy disabled_slots rows into bookings_availability.
--    Guarded so fresh installs without the legacy table don't fail.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'disabled_slots'
  ) THEN
    INSERT INTO public.bookings_availability (date, slot, status)
    SELECT d.date, d.slot, 'disabled'
    FROM public.disabled_slots d
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.bookings_availability ba
      WHERE ba.date = d.date AND ba.slot = d.slot
    );
  END IF;
END
$$;
