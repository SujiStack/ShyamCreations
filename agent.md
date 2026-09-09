# Project Agent — Shyam Creations

## Purpose

Guidelines and capabilities for working in the Shyam Creations repository. Covers project structure, the Razorpay payment pipeline, common tasks, and verification steps.

## Quick Commands

| Task | Command |
|---|---|
| Install dependencies | `pnpm install` |
| Start dev server | `pnpm run dev` |
| Typecheck (lint) | `pnpm run lint` |
| Build for production | `pnpm run build` |
| Link Supabase project | `supabase link -p mndzjhubpassrzesogyn` |
| Push SQL migrations | `supabase db push` |
| Set edge function secrets | `supabase secrets set KEY=value ...` |
| Deploy an edge function | `supabase functions deploy <name>` |
| Deploy all functions | `supabase functions deploy` |
| List deployed functions | `supabase functions list` |

## Project Layout

- `src/` — TypeScript React source. Entry: `main.tsx`, `App.tsx`, views in `src/views/`.
- `src/components/` — UI components (navigation, drawers, modals, footer, `CartCheckoutModal`).
- `src/lib/` — utilities and integrations:
  - `razorpay.ts` — client-side Razorpay checkout, key handling, test-mode simulator fallback.
  - `supabase.ts` — Supabase client + credential management (env or localStorage override).
  - `supabaseService.ts` — all DB read/write helpers + table DDL constants.
  - `emailService.ts` — EmailJS confirmation/admin emails.
- `supabase/functions/` — deployed Edge Functions (Deno):
  - `create-razorpay-order` — server-side order creation via Razorpay Orders API.
  - `verify-razorpay-payment` — HMAC signature verification + record updates + stock decrement.
  - `razorpay-webhook` — handles all Razorpay webhook events with full audit logging.
- `supabase/migrations/` — SQL migrations applied with `supabase db push`.
- `src/data/mockData.ts` — local mock data fallback.

## Razorpay Payment System

### Flow

1. Client (`initiateRazorpayPayment` in `src/lib/razorpay.ts`) invokes `create-razorpay-order`.
2. Razorpay Checkout modal opens (real key) or the simulator modal (placeholder key).
3. On success, client invokes `verify-razorpay-payment` with order/payment/signature.
4. Razorpay sends webhooks to `razorpay-webhook` for the authoritative lifecycle:
   `payment.created → payment.authorized (bank sent) → payment.captured (success)`
   or `payment.failed`, `payment.reversed` / `refund.*` (bank return).

### Database tables (see `supabase/migrations/`)

- `payments` — master ledger; `payment_status` lifecycle: `PENDING_PAYMENT → INITIATED → AUTHORIZED → CAPTURED | FAILED | REVERSED | REFUNDED`; stage timestamps (`authorized_at`, `captured_at`, `failed_at`, `reversed_at`), `failure_reason`, `amount_refunded`.
- `payment_events` — immutable audit trail of every webhook event; idempotent via `UNIQUE(entity_id, event_type)`.
- `refunds` — bank-return tracking (`INITIATED → PROCESSED | FAILED`).
- `bookings` / `bookings_availability` — henna bookings and slots.
- `jewellery` / `jewellery_customers` / `jewellery_bookings` — catalogue, sale orders, rentals.

### Required Edge Function secrets

`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`
(`SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` are auto-provided by Supabase.)

### Client config

`VITE_RAZORPAY_KEY_ID` in `.env` (or Admin Portal → Connection Settings, stored in localStorage).
The Key Secret must NEVER appear in `.env`, code, or git.

## Agent Capabilities

- Add or modify React components, views, and payment flow steps.
- Create/update Edge Functions in `supabase/functions/` and migrations in `supabase/migrations/`.
- Run typecheck/build verification after changes.
- Draft documentation updates (`README.md`, this file).

## Conventions

- Use types from `src/types.ts`; DB row shapes live in `src/lib/supabaseService.ts`.
- Keep edits minimal and focused; follow existing code style.
- Webhook handlers must be idempotent (upsert on conflict, never blind inserts).
- Amounts: Razorpay API uses paise; DB stores INR rupees (NUMERIC).
- New table DDL → new timestamped file in `supabase/migrations/`, idempotent (`IF NOT EXISTS`).
- New dependencies must get a matching `package.json` script where relevant.

## What the Agent Should Not Do

- Make large architectural changes without explicit review.
- Add secrets, keys, or credentials to the repo (`.env` values stay local; secrets live in Supabase).
- Change unrelated files or refactor broadly unless asked.

## Onboarding checks after changes

1. `pnpm run lint` and `pnpm run build` pass.
2. Dev server loads the main view: `pnpm run dev`.
3. If Edge Functions changed: `supabase functions deploy <name>` and confirm 200 via `supabase functions list`.
4. If migrations changed: `supabase db push`.
5. Test payment with Razorpay test card `4111 1111 1111 1111` (any future expiry/CVV, PIN 1234) or test UPI `success@razorpay`.

---

Maintained with the project. Update this file when structure or workflows change.
