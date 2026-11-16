-- Post-migration cleanup for customer_accounts → Supabase Auth.
-- Run ONLY AFTER the migrate-customer-accounts Edge Function has been deployed
-- and its JSON report shows every legacy row as "created" or "already-registered".
--
--   1. sanity check: every profile row now matches an auth user id
--      (spot check a few rows by email in both tables)
--   2. drop the legacy plaintext password column entirely
ALTER TABLE public.customer_accounts DROP COLUMN IF EXISTS password;

-- Optional: tighten RLS. Today any anon/key holder can read/write everything.
-- Recommended replacement policies after migration:
--   - public SELECT only of id, name, email, phone (needed for phone→email login lookup),
--   - authenticated users can read/update ONLY their own row.
-- Kept as comments because tightening RLS is a deliberate security decision.
