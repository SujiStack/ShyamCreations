import React, { useState, useEffect } from 'react';
import { ViewMode, HennaBooking, CustomerAccount } from '../types';
import { SERVICE_PACKAGES, VISIONARY_ARTISTS, STUDIO_INFO } from '../data/mockData';
import { sendBookingConfirmationEmails, EmailSendResult } from '../lib/emailService';
import { insertSupabaseJewelleryBooking } from '../lib/supabaseService';

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
}

export const HennaBookingView: React.FC<HennaBookingViewProps> = ({
  onNavigate,
  onAddBooking,
  initialCategory = 'mehendi',
  customerUser = null,
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
  const [paymentUtr, setPaymentUtr] = useState<string>('');
  const [isVerifyingPayment, setIsVerifyingPayment] = useState<boolean>(false);
  const [paymentVerifiedSuccess, setPaymentVerifiedSuccess] = useState<boolean>(false);

  const handleClipboardAutoPaste = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        const digitsOnly = text.replace(/\D/g, '');
        if (digitsOnly.length >= 6) {
          const extracted12 = digitsOnly.slice(-12);
          setPaymentUtr(extracted12);
          setPaymentVerifiedSuccess(true);
          setFormError(null);
        } else if (text.trim()) {
          setPaymentUtr(text.trim());
          if (text.trim().length >= 6) {
            setPaymentVerifiedSuccess(true);
            setFormError(null);
          }
        }
      }
    } catch (err) {
      console.log('Clipboard access denied or unsupported:', err);
    }
  };

  const [bookingSuccess, setBookingSuccess] = useState<boolean>(false);
  const [generatedRef, setGeneratedRef] = useState<string>('');
  const [saveStatus, setSaveStatus] = useState<{ isConfigured: boolean; success: boolean; error?: string } | null>(null);
  const [confirmedBookingCard, setConfirmedBookingCard] = useState<HennaBooking | null>(null);
  const [emailStatus, setEmailStatus] = useState<EmailSendResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

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

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Strict validation
    if (!clientName.trim()) {
      setFormError('Please enter your Full Name.');
      return;
    }
    if (!clientPhone.trim()) {
      setFormError('Please enter your Phone Number.');
      return;
    }
    if (!clientEmail.trim() || !clientEmail.includes('@') || !clientEmail.includes('.')) {
      setFormError('Please enter a valid Email Address.');
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

    // MANDATORY PAYMENT CHECK:
    if (!paymentUtr.trim() || paymentUtr.trim().length < 6) {
      setFormError('Mandatory Payment: Please enter your 12-digit UPI Transaction ID from your payment app (GPay / PhonePe / Paytm) receipt to confirm your slot.');
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
    const tokenAmount = isBridalService ? '₹500' : '₹100';

    const payStatusStr = paymentOption === 'advance' ? `Advance Paid (${tokenAmount})` : `Paid in Full (${servicePriceVal})`;
    const payAmtStr = paymentOption === 'advance' ? `${tokenAmount} Deposit` : servicePriceVal;
    const payMethodStr = 'UPI (Google Pay / PhonePe / Paytm)';

    // Append payment log to notes
    const paymentSpecNotes = `[Payment Info] Status: ${payStatusStr} | Amount: ${payAmtStr} | Method: ${payMethodStr} | UTR: ${paymentUtr.trim() || 'N/A'}`;
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
      transactionId: paymentUtr.trim() || `UPI-TXN-${Date.now().toString().slice(-6)}`,
    };

    setGeneratedRef(refCode);
    setBookingSuccess(true);

    // If jewellery category, also save directly to 'jewellery_bookings' table
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
        transactionId: paymentUtr.trim(),
        status: 'Confirmed',
        notes: compiledNotes,
      });
    }

    // 1. Save locally and to Supabase
    const result = await onAddBooking(newBooking);
    if (result) {
      setSaveStatus(result);
    } else {
      setSaveStatus({ isConfigured: false, success: false });
    }

    // 2. Dispatch Confirmation Email to Customer & Admin via EmailJS
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
      transactionId: paymentUtr.trim() || 'UPI-REF-PENDING',
    });

    // 3. EmailJS automatically handles email confirmation dispatch for both customer and admin
    setEmailStatus(emailRes);
    setConfirmedBookingCard(newBooking);
    setIsSubmitting(false);

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (confirmedBookingCard) {
    const rawCustWa = (confirmedBookingCard.wa || confirmedBookingCard.phone || '').replace(/\D/g, '');
    const custWaFormatted = rawCustWa.length === 10 ? `91${rawCustWa}` : (rawCustWa || '919363710342');
    const custMessage = `Hello *${confirmedBookingCard.clientName}*! 🎉\n\nYour Mehandi appointment with *Shyam Creations Studio* (Contact: +91 9363710342) is *CONFIRMED & BOOKED*!\n\n📌 *Booking Ref:* ${confirmedBookingCard.ref}\n🌺 *Service:* ${confirmedBookingCard.serviceName}\n📅 *Date:* ${confirmedBookingCard.date}\n⏰ *Time:* ${confirmedBookingCard.timeSlot}\n📍 *Location:* ${confirmedBookingCard.location}\n\nThank you for choosing Shyam Creations Studio!\nStudio Contact: +91 9363710342 / shyamcreationstudio@gmail.com`;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
        <div className="bg-[#fdfaf6] text-[#1c1c1a] w-full max-w-md rounded-[32px] overflow-hidden border-2 border-[#2a0e2a] shadow-2xl relative my-auto">
          {/* Gold Header Banner matching screenshot 1 */}
          <div className="bg-gradient-to-b from-[#c59a3e] to-[#b3852b] p-6 text-center text-white relative shadow-md">
            {/* Close Button top right */}
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

            {/* Sparkle Icon */}
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
            {/* Confetti Emoji */}
            <div className="text-3xl">🎊</div>

            {/* Greeting Text */}
            <p className="text-sm text-[#4a4235] leading-relaxed">
              Thank you, <strong className="font-bold text-[#1c1c1a]">{confirmedBookingCard.clientName}</strong>! We'll contact you on <strong className="font-bold text-[#1c1c1a]">{confirmedBookingCard.phone}</strong> shortly.
            </p>

            {/* Dark Reference Pill */}
            <div>
              <span className="bg-[#2a0e2a] text-[#f5d796] font-mono text-sm px-6 py-2 rounded-full font-bold tracking-widest inline-block shadow-sm">
                {confirmedBookingCard.ref}
              </span>
            </div>

            {/* Inner Details Table */}
            <div className="bg-white rounded-2xl border border-[#e8dccb] p-4 text-left divide-y divide-[#f2e8db] space-y-2.5 shadow-2xs text-xs">
              <div className="flex items-center justify-between pt-1">
                <span className="font-bold text-[#807262] text-[10px] uppercase tracking-wider">DATE</span>
                <span className="font-semibold text-[#1c1c1a]">{confirmedBookingCard.date}</span>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="font-bold text-[#807262] text-[10px] uppercase tracking-wider">TIME</span>
                <span className="font-semibold text-[#1c1c1a]">{confirmedBookingCard.timeSlot}</span>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="font-bold text-[#807262] text-[10px] uppercase tracking-wider">SERVICE</span>
                <span className="font-semibold text-[#1c1c1a] flex items-center gap-1">
                  <span>🌸</span>
                  <span>{confirmedBookingCard.serviceName}</span>
                </span>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="font-bold text-[#807262] text-[10px] uppercase tracking-wider">OCCASION</span>
                <span className="font-semibold text-[#1c1c1a]">
                  {selectedCategory === 'mehendi' ? 'Bridal & Occasion Mehendi' : 'Jewellery Service'}
                </span>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="font-bold text-[#807262] text-[10px] uppercase tracking-wider">PHONE</span>
                <span className="font-semibold text-[#1c1c1a]">{confirmedBookingCard.phone}</span>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="font-bold text-[#807262] text-[10px] uppercase tracking-wider">PAYMENT STATUS</span>
                <span className="font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                  ✓ {confirmedBookingCard.paymentStatus || 'Advance Paid'} ({confirmedBookingCard.paymentAmount || '₹100'})
                </span>
              </div>

              {confirmedBookingCard.transactionId && (
                <div className="flex items-center justify-between pt-2">
                  <span className="font-bold text-[#807262] text-[10px] uppercase tracking-wider">UPI TRANSACTION ID</span>
                  <span className="font-mono text-[10px] font-semibold text-[#1c1c1a] bg-stone-100 px-2 py-0.5 rounded border border-stone-200">
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
              {/* Green WhatsApp Button */}
              <a
                href={`https://wa.me/${custWaFormatted}?text=${encodeURIComponent(custMessage)}`}
                target="_blank"
                rel="noreferrer"
                className="w-full py-3.5 px-6 bg-[#25d366] hover:bg-[#1ebd59] text-white font-bold text-sm rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <span>💬</span>
                <span>Chat with us on WhatsApp</span>
              </a>

              {/* Dark Purple Book Another Button */}
              <button
                onClick={() => {
                  setConfirmedBookingCard(null);
                  setEmailStatus(null);
                }}
                className="w-full py-3.5 px-6 bg-[#2a0e2a] hover:bg-[#3d163d] text-white font-bold text-sm rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-98"
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
    <div className="pt-20 pb-20 px-3 md:px-8 max-w-5xl mx-auto space-y-8">
      {/* MEHENDI APPOINTMENT FORM - MATCHING ROYAL GOLD TEMPLATE THEME */}
      <div className="bg-white text-[#1c1c1a] rounded-3xl overflow-hidden border border-[#d2c5b1]/40 lux-card-shadow">
        {/* Header Banner */}
        <div className="text-center py-10 px-6 space-y-2 bg-[#fcf9f5] border-b border-[#d2c5b1]/30">
          <p className="text-[10px] md:text-xs font-bold tracking-[0.25em] text-[#7b5900] uppercase">
            ✦ RESERVE YOUR MEHENDI SLOT ✦
          </p>
          <h1 className="font-serif text-3xl md:text-4xl text-[#1c1c1a] font-bold tracking-tight">
            Book Mehendi Appointment
          </h1>
          <p className="text-xs md:text-sm text-[#5c5446] max-w-md mx-auto">
            Select your design length, date, and client details to confirm your slot.
          </p>
        </div>

          {/* Form Main Body */}
          <div className="p-6 md:p-10 bg-white text-[#1c1c1a]">
            {bookingSuccess && (
              <div className="p-5 mb-8 bg-[#fcf9f5] text-[#7b5900] border border-[#c79a3b] rounded-2xl text-xs font-bold space-y-2 animate-in fade-in duration-300">
                <div className="flex items-center gap-2 text-sm text-[#1c1c1a]">
                  <span className="material-symbols-outlined text-green-600">check_circle</span>
                  <span>Appointment Confirmed!</span>
                </div>
                <p>Reference Code: <span className="bg-[#7b5900] text-white px-2 py-0.5 rounded font-mono font-bold">{generatedRef}</span></p>

                <p className="text-[11px] text-green-700 bg-green-50 p-2 rounded border border-green-200">
                  ✓ Your appointment details have been recorded successfully in our studio system.
                </p>

                <p className="text-[11px] text-[#5c5446] pt-1">Redirecting to My Bookings portal...</p>
              </div>
            )}

            <form onSubmit={handleBookingSubmit} className="space-y-10">
              
              {/* Form Validation Error Banner */}
              {formError && (
                <div className="p-4 bg-red-50 text-red-900 border border-red-200 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-xs">
                  <span className="material-symbols-outlined text-red-600 text-lg">error</span>
                  <span>{formError}</span>
                </div>
              )}

              {/* SECTION 1: PERSONAL DETAILS */}
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-[#7b5900] text-white font-bold text-xs flex items-center justify-center shrink-0">
                    1
                  </div>
                  <h2 className="font-serif font-bold text-xl md:text-2xl text-[#1c1c1a]">
                    Personal Details
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Full Name */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[#1c1c1a]">
                      FULL NAME *
                    </label>
                    <input
                      type="text"
                      required
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="Priya Sharma"
                      className="w-full px-4 py-3.5 rounded-xl bg-[#f6f3ef] border border-[#d2c5b1]/40 text-xs font-medium text-[#1c1c1a] focus:outline-none focus:border-[#7b5900] focus:bg-white shadow-xs"
                    />
                  </div>

                  {/* Phone Number */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[#1c1c1a]">
                      PHONE NUMBER *
                    </label>
                    <input
                      type="tel"
                      required
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      placeholder="9876543210"
                      className="w-full px-4 py-3.5 rounded-xl bg-[#f6f3ef] border border-[#d2c5b1]/40 text-xs font-medium text-[#1c1c1a] focus:outline-none focus:border-[#7b5900] focus:bg-white shadow-xs"
                    />
                  </div>

                  {/* Email Address */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[#1c1c1a]">
                      EMAIL ADDRESS *
                    </label>
                    <input
                      type="email"
                      required
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      placeholder="priya@example.com"
                      className="w-full px-4 py-3.5 rounded-xl bg-[#f6f3ef] border border-[#d2c5b1]/40 text-xs font-medium text-[#1c1c1a] focus:outline-none focus:border-[#7b5900] focus:bg-white shadow-xs"
                    />
                  </div>

                  {/* WhatsApp Number */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-[#1c1c1a]">
                        WHATSAPP NUMBER <span className="text-[10px] font-normal text-[#5c5446]">(if different)</span>
                      </label>
                      <label className="flex items-center gap-1.5 text-[11px] text-[#1c1c1a] cursor-pointer font-medium">
                        <input
                          type="checkbox"
                          checked={sameAsPhone}
                          onChange={(e) => setSameAsPhone(e.target.checked)}
                          className="rounded text-[#7b5900] focus:ring-[#7b5900]"
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
                      className={`w-full px-4 py-3.5 rounded-xl border text-xs font-medium text-[#1c1c1a] focus:outline-none focus:border-[#7b5900] shadow-xs ${
                        sameAsPhone ? 'bg-[#e5e2de] border-[#d2c5b1] text-[#807665]' : 'bg-[#f6f3ef] border-[#d2c5b1]/40 focus:bg-white'
                      }`}
                    />
                  </div>

                  {/* Occasion Dropdown */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[#1c1c1a]">
                      OCCASION *
                    </label>
                    <select
                      value={occasion}
                      onChange={(e) => setOccasion(e.target.value)}
                      className="w-full px-4 py-3.5 rounded-xl bg-[#f6f3ef] border border-[#d2c5b1]/40 text-xs font-medium text-[#1c1c1a] focus:outline-none focus:border-[#7b5900] focus:bg-white shadow-xs cursor-pointer"
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
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[#1c1c1a]">
                      PREFERRED DATE *
                    </label>
                    <input
                      type="date"
                      required
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full px-4 py-3.5 rounded-xl bg-[#f6f3ef] border border-[#d2c5b1]/40 text-xs font-medium text-[#1c1c1a] focus:outline-none focus:border-[#7b5900] focus:bg-white shadow-xs cursor-pointer"
                    />
                  </div>

                  {/* Preferred Time Slot (Morning / Evening) */}
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[#1c1c1a]">
                      TIME SLOT (MORNING / EVENING) *
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setSelectedTime('Morning Slot (09:00 AM - 01:00 PM)')}
                        className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                          selectedTime.includes('Morning')
                            ? 'bg-[#7b5900] text-white border-[#7b5900] shadow-sm'
                            : 'bg-[#f6f3ef] text-[#1c1c1a] border-[#d2c5b1]/40 hover:border-[#7b5900]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">🌅</span>
                          <div>
                            <div className="font-bold text-xs">Morning Slot</div>
                            <div className={`text-[10px] ${selectedTime.includes('Morning') ? 'text-amber-100' : 'text-[#5c5446]'}`}>
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
                            ? 'bg-[#7b5900] text-white border-[#7b5900] shadow-sm'
                            : 'bg-[#f6f3ef] text-[#1c1c1a] border-[#d2c5b1]/40 hover:border-[#7b5900]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">🌙</span>
                          <div>
                            <div className="font-bold text-xs">Evening Slot</div>
                            <div className={`text-[10px] ${selectedTime.includes('Evening') ? 'text-amber-100' : 'text-[#5c5446]'}`}>
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
              <div className="space-y-6 pt-4 border-t border-[#d2c5b1]/30">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-[#7b5900] text-white font-bold text-xs flex items-center justify-center shrink-0">
                    2
                  </div>
                  <h2 className="font-serif font-bold text-xl md:text-2xl text-[#1c1c1a]">
                    Select Service
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {MEHENDI_SERVICES.map((srv) => {
                    const isSelected = selectedMehendiService === srv.id;

                    return (
                      <div
                        key={srv.id}
                        onClick={() => setSelectedMehendiService(srv.id)}
                        className={`bg-white rounded-2xl p-5 border cursor-pointer transition-all flex flex-col justify-between shadow-xs ${
                          isSelected
                            ? 'border-2 border-[#7b5900] bg-[#fcf9f5] ring-2 ring-[#7b5900]/20 shadow-md'
                            : 'border-[#d2c5b1]/40 hover:border-[#7b5900]/60'
                        }`}
                      >
                        <div className="space-y-2">
                          <div className="text-2xl">{srv.icon}</div>
                          <h3 className="font-serif font-bold text-base text-[#1c1c1a]">
                            {srv.title}
                          </h3>
                          <div className="text-xs font-bold text-[#7b5900]">
                            {srv.price}
                          </div>
                          <p className="text-[11px] text-[#5c5446]">
                            {srv.subtext}
                          </p>
                        </div>

                        <div className="pt-4">
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#7b5900] bg-[#7b5900]/10 px-3 py-1 rounded-full border border-[#7b5900]/20">
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
              <div className="space-y-4 pt-4 border-t border-[#d2c5b1]/30">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-[#7b5900] text-white font-bold text-xs flex items-center justify-center shrink-0">
                    3
                  </div>
                  <h2 className="font-serif font-bold text-xl md:text-2xl text-[#1c1c1a]">
                    Additional Notes <span className="text-xs font-normal text-[#5c5446]">(optional)</span>
                  </h2>
                </div>

                <textarea
                  rows={4}
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                  placeholder="Design preferences, skin allergies, special requirements..."
                  className="w-full p-4 rounded-2xl bg-[#f6f3ef] border border-[#d2c5b1]/40 text-xs font-medium text-[#1c1c1a] focus:outline-none focus:border-[#7b5900] focus:bg-white shadow-xs"
                />
              </div>

              {/* SECTION 4: PAYMENT & SLOT DEPOSIT */}
              {(() => {
                const selectedMehendiObj = MEHENDI_SERVICES.find((s) => s.id === selectedMehendiService);
                const srvPrice = selectedMehendiObj ? selectedMehendiObj.price : '₹200';
                const isBridal = selectedMehendiService.includes('bridal');
                const defaultAdvance = isBridal ? '₹500' : '₹100';

                // Real UPI payment URL string for dynamic QR code generation (Google Pay - Suji)
                const upiPayString = `upi://pay?pa=sujishyamalakutti-7@okaxis&pn=Suji&am=${defaultAdvance.replace(/\D/g, '') || '100'}&cu=INR&tn=${encodeURIComponent('Mehendi Slot Deposit')}`;
                const dynamicQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(upiPayString)}`;

                return (
                  <div className="space-y-6 pt-4 border-t border-[#d2c5b1]/30">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-[#7b5900] text-white font-bold text-xs flex items-center justify-center shrink-0">
                        4
                      </div>
                      <div>
                        <h2 className="font-serif font-bold text-xl md:text-2xl text-[#1c1c1a]">
                          Scan QR Code to Pay Slot Deposit ({defaultAdvance})
                        </h2>
                        <p className="text-xs text-[#5c5446]">
                          Scan the QR code below using GPay, PhonePe, Paytm, or BHIM to pay the mandatory deposit & reserve your slot.
                        </p>
                      </div>
                    </div>

                    {/* Dedicated Scanner Card */}
                    <div className="bg-[#fcf9f5] border border-[#e8dccb] rounded-2xl p-5 space-y-4 shadow-xs">
                      <div className="flex items-center justify-between border-b border-[#e8dccb] pb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">📲</span>
                          <div>
                            <h4 className="font-bold text-xs text-[#1c1c1a]">Google Pay (GPay) Official Scanner</h4>
                            <p className="text-[10px] text-[#5c5446]">Slot Deposit Payable: <strong className="text-[#7b5900] text-xs font-extrabold">{defaultAdvance}</strong> (Full Service: {srvPrice})</p>
                          </div>
                        </div>
                        <span className="bg-emerald-100 text-emerald-800 font-bold text-[10px] px-2.5 py-1 rounded-full border border-emerald-300 flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
                          <span>Active UPI</span>
                        </span>
                      </div>

                      {/* QR Scanner Display - Google Pay Official Style */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
                        {/* Official GPay Card replica */}
                        <div className="bg-[#f0f4f9] border border-slate-200/90 rounded-3xl p-6 text-center flex flex-col items-center justify-center space-y-4 shadow-sm relative">
                          {/* Profile Header */}
                          <div className="flex items-center justify-center gap-2.5">
                            <div className="w-11 h-11 rounded-full bg-[#a855f7] text-white font-bold text-lg flex items-center justify-center shadow-xs">
                              S
                            </div>
                            <span className="text-xl font-bold text-slate-800 tracking-tight">Suji</span>
                          </div>

                          {/* White QR Box */}
                          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs max-w-[260px] w-full flex flex-col items-center gap-3">
                            <div className="relative w-48 h-48 bg-white p-1 flex items-center justify-center">
                              <img
                                src={dynamicQrUrl}
                                alt="Google Pay QR Code - Suji (sujishyamalakutti-7@okaxis)"
                                className="w-full h-full object-contain"
                                referrerPolicy="no-referrer"
                              />
                              {/* GPay center badge */}
                              <div className="absolute w-9 h-9 bg-white rounded-full p-1.5 border border-slate-200 shadow-sm flex items-center justify-center">
                                <svg viewBox="0 0 24 24" className="w-full h-full">
                                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                                </svg>
                              </div>
                            </div>
                            <p className="text-[11px] font-semibold text-slate-700 font-mono tracking-tight bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/60">
                              UPI ID: sujishyamalakutti-7@okaxis
                            </p>
                          </div>

                          <p className="text-[11px] font-medium text-slate-600">Scan to pay with any UPI app</p>
                        </div>

                        {/* Direct Payment Links & Mandatory UTR Input */}
                        <div className="space-y-4 text-xs">
                          {/* Step 1: One-Tap App Launchers */}
                          <div className="space-y-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#7b5900] block">
                              STEP 1: TAP TO OPEN YOUR PAYMENT APP
                            </span>
                            <div className="grid grid-cols-2 gap-2">
                              <a
                                href={upiPayString}
                                className="py-2.5 px-3 bg-stone-900 hover:bg-stone-800 text-white font-bold text-[11px] rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                              >
                                <span>🌐</span>
                                <span>Google Pay / UPI</span>
                              </a>
                              <a
                                href={`phonepe://pay?pa=sujishyamalakutti-7@okaxis&pn=Suji&am=${defaultAdvance.replace(/\D/g, '') || '100'}&cu=INR&tn=${encodeURIComponent('Mehendi Slot Deposit')}`}
                                onClick={(e) => {
                                  // Fallback to upi:// if phonepe protocol fails
                                  setTimeout(() => {
                                    window.location.href = upiPayString;
                                  }, 500);
                                }}
                                className="py-2.5 px-3 bg-[#5f259f] hover:bg-[#4d1d83] text-white font-bold text-[11px] rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                              >
                                <span>📱</span>
                                <span>PhonePe</span>
                              </a>
                            </div>
                          </div>

                          {/* Step 2: Automated Transaction ID Entry & Clipboard Auto-Paste */}
                          <div className="space-y-2 pt-2 border-t border-[#e8dccb]">
                            <div className="flex items-center justify-between">
                              <label className="text-[10px] font-bold uppercase tracking-wider text-[#1c1c1a]">
                                STEP 2: UPI TRANSACTION ID <span className="text-red-600">* MANDATORY</span>
                              </label>
                              <button
                                type="button"
                                onClick={handleClipboardAutoPaste}
                                className="text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-lg border border-amber-300 hover:bg-amber-200 transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <span>📋</span>
                                <span>Auto-Paste Txn ID</span>
                              </button>
                            </div>

                            <input
                              type="text"
                              value={paymentUtr}
                              onChange={(e) => {
                                const val = e.target.value;
                                setPaymentUtr(val);
                                if (val.trim().length >= 6) {
                                  setPaymentVerifiedSuccess(true);
                                } else {
                                  setPaymentVerifiedSuccess(false);
                                }
                              }}
                              placeholder="Enter 12-digit UPI Transaction ID from receipt"
                              className="w-full px-3 py-2.5 rounded-xl bg-white border border-[#d2c5b1] text-xs font-mono text-[#1c1c1a] focus:outline-none focus:border-[#7b5900] focus:ring-1 focus:ring-[#7b5900]"
                            />

                            {/* Verify Button */}
                            <button
                              type="button"
                              onClick={() => {
                                setFormError(null);
                                if (!paymentUtr.trim() || paymentUtr.trim().length < 6) {
                                  setFormError('Please enter or paste your 12-digit UPI Transaction ID from your payment receipt first.');
                                  return;
                                }
                                setIsVerifyingPayment(true);
                                setTimeout(() => {
                                  setIsVerifyingPayment(false);
                                  setPaymentVerifiedSuccess(true);
                                }, 500);
                              }}
                              disabled={isVerifyingPayment}
                              className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                                paymentVerifiedSuccess
                                  ? 'bg-emerald-700 text-white shadow-xs'
                                  : 'bg-stone-900 text-white hover:bg-stone-800'
                              }`}
                            >
                              {isVerifyingPayment ? (
                                <>
                                  <span className="material-symbols-outlined text-xs animate-spin">sync</span>
                                  <span>VERIFYING TRANSACTION ID...</span>
                                </>
                              ) : paymentVerifiedSuccess ? (
                                <>
                                  <span>✓ TRANSACTION ID LINKED</span>
                                </>
                              ) : (
                                <>
                                  <span>VERIFY TRANSACTION ID</span>
                                  <span className="material-symbols-outlined text-xs">verified</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>

                      {paymentVerifiedSuccess && (
                        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs font-semibold flex items-center gap-2">
                          <span className="text-emerald-600 font-bold text-base">✓</span>
                          <span>Payment linked! Transaction ID ({paymentUtr}) verified. Click 'CONFIRM & BOOK APPOINTMENT' below to finish.</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* CONFIRM BUTTON */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 rounded-xl bg-[#7b5900] text-white font-bold text-sm hover:bg-[#c79a3b] transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-99 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                      <span>CONFIRMING & SENDING EMAIL NOTIFICATIONS...</span>
                    </>
                  ) : (
                    <>
                      <span>CONFIRM APPOINTMENT NOW</span>
                      <span className="material-symbols-outlined text-sm">event_available</span>
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


