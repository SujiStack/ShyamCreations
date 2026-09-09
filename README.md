# Shyam Creations
i am suji s
Shyam Creations is a Vite + React + TypeScript bridal and artisanal studio experience for South Asian wedding jewelry, jewellery rentals, and mehendi booking services. The application includes a public storefront, customer authentication, cart and wishlist flows, Razorpay-ready checkout, Supabase-backed storage, and an admin portal for managing bookings and product activity.

## Features

- Elegant landing experience for Shyam Creations with studio branding and service categories.
- Product catalogue for bridal and festival jewellery with cart, wishlist, and stock-aware purchase flows.
- Henna and mehendi booking workflow with customer details, service date, time slot, location, and special requests.
- Jewellery rental and rental/checkout booking experience.
- Customer authentication modal and customer account storage in local browser state.
- Supabase integration for product inventory, bookings, and customer data persistence.
- Razorpay checkout and payment intent flow with Supabase Edge Function support.
- EmailJS booking confirmation and admin notification templates.
- Admin portal view for managing bookings and service data.

## Tech Stack

- React 19
- Vite 6
- TypeScript
- Tailwind CSS
- Supabase JavaScript client
- Razorpay checkout integration
- EmailJS
- Deno Supabase Edge Functions for payment and webhook verification

## Project Structure

```text
src/
  components/        UI components such as Navigation, Footer, Drawer flows, modals
  data/              mock catalog, service package, and default booking data
  lib/               integration helpers for Supabase, EmailJS, and Razorpay
  views/             Home, product, booking, admin, and booking history flows
supabase/
  functions/         Razorpay order creation, payment verification, webhooks
  migrations/        database migration for payment tracking
```

## Prerequisites

- Node.js 18+
- npm
- A Supabase project URL and anonymous key
- A Razorpay key pair for production or test payments
- EmailJS configuration for confirmation emails

## Local Setup

1. Clone the repository.
2. Install dependencies:

```bash
npm install
```

3. Create an environment file for local development. This project reads frontend variables from Vite environment configuration:

```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_RAZORPAY_KEY_ID=your_razorpay_key_id
VITE_EMAILJS_SERVICE_ID=your_emailjs_service_id
VITE_EMAILJS_CUSTOMER_TEMPLATE_ID=your_customer_template_id
VITE_EMAILJS_ADMIN_TEMPLATE_ID=your_admin_template_id
VITE_EMAILJS_PUBLIC_KEY=your_emailjs_public_key
VITE_ADMIN_EMAIL=your_admin_email
```

4. Start the development server:

```bash
npm run dev
```

The Vite server is configured to run on port 3000 by default.

## Available Scripts

```bash
npm run dev      # Start Vite development server
npm run build    # Create production build
npm run preview  # Preview production build locally
npm run lint     # TypeScript no-emission check
npm run clean    # Remove dist and generated server output
```

## Supabase and Payment Integration

The project includes Supabase database access patterns and Supabase Edge Functions under the `supabase/functions` directory:

- `create-razorpay-order`
- `verify-razorpay-payment`
- `razorpay-webhook`

These functions are designed to use Razorpay webhooks, Razorpay signatures, and the Supabase service role key for secure payment validation and persistence.

## Production Notes

- Do not commit production secrets or private keys.
- Configure your Supabase secrets and Razorpay credentials in the Supabase Edge Function environment.
- Ensure EmailJS templates and keys are valid before deploying the frontend.
- If the frontend is disconnected from Supabase credentials, the app falls back to local mock data and simulated UI flows.

## License

This project is an internal studio storefront and booking platform for Shyam Creations.
