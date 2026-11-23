-- Post-migration cleanup for customer_accounts → Supabase Auth.
-- Step 1 MUST be applied BEFORE the new auth code is deployed, or signup /
-- profile creation will fail: the legacy table keeps a NOT NULL password
-- column that the new code intentionally never writes.
-- Step 2 runs AFTER the migrate-customer-accounts Edge Function has reported
-- every legacy row as "created" or "already-registered".

-- Step 1: relax the legacy NOT NULL so the new auth (which NEVER inserts a
-- password) can create profiles — run this first.
ALTER TABLE public.customer_accounts ALTER COLUMN password DROP NOT NULL;

-- Step 2: drop the legacy plaintext password column entirely.
-- Run ONLY AFTER the migrate-customer-accounts Edge Function has been deployed
-- and its JSON report shows every legacy row as "created" or "already-registered".
ALTER TABLE public.customer_accounts DROP COLUMN IF EXISTS password;

-- Optional: tighten RLS. Today any anon/key holder can read/write everything.
-- Recommended replacement policies after migration:
--   - public SELECT only of id, name, email, phone (needed for phone→email login lookup),
--   - authenticated users can read/update ONLY their own row.
-- Kept as comments because tightening RLS is a deliberate security decision.
