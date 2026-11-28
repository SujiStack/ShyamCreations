import React from 'react';
import { STUDIO_INFO } from '../data/mockData';

export type LegalDocKey = 'privacy' | 'rental-terms' | 'sanitization';

interface LegalModalProps {
  doc: LegalDocKey | null;
  onClose: () => void;
}

const DOC_TITLES: Record<LegalDocKey, string> = {
  privacy: 'Privacy Policy',
  'rental-terms': 'Rental Terms & Conditions',
  sanitization: 'Sanitization & Hygiene Standards',
};

const LAST_UPDATED = '25 November 2026';

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="space-y-2">
    <h3 className="font-serif text-lg font-bold text-[var(--sc-emerald-dark)]">{title}</h3>
    <div className="text-sm text-[var(--sc-text-dim)] leading-relaxed space-y-2">{children}</div>
  </section>
);

const PrivacyContent: React.FC = () => (
  <div className="space-y-6">
    <p className="text-sm text-[var(--sc-text-dim)] leading-relaxed">
      This Privacy Policy explains how {STUDIO_INFO.name} ("we", "us", "our") collects, uses,
      stores, and protects your personal information when you use our website, book an
      appointment, place an order, or rent jewellery. By using our services you agree to the
      practices described here.
    </p>

    <Section title="1. Information We Collect">
      <p>When you register, book a service, or place an order we collect:</p>
      <ul className="list-disc pl-5 space-y-1">
        <li><strong>Contact details</strong> — name, phone number, email address.</li>
        <li><strong>Delivery details</strong> — shipping address, state and PIN code for jewellery orders.</li>
        <li><strong>Booking details</strong> — service type, appointment date/time, special requests.</li>
        <li><strong>Order & payment records</strong> — items, amounts, transaction IDs and payment status.</li>
        <li><strong>Account data</strong> — your saved cart and wishlist, tied to your account.</li>
      </ul>
    </Section>

    <Section title="2. Payment Information">
      <p>
        Payments are processed securely through <strong>Razorpay</strong>. We do <strong>not</strong>{' '}
        store your full card, UPI PIN, or bank credentials on our servers — Razorpay handles
        payment data under its own PCI-compliant security standards. We only retain the
        transaction reference and payment status needed to fulfil your order and provide support.
      </p>
    </Section>

    <Section title="3. How We Use Your Information">
      <ul className="list-disc pl-5 space-y-1">
        <li>To confirm, manage, and reschedule your appointments and orders.</li>
        <li>To process payments, deliveries, and rental returns.</li>
        <li>To send booking confirmations, receipts, and service updates by email or WhatsApp.</li>
        <li>To respond to enquiries and provide customer support.</li>
        <li>To maintain booking availability and prevent double-booking.</li>
        <li>To meet legal, accounting, and tax obligations.</li>
      </ul>
    </Section>

    <Section title="4. How We Store & Protect Data">
      <p>
        Your data is stored using <strong>Supabase</strong> (a secured, access-controlled
        database) with authentication-protected access. We apply reasonable technical and
        organisational measures to protect your information, and access is limited to
        authorised studio staff who need it to serve you.
      </p>
    </Section>

    <Section title="5. Sharing of Information">
      <p>We do not sell your personal data. We share information only with:</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Service providers who help us operate (e.g. Razorpay for payments, email/WhatsApp delivery, courier partners for shipping).</li>
        <li>Authorities where required by law.</li>
      </ul>
    </Section>

    <Section title="6. Cookies & Local Storage">
      <p>
        We use essential browser storage and authentication sessions to keep you signed in and
        to remember your cart and wishlist. We do not use advertising trackers.
      </p>
    </Section>

    <Section title="7. Your Rights & Choices">
      <p>
        You may request access to, correction of, or deletion of your personal data, or withdraw
        consent for marketing messages, by contacting us using the details below. You can also
        sign out at any time to end your session.
      </p>
    </Section>

    <Section title="8. Data Retention">
      <p>
        We retain your information for as long as your account is active or as needed to provide
        services and comply with legal obligations (such as tax and accounting records). You may
        request deletion of your account data at any time.
      </p>
    </Section>

    <Section title="9. Children's Privacy">
      <p>
        Our services are intended for adults. We do not knowingly collect data from children
        under 18 without parental consent.
      </p>
    </Section>

    <Section title="10. Changes to This Policy">
      <p>
        We may update this Privacy Policy from time to time. The "Last updated" date below
        reflects the latest revision. Continued use of our services after changes means you
        accept the updated policy.
      </p>
    </Section>

    <Section title="11. Contact Us">
      <p>For any privacy-related questions or requests, contact us:</p>
      <ul className="list-disc pl-5 space-y-1">
        <li><strong>{STUDIO_INFO.name}</strong>, {STUDIO_INFO.location}</li>
        <li>Phone / WhatsApp: <a className="text-[var(--sc-emerald-dark)] underline" href={`tel:${STUDIO_INFO.phone}`}>{STUDIO_INFO.phone}</a></li>
        <li>Email: <a className="text-[var(--sc-emerald-dark)] underline" href={`mailto:${STUDIO_INFO.email}`}>{STUDIO_INFO.email}</a></li>
      </ul>
    </Section>

    <p className="text-xs text-[var(--sc-text-dimmer)] pt-2 border-t border-[var(--sc-border)]">
      Last updated: {LAST_UPDATED}
    </p>
  </div>
);

const RentalTermsContent: React.FC = () => (
  <div className="space-y-6">
    <Section title="1. Rental Period & Pricing">
      <p>
        Jewellery rentals are charged per day. The rental period begins on the agreed start date
        and the item must be returned by the due date shown in your booking. Additional days are
        charged at the applicable daily rate.
      </p>
    </Section>
    <Section title="2. Security Deposit">
      <p>
        A refundable security deposit (a percentage of the item's value) is collected at the time
        of booking. The deposit is refunded after the item is returned in good condition, within
        the agreed return window.
      </p>
    </Section>
    <Section title="3. Care & Responsibility">
      <p>
        The renter is responsible for the item while in their possession. Loss, theft, or damage
        beyond normal wear may result in forfeiture of the deposit and/or a replacement charge.
        Items must not be altered, resized, or cleaned with unauthorised products.
      </p>
    </Section>
    <Section title="4. Returns & Late Fees">
      <p>
        Please return items by the due date. Late returns may incur additional daily charges.
        Returns are subject to inspection before the deposit is released.
      </p>
    </Section>
    <Section title="5. Cancellations & Rescheduling">
      <p>
        Cancellation and reschedule requests should be made as early as possible via WhatsApp or
        email. Any advance paid is subject to the studio's cancellation policy communicated at
        booking.
      </p>
    </Section>
    <Section title="6. Purchases">
      <p>
        For outright purchases, the item becomes your property once full payment is received and
        the order is dispatched. Shipping fees and delivery timelines are shown at checkout.
      </p>
    </Section>
    <Section title="7. Contact">
      <p>Questions about a rental or order? Reach us at {STUDIO_INFO.phone} or {STUDIO_INFO.email}.</p>
    </Section>
    <p className="text-xs text-[var(--sc-text-dimmer)] pt-2 border-t border-[var(--sc-border)]">
      Last updated: {LAST_UPDATED}
    </p>
  </div>
);

const SanitizationContent: React.FC = () => (
  <div className="space-y-6">
    <p className="text-sm text-[var(--sc-text-dim)] leading-relaxed">
      Hygiene is central to everything we do. These are the standards we follow for both our
      mehendi service and our jewellery rentals.
    </p>
    <Section title="1. Mehendi Hygiene">
      <ul className="list-disc pl-5 space-y-1">
        <li>Fresh, 100% organic henna paste is prepared for each client.</li>
        <li>Cones and applicators are single-use and disposed of after every appointment.</li>
        <li>Hands are sanitised before application begins.</li>
        <li>Work surfaces and tools are cleaned and sanitised between clients.</li>
      </ul>
    </Section>
    <Section title="2. Jewellery Care">
      <ul className="list-disc pl-5 space-y-1">
        <li>Every returned piece is inspected, cleaned, and sanitised before it is rented or sold again.</li>
        <li>Items are stored in clean, dry, protective packaging.</li>
        <li>High-touch pieces receive extra sanitisation between rentals.</li>
      </ul>
    </Section>
    <Section title="3. Staff & Studio">
      <ul className="list-disc pl-5 space-y-1">
        <li>Artists maintain clean hands and a tidy workstation.</li>
        <li>Tools and materials are stored hygienically.</li>
        <li>We follow general cleanliness practices recommended by public health guidance.</li>
      </ul>
    </Section>
    <Section title="4. Client Care">
      <p>
        If you have a known allergy or sensitivity, please inform us before your appointment so
        we can take appropriate precautions.
      </p>
    </Section>
    <p className="text-xs text-[var(--sc-text-dimmer)] pt-2 border-t border-[var(--sc-border)]">
      Last updated: {LAST_UPDATED}
    </p>
  </div>
);

export const LegalModal: React.FC<LegalModalProps> = ({ doc, onClose }) => {
  React.useEffect(() => {
    if (!doc) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [doc, onClose]);

  if (!doc) return null;

  return (
    <div
      id="legal-modal-overlay"
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="legal-modal"
        role="dialog"
        aria-modal="true"
        aria-label={DOC_TITLES[doc]}
        className="w-full max-w-2xl max-h-[85vh] bg-[var(--sc-surface)] rounded-3xl shadow-2xl flex flex-col animate-in slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 md:px-8 py-5 border-b border-[var(--sc-border)]">
          <h2 className="font-serif text-xl md:text-2xl font-bold text-[var(--sc-text)]">
            {DOC_TITLES[doc]}
          </h2>
          <button
            id="btn-close-legal-modal"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[var(--sc-accent-warm)] text-[var(--sc-text-dim)] transition-colors cursor-pointer"
            aria-label="Close"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="px-6 md:px-8 py-6 overflow-y-auto">
          {doc === 'privacy' && <PrivacyContent />}
          {doc === 'rental-terms' && <RentalTermsContent />}
          {doc === 'sanitization' && <SanitizationContent />}
        </div>
      </div>
    </div>
  );
};