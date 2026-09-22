import React, { useState, useEffect } from 'react';
import { ViewMode, HennaBooking, CustomerAccount, PendingAuthAction } from '../types';
import { SERVICE_PACKAGES, VISIONARY_ARTISTS, STUDIO_INFO } from '../data/mockData';
import { sendBookingConfirmationEmails, EmailSendResult } from '../lib/emailService';
import { insertSupabaseJewelleryBooking } from '../lib/supabaseService';
import { initiateRazorpayPayment } from '../lib/razorpay';

export type ServiceCategoryKey = 'mehendi' | 'jewellery';

interface MehendiServiceCard {
  id: string;
  icon: string;
  title: string;
  price: string;
  subtext: string;
  duration: string;
}

const MEHENDI_SERVICES: MehendiServiceCard[] = [
  {
    id: 'minimal-design',
    icon: '🌿',
    title: 'Minimal Design',
    price: '₹200',
    subtext: 'One Side ₹100 · Both Sides ₹200',
    duration: '20–30 min',
  },
  {
    id: 'palm-length',
    icon: '✋',
    title: 'Palm Length',
    price: '₹400',
    subtext: 'One Side ₹200 · Both Sides ₹400',
    duration: '30–45 min',
  },
  {
    id: 'bangle-length',
    icon: '💫',
    title: 'Bangle Length',
    price: '₹600',
    subtext: 'One Side ₹300 · Both Sides ₹600',
    duration: '45–60 min',
  },
  {
    id: 'mid-length',
    icon: '🌸',
    title: 'Mid Length',
    price: '₹600',
    subtext: 'One Side ₹300 · Both Sides ₹600',
    duration: '60–75 min',
  },
  {
    id: 'bridal-elbow',
    icon: '👰',
    title: 'Bridal (Elbow)',
    price: '₹2,000',
    subtext: 'Both Hands up to Elbow',
    duration: '3–4 hrs',
  },
  {
    id: 'bridal-above-elbow',
    icon: '✨',
    title: 'Bridal (Above Elbow)',
    price: '₹3,000',
    subtext: 'Both Hands above Elbow',
    duration: '4–5 hrs',
  },
];

interface HennaBookingViewProps {
  onNavigate: (view: ViewMode, category?: ServiceCategoryKey) => void;
  onAddBooking: (booking: HennaBooking) => Promise<{ success: boolean; isConfigured: boolean; error?: string }> | void;
  initialCategory?: ServiceCategoryKey;
  customerUser?: CustomerAccount | null;
  onRequireAuth?: (action: PendingAuthAction) => void;
}

export const HennaBookingView: React.FC<HennaBookingViewProps> = ({
  onNavigate,
  onAddBooking,
  initialCategory = 'mehendi',
  customerUser = null,
  onRequireAuth,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategoryKey>(initialCategory);

  // Mehendi Form State
  const [clientName, setClientName] = useState<string>(customerUser?.name || 'Priya Sharma');
  const [clientPhone, setClientPhone] = useState<string>(customerUser?.phone || '9876543210');
  const [clientEmail, setClientEmail] = useState<string>(customerUser?.email || 'priya@example.com');
  const [sameAsPhone, setSameAsPhone] = useState<boolean>(true);
  const [clientWa, setClientWa] = useState<string>(customerUser?.phone || '9876543210');

  useEffect(() => {
    if (customerUser) {
      if (customerUser.name) setClientName(customerUser.name);
      if (customerUser.phone) {
        setClientPhone(customerUser.phone);
        setClientWa(customerUser.phone);
      }
      if (customerUser.email) setClientEmail(customerUser.email);
    }
  }, [customerUser]);
  const [occasion, setOccasion] = useState<string>('Select Occasion');
  const [selectedDate, setSelectedDate] = useState<string>('2026-08-20');
  const [selectedMehendiService, setSelectedMehendiService] = useState<string>('minimal-design');
  const [additionalNotes, setAdditionalNotes] = useState<string>('');

  // Other categories fallback state
  const [selectedPackage, setSelectedPackage] = useState<string>('saree-pre-pleating');
  const [selectedArtist, setSelectedArtist] = useState<string>('shyam-master');
  const [selectedTime, setSelectedTime] = useState<string>('Morning Slot (09:00 AM - 01:00 PM)');
  const [location, setLocation] = useState<string>('Tambaram, Chennai (Studio / Venue)');

  // Service-Specific Custom Fields
  const [sareeCount, setSareeCount] = useState<string>('2-3 Sarees');
  const [sareeFabrics, setSareeFabrics] = useState<string>('Kanchipuram Silk');
  const [sareeFoldingStyle, setSareeFoldingStyle] = useState<string>('Precision Box Fold (Travel Safe)');
  const [sareeServiceMode, setSareeServiceMode] = useState<string>('Studio Drop-off & Pickup');

  const [jewellerySetType, setJewellerySetType] = useState<string>('Heritage Kundan Choker & Haram Set');
  const [jewelleryEventType, setJewelleryEventType] = useState<string>('Muhurtham (Wedding)');
  const [jewelleryRentalDays, setJewelleryRentalDays] = useState<string>('2 Days (Sangeet + Wedding)');
  const [jewelleryIdVerify, setJewelleryIdVerify] = useState<string>('Aadhar Card / Driving License Verified');

  const [nailTechnique, setNailTechnique] = useState<string>('Full Set Gel Extensions with Nail Art');
  const [nailShape, setNailShape] = useState<string>('Almond');
  const [nailLength, setNailLength] = useState<string>('Medium (Classic)');
  const [nailAddons, setNailAddons] = useState<string>('3D Floral Acrylic & Chrome Foil');

  // Payment State
  const [paymentOption, setPaymentOption] = useState<'advance' | 'full'>('advance');

  const [bookingSuccess, setBookingSuccess] = useState<boolean>(false);
  const [generatedRef, setGeneratedRef] = useState<string>('');
  const [saveStatus, setSaveStatus] = useState<{ isConfigured: boolean; success: boolean; error?: string } | null>(null);
  const [confirmedBookingCard, setConfirmedBookingCard] = useState<HennaBooking | null>(null);
  const [emailStatus, setEmailStatus] = useState<EmailSendResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleRazorpayBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!customerUser) {
      if (onRequireAuth) {
        onRequireAuth({ action: 'mehendi', targetView: 'henna-booking', targetCategory: selectedCategory });
      }
      setFormError('Please sign in or register an account before booking your appointment.');
      return;
    }

    if (!clientName.trim()) {
      setFormError('Please enter your Full Name.');
      return;
    }
    if (!clientPhone.trim() || clientPhone.length < 10) {
      setFormError('Please enter a valid 10-digit Mobile Number.');
      return;
    }
    if (!sameAsPhone && (!clientWa.trim() || clientWa.length < 10)) {
      setFormError('Please enter a valid 10-digit WhatsApp Number.');
      return;
    }
    if (!clientEmail.trim() || !clientEmail.includes('@')) {
      setFormError('Please enter a valid Email Address for appointment confirmation.');
      return;
    }
    if (!occasion || occasion === 'Select Occasion') {
      setFormError('Please select an Occasion.');
      return;
    }
    if (!selectedDate) {
      setFormError('Please select a Preferred Date.');
      return;
    }
    if (!selectedTime) {
      setFormError('Please select a Time Slot.');
      return;
    }
    if (selectedCategory === 'mehendi' && !selectedMehendiService) {
      setFormError('Please select a Mehendi Service.');
      return;
    }
    if (selectedCategory !== 'mehendi' && !selectedPackage) {
      setFormError('Please select a Service Package.');
      return;
    }

    setIsSubmitting(true);
    const refCode = `SC-${Date.now().toString().slice(-6)}`;

    let serviceTitle = 'Bridal Service';
    let servicePriceVal = '₹200';
    let compiledNotes = additionalNotes;

    if (selectedCategory === 'mehendi') {
      const mehendiObj = MEHENDI_SERVICES.find((s) => s.id === selectedMehendiService);
      serviceTitle = mehendiObj ? `Mehendi: ${mehendiObj.title} (${mehendiObj.price})` : 'Mehendi Artistry';
      servicePriceVal = mehendiObj ? mehendiObj.price : '₹200';
      const specs = `Occasion: ${occasion} | Duration: ${mehendiObj?.duration || 'Standard'}`;
      compiledNotes = additionalNotes ? `${specs}\nNotes: ${additionalNotes}` : specs;
    } else {
      const pkg = SERVICE_PACKAGES.find((p) => p.id === selectedPackage);
      serviceTitle = pkg ? pkg.title : 'Jewellery Rental & Trial';
      servicePriceVal = pkg ? pkg.price : '₹500';
      const specs = `[Jewellery Specs] Set: ${jewellerySetType} | Event: ${jewelleryEventType} | Duration: ${jewelleryRentalDays} | ID: ${jewelleryIdVerify}`;
      compiledNotes = additionalNotes ? `${specs}\nNotes: ${additionalNotes}` : specs;
    }

    const isBridalService = selectedMehendiService.includes('bridal');
    const tokenAmountNum = isBridalService ? 500 : 100;
    const fullPriceNum = parseInt(servicePriceVal.replace(/[^0-9]/g, ''), 10) || (isBridalService ? 2000 : 200);
    const payAmountNum = paymentOption === 'advance' ? tokenAmountNum : fullPriceNum;

    try {
      const paymentResult = await initiateRazorpayPayment({
        bookingRef: refCode,
        orderType: 'henna',
        amount: payAmountNum,
        customerName: clientName.trim(),
        customerEmail: clientEmail.trim(),
        customerPhone: clientPhone.trim(),
        serviceOrProductName: `${serviceTitle} (${paymentOption === 'advance' ? 'Slot Deposit' : 'Full Payment'})`,
        notes: `Date: ${selectedDate}, Slot: ${selectedTime}, Location: ${location}`,
        deliveryAddress: location,
      });

      if (!paymentResult.success) {
        setIsSubmitting(false);
        setFormError(paymentResult.error || 'Payment was cancelled or failed. Please retry.');
        return;
      }

      const verifiedTxnId = paymentResult.razorpay_payment_id || `RZP-PAY-${Date.now()}`;
      const payStatusStr = paymentOption === 'advance' ? `Advance Paid (₹${tokenAmountNum})` : `Paid in Full (${servicePriceVal})`;
      const payAmtStr = paymentOption === 'advance' ? `₹${tokenAmountNum} Deposit` : servicePriceVal;
      const payMethodStr = 'Razorpay (Online Payment)';

      const paymentSpecNotes = `[Payment Info] Status: ${payStatusStr} | Amount: ${payAmtStr} | Method: ${payMethodStr} | Payment ID: ${verifiedTxnId}`;
      compiledNotes = compiledNotes ? `${compiledNotes}\n${paymentSpecNotes}` : paymentSpecNotes;

      const newBooking: HennaBooking = {
        id: `sb-${Date.now()}`,
        ref: refCode,
        serviceName: serviceTitle,
        serviceCategory: selectedCategory === 'mehendi' ? 'Bridal & Occasion Mehendi' : 'Jewellery Rental & Sale',
        date: selectedDate,
        timeSlot: selectedTime,
        location: location,
        clientName: clientName,
        clientEmail: clientEmail,
        phone: clientPhone,
        wa: sameAsPhone ? clientPhone : clientWa,
        specialRequests: compiledNotes,
        artist: selectedCategory === 'mehendi' ? 'Shyam Master Artist' : 'Jewellery Concierge',
        status: 'Confirmed',
        type: selectedCategory === 'mehendi' ? 'henna' : 'jewellery',
        paymentStatus: paymentOption === 'advance' ? 'Advance Paid' : 'Paid',
        paymentAmount: payAmtStr,
        paymentMethod: payMethodStr,
        transactionId: verifiedTxnId,
      };

      setGeneratedRef(refCode);
      setBookingSuccess(true);

      if (selectedCategory === 'jewellery') {
        await insertSupabaseJewelleryBooking({
          bookingRef: refCode,
          clientName: clientName,
          phone: clientPhone,
          email: clientEmail,
          productName: serviceTitle,
          jewelleryId: jewelleryIdVerify || 'PACKAGE-BOOKING',
          bookingType: 'Package',
          startDate: selectedDate,
          endDate: selectedDate,
          totalPrice: servicePriceVal,
          location: location,
          paymentStatus: paymentOption === 'advance' ? 'Advance Paid' : 'Paid',
          paymentMethod: payMethodStr,
          transactionId: verifiedTxnId,
          status: 'Confirmed',
          notes: compiledNotes,
        });
      }

      const result = await onAddBooking(newBooking);
      if (result) {
        setSaveStatus(result);
      } else {
        setSaveStatus({ isConfigured: false, success: false });
      }

      const emailRes = await sendBookingConfirmationEmails({
        ref: refCode,
        clientName: clientName,
        clientEmail: clientEmail,
        clientPhone: clientPhone,
        clientWa: sameAsPhone ? clientPhone : clientWa,
        serviceName: serviceTitle,
        serviceCategory: selectedCategory === 'mehendi' ? 'Bridal & Occasion Mehendi' : 'Jewellery Rental & Sale',
        date: selectedDate,
        timeSlot: selectedTime,
        location: location,
        specialRequests: compiledNotes,
        paymentStatus: payStatusStr,
        paymentAmount: payAmtStr,
        paymentMethod: payMethodStr,
        transactionId: verifiedTxnId,
      });

      setEmailStatus(emailRes);
      setConfirmedBookingCard(newBooking);
      setIsSubmitting(false);

      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error('Razorpay booking payment error:', err);
      setIsSubmitting(false);
      setFormError(err?.message || 'Payment failed. Please retry.');
    }
  };

  useEffect(() => {
    if (initialCategory) {
      setSelectedCategory(initialCategory);
    }
  }, [initialCategory]);

  useEffect(() => {
    if (sameAsPhone) {
      setClientWa(clientPhone);
    }
  }, [sameAsPhone, clientPhone]);

  const filteredPackages = SERVICE_PACKAGES.filter((p) => {
    if (selectedCategory === 'jewellery') return p.category === 'Jewellery Rental & Sale';
    return p.category === 'Bridal & Occasion Mehendi';
  });

  if (confirmedBookingCard) {
    const rawCustWa = (confirmedBookingCard.wa || confirmedBookingCard.phone || '').replace(/\D/g, '');
    const custWaFormatted = rawCustWa.length === 10 ? `91${rawCustWa}` : (rawCustWa || '919363710342');
    const custMessage = `Hello *${confirmedBookingCard.clientName}*! 🎉\n\nYour Mehandi appointment with *Shyam Creations Studio* (Contact: +91 9363710342) is *CONFIRMED & BOOKED*!\n\n📌 *Booking Ref:* ${confirmedBookingCard.ref}\n🌺 *Service:* ${confirmedBookingCard.serviceName}\n📅 *Date:* ${confirmedBookingCard.date}\n⏰ *Time:* ${confirmedBookingCard.timeSlot}\n📍 *Location:* ${confirmedBookingCard.location}\n\nThank you for choosing Shyam Creations Studio!\nStudio Contact: +91 9363710342 / shyamcreationstudio@gmail.com`;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
        <div className="bg-[var(--sc-surface)] text-[var(--sc-text)] w-full max-w-md rounded-[32px] overflow-hidden border-2 border-[var(--sc-border)] shadow-2xl relative my-auto">
          {/* Emerald Header Banner */}
          <div className="bg-gradient-to-b from-[var(--sc-emerald)] to-[var(--sc-emerald-dark)] p-6 text-center text-white relative shadow-md">
            <button
              onClick={() => {
                setConfirmedBookingCard(null);
                setEmailStatus(null);
              }}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center transition-colors cursor-pointer"
              title="Close"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>

            <div className="text-xl mb-1 text-white">✦</div>
            <h2 className="font-serif font-bold text-2xl md:text-3xl text-white tracking-wide">
              Booking Confirmed!
            </h2>
            <p className="text-xs text-white/90 font-medium mt-1">
              Your appointment is reserved
            </p>
          </div>

          {/* Modal Content Body */}
          <div className="p-6 text-center space-y-4">
            <div className="text-3xl">🎊</div>

            <p className="text-sm text-[#4a4235] leading-relaxed">
              Thank you, <strong className="font-bold text-[var(--sc-text)]">{confirmedBookingCard.clientName}</strong>! We'll contact you on <strong className="font-bold text-[var(--sc-text)]">{confirmedBookingCard.phone}</strong> shortly.
            </p>

            <div>
              <span className="bg-[var(--sc-emerald-deep)] text-[#F0E0BF] font-mono text-sm px-6 py-2 rounded-full font-bold tracking-widest inline-block shadow-sm">
                {confirmedBookingCard.ref}
              </span>
            </div>

            {/* Inner Details Table */}
            <div className="bg-[var(--sc-surface)] rounded-2xl border border-[var(--sc-border)] p-4 text-left divide-y divide-[#f2e8db] space-y-2.5 shadow-2xs text-xs">
              <div className="flex items-center justify-between pt-1">
                <span className="font-bold text-[#8A7F72] text-[10px] uppercase tracking-wider">DATE</span>
                <span className="font-semibold text-[var(--sc-text)]">{confirmedBookingCard.date}</span>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="font-bold text-[#8A7F72] text-[10px] uppercase tracking-wider">TIME</span>
                <span className="font-semibold text-[var(--sc-text)]">{confirmedBookingCard.timeSlot}</span>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="font-bold text-[#8A7F72] text-[10px] uppercase tracking-wider">SERVICE</span>
                <span className="font-semibold text-[var(--sc-text)] flex items-center gap-1">
                  <span>🌸</span>
                  <span>{confirmedBookingCard.serviceName}</span>
                </span>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="font-bold text-[#8A7F72] text-[10px] uppercase tracking-wider">OCCASION</span>
                <span className="font-semibold text-[var(--sc-text)]">
                  {selectedCategory === 'mehendi' ? 'Bridal & Occasion Mehendi' : 'Jewellery Service'}
                </span>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="font-bold text-[#8A7F72] text-[10px] uppercase tracking-wider">PHONE</span>
                <span className="font-semibold text-[var(--sc-text)]">{confirmedBookingCard.phone}</span>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="font-bold text-[#8A7F72] text-[10px] uppercase tracking-wider">PAYMENT STATUS</span>
                <span className="font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                  ✓ {confirmedBookingCard.paymentStatus || 'Advance Paid'} ({confirmedBookingCard.paymentAmount || '₹100'})
                </span>
              </div>

              {confirmedBookingCard.transactionId && (
                <div className="flex items-center justify-between pt-2">
                  <span className="font-bold text-[#8A7F72] text-[10px] uppercase tracking-wider">PAYMENT ID</span>
                  <span className="font-mono text-[10px] font-semibold text-[var(--sc-text)] bg-stone-100 px-2 py-0.5 rounded border border-stone-200">
                    {confirmedBookingCard.transactionId}
                  </span>
                </div>
              )}
            </div>

            {/* Automatic Email Confirmation Banner */}
            <div className={`p-3.5 border rounded-2xl text-[11px] text-left space-y-1.5 shadow-xs ${
              emailStatus?.clientEmailSent ? 'bg-emerald-50 border-emerald-200/80 text-emerald-900' : 'bg-amber-50 border-amber-200/80 text-amber-900'
            }`}>
              <div className="flex items-center justify-between font-bold">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base">mark_email_read</span>
                  <span>Email Dispatch Status</span>
                </div>
                <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${
                  emailStatus?.clientEmailSent ? 'bg-emerald-200/80 text-emerald-900' : 'bg-amber-200/80 text-amber-900'
                }`}>
                  {emailStatus?.clientEmailSent ? '✓ Delivered' : '⚠️ Pending'}
                </span>
              </div>
              <p className="text-[10px] leading-snug">
                • Customer ({confirmedBookingCard.clientEmail}): {
                  emailStatus?.clientEmailSent ? (
                    <strong className="text-emerald-900">✓ Sent via EmailJS</strong>
                  ) : (
                    <strong className="text-amber-900">⚠️ {emailStatus?.error || 'Dispatch check required'}</strong>
                  )
                }<br />
                • Admin (shyamcreationstudio@gmail.com): <strong className="text-emerald-900">✓ Sent via EmailJS (template_fqn6e0q)</strong>
              </p>
              {emailStatus?.clientEmailSent ? (
                <p className="text-[9.5px] text-emerald-800/80 italic border-t border-emerald-200/60 pt-1 leading-relaxed">
                  💡 Note: Please advise customer to check their <strong>Spam / Junk / Promotions</strong> folder if the email is not in primary inbox immediately.
                </p>
              ) : (
                <p className="text-[9.5px] text-amber-800/90 italic border-t border-amber-200/60 pt-1 leading-relaxed">
                  💡 <strong>EmailJS Dashboard Checklist:</strong> In EmailJS Dashboard under Template <code className="font-mono bg-amber-100 px-1 py-0.5 rounded">template_v2mtogj</code> → Settings, verify <strong>To Email</strong> is set to <code className="font-mono bg-amber-100 px-1 py-0.5 rounded">&#123;&#123;to_email&#123;&#123;</code>.
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-2.5 pt-2">
              <a
                href={`https://wa.me/${custWaFormatted}?text=${encodeURIComponent(custMessage)}`}
                target="_blank"
                rel="noreferrer"
                className="w-full py-3.5 px-6 bg-[#2C6B4F] hover:bg-[#1F4D3A] text-white font-bold text-sm rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <span>💬</span>
                <span>Chat with us on WhatsApp</span>
              </a>

              <button
                onClick={() => {
                  setConfirmedBookingCard(null);
                  setEmailStatus(null);
                }}
                className="w-full py-3.5 px-6 bg-[var(--sc-emerald-deep)] hover:bg-[var(--sc-emerald-dark)] text-white font-bold text-sm rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <span>Book Another Appointment</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-20 pb-8 px-2 sm:px-4 md:px-8 max-w-5xl mx-auto space-y-6 sm:space-y-8">
      {/* MEHENDI APPOINTMENT FORM */}
      <div className="bg-[var(--sc-surface)] text-[var(--sc-text)] rounded-3xl overflow-hidden border border-[var(--sc-border)] lux-card-shadow">
        {/* Header Banner */}
        <div className="text-center py-10 px-6 space-y-2 bg-[var(--sc-bg-soft)] border-b border-[var(--sc-border)]/60">
          <p className="text-[10px] md:text-xs font-bold tracking-[0.25em] text-[var(--sc-emerald-dark)] uppercase">
            ✦ RESERVE YOUR MEHENDI SLOT ✦
          </p>
          <h1 className="font-serif text-3xl md:text-4xl text-[var(--sc-text)] font-bold tracking-tight">
            Book Mehendi Appointment
          </h1>
          <p className="text-xs md:text-sm text-[var(--sc-text-dim)] max-w-md mx-auto">
            Select your design length, date, and client details to confirm your slot.
          </p>
        </div>

          {/* Form Main Body */}
          <div className="p-4 sm:p-6 md:p-10 bg-[var(--sc-surface)] text-[var(--sc-text)]">
            {!customerUser && (
              <div className="mb-8 p-4 bg-[var(--sc-bg-soft)] border border-[var(--sc-emerald)] rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--sc-emerald)]/10 text-[var(--sc-emerald-dark)] flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-xl">lock_open</span>
                  </div>
                  <div>
                    <h4 className="font-serif font-bold text-sm text-[var(--sc-text)]">Client Sign-in Required to Book</h4>
                    <p className="text-xs text-[var(--sc-text-dim)]">Please sign in or create an account to reserve your slot and receive confirmation updates.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (onRequireAuth) {
                      onRequireAuth({ action: 'mehendi', targetView: 'henna-booking', targetCategory: selectedCategory });
                    }
                  }}
                  className="px-5 py-2.5 bg-[var(--sc-emerald)] hover:bg-[var(--sc-emerald-light)] text-white font-bold rounded-xl text-xs tracking-wider uppercase whitespace-nowrap transition-all shadow-md cursor-pointer shrink-0"
                >
                  Sign In / Sign Up
                </button>
              </div>
            )}

            {bookingSuccess && (
              <div className="p-5 mb-8 bg-[var(--sc-bg-soft)] text-[var(--sc-emerald-dark)] border border-[var(--sc-emerald)] rounded-2xl text-xs font-bold space-y-2 animate-in fade-in duration-300">
                <div className="flex items-center gap-2 text-sm text-[var(--sc-text)]">
                  <span className="material-symbols-outlined text-green-600">check_circle</span>
                  <span>Appointment Confirmed!</span>
                </div>
                <p>Reference Code: <span className="bg-[var(--sc-emerald)] text-white px-2 py-0.5 rounded font-mono font-bold">{generatedRef}</span></p>

                <p className="text-[11px] text-green-700 bg-green-50 p-2 rounded border border-green-200">
                  ✓ Your appointment details have been recorded successfully in our studio system.
                </p>

                <p className="text-[11px] text-[var(--sc-text-dim)] pt-1">Redirecting to My Bookings portal...</p>
              </div>
            )}

            <form onSubmit={handleRazorpayBooking} className="space-y-6 sm:space-y-8 md:space-y-10">

              {/* Form Validation Error Banner */}
              {formError && (
                <div className="p-4 bg-red-50 text-red-900 border border-red-200 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-xs">
                  <span className="material-symbols-outlined text-red-600 text-lg">error</span>
                  <span>{formError}</span>
                </div>
              )}

               {/* SECTION 1: PERSONAL DETAILS */}
               <div className="space-y-4 sm:space-y-6">
                 <div className="flex items-center gap-3">
                   <div className="w-7 h-7 rounded-full bg-[var(--sc-emerald)] text-white font-bold text-xs flex items-center justify-center shrink-0">
                     1
                   </div>
                   <h2 className="font-serif font-bold text-xl md:text-2xl text-[var(--sc-text)]">
                     Personal Details
                   </h2>
                 </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  {/* Full Name */}
                  <div className="space-y-1.5">
                   <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--sc-text)] flex items-center gap-1" title="Required field">
                       FULL NAME *
                     </label>
                    <input
                      type="text"
                      required
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="Priya Sharma"
                      className="w-full px-4 py-3.5 rounded-xl bg-[var(--sc-accent-warm)] border border-[var(--sc-border)] text-xs font-medium text-[var(--sc-text)] focus:outline-none focus:border-[var(--sc-emerald)] focus:bg-[var(--sc-surface)] shadow-xs"
                    />
                  </div>

                  {/* Phone Number */}
                  <div className="space-y-1.5">
                     <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--sc-text)] flex items-center gap-1" title="Required field">
                       PHONE NUMBER *
                     </label>
                    <input
                      type="tel"
                      required
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      placeholder="9876543210"
                      className="w-full px-4 py-3.5 rounded-xl bg-[var(--sc-accent-warm)] border border-[var(--sc-border)] text-xs font-medium text-[var(--sc-text)] focus:outline-none focus:border-[var(--sc-emerald)] focus:bg-[var(--sc-surface)] shadow-xs"
                    />
                  </div>

                  {/* Email Address */}
                  <div className="space-y-1.5">
                     <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--sc-text)] flex items-center gap-1" title="Required field">
                       EMAIL ADDRESS *
                     </label>
                    <input
                      type="email"
                      required
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      placeholder="priya@example.com"
                      className="w-full px-4 py-3.5 rounded-xl bg-[var(--sc-accent-warm)] border border-[var(--sc-border)] text-xs font-medium text-[var(--sc-text)] focus:outline-none focus:border-[var(--sc-emerald)] focus:bg-[var(--sc-surface)] shadow-xs"
                    />
                  </div>

                  {/* WhatsApp Number */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--sc-text)]">
                        WHATSAPP NUMBER <span className="text-[10px] font-normal text-[var(--sc-text-dimmer)]">(if different)</span>
                      </label>
                      <label className="flex items-center gap-1.5 text-[11px] text-[var(--sc-text)] cursor-pointer font-medium">
                        <input
                          type="checkbox"
                          checked={sameAsPhone}
                          onChange={(e) => setSameAsPhone(e.target.checked)}
                          className="rounded text-[var(--sc-emerald)] focus:ring-[var(--sc-emerald)]"
                        />
                        <span>Same as phone</span>
                      </label>
                    </div>
                    <input
                      type="tel"
                      value={sameAsPhone ? clientPhone : clientWa}
                      disabled={sameAsPhone}
                      onChange={(e) => setClientWa(e.target.value)}
                      placeholder="Same as phone"
                      className={`w-full px-4 py-3.5 rounded-xl border text-xs font-medium text-[var(--sc-text)] focus:outline-none focus:border-[var(--sc-emerald)] shadow-xs ${
                        sameAsPhone ? 'bg-[var(--sc-accent-warm)] border-[var(--sc-border)] text-[var(--sc-text-dimmer)]' : 'bg-[var(--sc-accent-warm)] border-[var(--sc-border)] focus:bg-[var(--sc-surface)]'
                      }`}
                    />
                  </div>

                  {/* Occasion Dropdown */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--sc-text)] flex items-center gap-1" title="Required field">
                      OCCASION *
                    </label>
                    <select
                      value={occasion}
                      onChange={(e) => setOccasion(e.target.value)}
                      className="w-full px-4 py-3.5 rounded-xl bg-[var(--sc-accent-warm)] border border-[var(--sc-border)] text-xs font-medium text-[var(--sc-text)] focus:outline-none focus:border-[var(--sc-emerald)] focus:bg-[var(--sc-surface)] shadow-xs cursor-pointer"
                    >
                      <option value="Select Occasion">Select Occasion</option>
                      <option value="Bridal / Wedding">Bridal / Wedding Ceremony</option>
                      <option value="Sangeet & Mehendi Night">Sangeet & Mehendi Night</option>
                      <option value="Engagement">Engagement</option>
                      <option value="Festival & Pooja">Festival & Pooja (Diwali / Karwa Chauth)</option>
                      <option value="Baby Shower / Seemantham">Baby Shower / Seemantham</option>
                      <option value="Other Celebration">Other Celebration</option>
                    </select>
                  </div>

                  {/* Preferred Date */}
                  <div className="space-y-1.5">
                     <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--sc-text)] flex items-center gap-1" title="Required field">
                       PREFERRED DATE *
                     </label>
                    <input
                      type="date"
                      required
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full px-4 py-3.5 rounded-xl bg-[var(--sc-accent-warm)] border border-[var(--sc-border)] text-xs font-medium text-[var(--sc-text)] focus:outline-none focus:border-[var(--sc-emerald)] focus:bg-[var(--sc-surface)] shadow-xs cursor-pointer"
                    />
                  </div>

                  {/* Preferred Time Slot */}
                  <div className="space-y-1.5 md:col-span-2">
                     <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--sc-text)] flex items-center gap-1" title="Required field">
                       TIME SLOT (MORNING / EVENING) *
                     </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setSelectedTime('Morning Slot (09:00 AM - 01:00 PM)')}
                        className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                          selectedTime.includes('Morning')
                            ? 'bg-[var(--sc-emerald)] text-white border-[var(--sc-emerald)] shadow-sm'
                            : 'bg-[var(--sc-accent-warm)] text-[var(--sc-text)] border-[var(--sc-border)] hover:border-[var(--sc-emerald)]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">🌅</span>
                          <div>
                            <div className="font-bold text-xs">Morning Slot</div>
                            <div className={`text-[10px] ${selectedTime.includes('Morning') ? 'text-emerald-100' : 'text-[var(--sc-text-dim)]'}`}>
                              09:00 AM - 01:00 PM
                            </div>
                          </div>
                        </div>
                        {selectedTime.includes('Morning') && (
                          <span className="material-symbols-outlined text-sm">check_circle</span>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedTime('Evening Slot (04:00 PM - 09:00 PM)')}
                        className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                          selectedTime.includes('Evening')
                            ? 'bg-[var(--sc-emerald)] text-white border-[var(--sc-emerald)] shadow-sm'
                            : 'bg-[var(--sc-accent-warm)] text-[var(--sc-text)] border-[var(--sc-border)] hover:border-[var(--sc-emerald)]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">🌙</span>
                          <div>
                            <div className="font-bold text-xs">Evening Slot</div>
                            <div className={`text-[10px] ${selectedTime.includes('Evening') ? 'text-emerald-100' : 'text-[var(--sc-text-dim)]'}`}>
                              04:00 PM - 09:00 PM
                            </div>
                          </div>
                        </div>
                        {selectedTime.includes('Evening') && (
                          <span className="material-symbols-outlined text-sm">check_circle</span>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

               {/* SECTION 2: SELECT SERVICE */}
               <div className="space-y-4 sm:space-y-6 pt-4 sm:pt-6 border-t border-[var(--sc-border)]/60">
                 <div className="flex items-center gap-3">
                   <div className="w-7 h-7 rounded-full bg-[var(--sc-emerald)] text-white font-bold text-xs flex items-center justify-center shrink-0">
                     2
                   </div>
                   <h2 className="font-serif font-bold text-xl md:text-2xl text-[var(--sc-text)]">
                     Select Service
                   </h2>
                 </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                  {MEHENDI_SERVICES.map((srv) => {
                    const isSelected = selectedMehendiService === srv.id;

                    return (
                      <div
                        key={srv.id}
                        onClick={() => setSelectedMehendiService(srv.id)}
                        className={`bg-[var(--sc-surface)] rounded-2xl p-5 border cursor-pointer transition-all flex flex-col justify-between shadow-xs ${
                          isSelected
                            ? 'border-2 border-[var(--sc-emerald)] bg-[var(--sc-bg-soft)] ring-2 ring-[var(--sc-emerald)]/20 shadow-md'
                            : 'border-[var(--sc-border)] hover:border-[var(--sc-emerald)]/60'
                        }`}
                      >
                        <div className="space-y-2">
                          <div className="text-2xl">{srv.icon}</div>
                          <h3 className="font-serif font-bold text-base text-[var(--sc-text)]">
                            {srv.title}
                          </h3>
                          <div className="text-xs font-bold text-[var(--sc-emerald-dark)]">
                            {srv.price}
                          </div>
                          <p className="text-[11px] text-[var(--sc-text-dim)]">
                            {srv.subtext}
                          </p>
                        </div>

                        <div className="pt-4">
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--sc-emerald-dark)] bg-[var(--sc-emerald)]/10 px-3 py-1 rounded-full border border-[var(--sc-emerald)]/20">
                            <span>⏱</span>
                            <span>{srv.duration}</span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

               {/* SECTION 3: ADDITIONAL NOTES */}
               <div className="space-y-4 pt-4 sm:pt-6 border-t border-[var(--sc-border)]/60">
                 <div className="flex items-center gap-3">
                   <div className="w-7 h-7 rounded-full bg-[var(--sc-emerald)] text-white font-bold text-xs flex items-center justify-center shrink-0">
                     3
                   </div>
                   <h2 className="font-serif font-bold text-xl md:text-2xl text-[var(--sc-text)]">
                     Additional Notes <span className="text-xs font-normal text-[var(--sc-text-dimmer)]">(optional)</span>
                   </h2>
                 </div>

                <textarea
                  rows={4}
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                  placeholder="Design preferences, skin allergies, special requirements..."
                  className="w-full p-4 rounded-2xl bg-[var(--sc-accent-warm)] border border-[var(--sc-border)] text-xs font-medium text-[var(--sc-text)] focus:outline-none focus:border-[var(--sc-emerald)] focus:bg-[var(--sc-surface)] shadow-xs"
                />
              </div>

              {/* SECTION 4: PAYMENT & SLOT DEPOSIT */}
              {(() => {
                const selectedMehendiObj = MEHENDI_SERVICES.find((s) => s.id === selectedMehendiService);
                const srvPrice = selectedMehendiObj ? selectedMehendiObj.price : '₹200';
                const isBridal = selectedMehendiService.includes('bridal');
                const defaultAdvance = isBridal ? '₹500' : '₹100';
                const defaultAdvanceNum = isBridal ? 500 : 100;
                const fullPriceNum = parseInt(srvPrice.replace(/[^0-9]/g, ''), 10) || (isBridal ? 2000 : 200);
                const currentPayableAmount = paymentOption === 'advance' ? defaultAdvance : srvPrice;
                const currentPayableNum = paymentOption === 'advance' ? defaultAdvanceNum : fullPriceNum;

                return (
                <div className="space-y-4 sm:space-y-6 pt-4 sm:pt-6 border-t border-[var(--sc-border)]/60">
                     <div className="flex items-center justify-between">
                       <div className="flex items-center gap-3">
                         <div className="w-7 h-7 rounded-full bg-[var(--sc-emerald)] text-white font-bold text-xs flex items-center justify-center shrink-0">
                           4
                         </div>
                        <div>
                          <h2 className="font-serif font-bold text-xl md:text-2xl text-[var(--sc-text)]">
                            Select Payment Method ({currentPayableAmount})
                          </h2>
                          <p className="text-xs text-[var(--sc-text-dim)]">
                            Choose your preferred payment mode to secure your appointment slot.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Deposit Option Selector */}
                    <div className="grid grid-cols-2 gap-3 bg-[var(--sc-accent-warm)] p-1.5 rounded-2xl border border-[var(--sc-border)]">
                      <button
                        type="button"
                        onClick={() => setPaymentOption('advance')}
                        className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                          paymentOption === 'advance'
                            ? 'bg-[var(--sc-emerald)] text-white shadow-xs'
                            : 'text-[var(--sc-text-dim)] hover:text-[var(--sc-text)]'
                        }`}
                      >
                        <span>🛡️ Slot Deposit ({defaultAdvance})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentOption('full')}
                        className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                          paymentOption === 'full'
                            ? 'bg-[var(--sc-emerald)] text-white shadow-xs'
                            : 'text-[var(--sc-text-dim)] hover:text-[var(--sc-text)]'
                        }`}
                      >
                        <span>✨ Full Payment ({srvPrice})</span>
                      </button>
                    </div>

                    <div className="bg-[var(--sc-bg-soft)] border border-[var(--sc-border)] rounded-2xl p-5 space-y-4 shadow-xs">
                        <div className="flex items-center justify-between border-b border-[var(--sc-border)] pb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">💳</span>
                            <div>
                              <h4 className="font-bold text-xs text-[var(--sc-text)]">Razorpay Official Secure Checkout</h4>
                              <p className="text-[11px] text-[var(--sc-text-dim)]">One-click pay via UPI, Google Pay, PhonePe, Paytm, Cards, or NetBanking</p>
                            </div>
                          </div>
                          <span className="bg-emerald-100 text-emerald-800 font-bold text-[10px] px-2.5 py-1 rounded-full border border-emerald-300 flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
                            <span>Instant Confirmation</span>
                          </span>
                        </div>

                        <div className="bg-[var(--sc-surface)] p-4 rounded-xl border border-[var(--sc-border)] flex items-center justify-between text-xs">
                          <div>
                            <span className="text-[var(--sc-text-dim)] text-[11px] block">Amount Payable Now:</span>
                            <strong className="text-lg text-[var(--sc-emerald-dark)]">{currentPayableAmount}</strong>
                            {paymentOption === 'advance' && (
                              <p className="text-[10px] text-[var(--sc-text-dim)]">Remaining balance ({srvPrice} - {defaultAdvance}) can be paid after service completion.</p>
                            )}
                          </div>
                          {/* <div className="text-right">
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                              ✓ Zero manual UTR typing required
                            </span>
                          </div> */}
                        </div>
                      </div>
                  </div>
                );
              })()}

              {/* CONFIRM BUTTON */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 rounded-xl bg-[var(--sc-emerald)] text-white font-bold text-sm hover:bg-[var(--sc-emerald-light)] transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-99 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                      <span>OPENING RAZORPAY SECURE CHECKOUT...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-sm">lock</span>
                      <span>
                        PAY {paymentOption === 'advance' ? (selectedMehendiService.includes('bridal') ? '₹500' : '₹100') : (MEHENDI_SERVICES.find(s => s.id === selectedMehendiService)?.price || '₹200')} VIA RAZORPAY & CONFIRM
                      </span>
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
    </div>
  );
};
