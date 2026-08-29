import React, { useState } from 'react';
import { CustomerAccount, PendingAuthAction } from '../types';
import { signupCustomerAccount, loginCustomerAccount } from '../lib/supabaseService';

interface CustomerAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (user: CustomerAccount, pendingAction?: PendingAuthAction) => void;
  onLoginSuccess?: (user: CustomerAccount, pendingAction?: PendingAuthAction) => void;
  pendingAction?: PendingAuthAction | null;
}

export const CustomerAuthModal: React.FC<CustomerAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onLoginSuccess,
  pendingAction,
}) => {
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanIdentifier = emailOrPhone.trim();
    const cleanPassword = password.trim();

    if (!cleanIdentifier || !cleanPassword) {
      setErrorMessage('Please enter your email or phone number and password.');
      return;
    }

    setLoading(true);
    const res = await loginCustomerAccount(cleanIdentifier, cleanPassword);
    setLoading(false);

    if (res.success && res.user) {
      const loggedInUser = res.user;
      setSuccessMessage(`Welcome back, ${loggedInUser.name}!`);
      
      // Clear sign-in input values immediately
      setEmailOrPhone('');
      setPassword('');

      // Allow the welcome message to be shown clearly, then allocate session and close
      setTimeout(() => {
        if (onLoginSuccess) {
          onLoginSuccess(loggedInUser, pendingAction || undefined);
        } else if (onSuccess) {
          onSuccess(loggedInUser, pendingAction || undefined);
        }
        onClose();
      }, 700);
    } else {
      setErrorMessage(res.error || 'Invalid credentials. Please verify your login details.');
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!name.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 10) {
      setErrorMessage('Please enter a valid 10-digit phone number.');
      return;
    }
    if (!password || password.length < 4) {
      setErrorMessage('Password should be at least 4 characters.');
      return;
    }

    setLoading(true);
    const res = await signupCustomerAccount({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: cleanPhone,
      password: password.trim(),
    });
    setLoading(false);

    if (res.success && res.user) {
      // 1. Clear all sign-up input fields
      setName('');
      setEmail('');
      setPhone('');
      setPassword('');

      // 2. Clear sign-in input fields as requested
      setEmailOrPhone('');

      // 3. Navigate/switch tab to Sign In mode
      setAuthMode('signin');

      // 4. Set successful registration prompt
      setSuccessMessage(`Account registered successfully! Please sign in with your email or phone.`);
      setErrorMessage(null);
    } else {
      setErrorMessage(res.error || 'Failed to create account. Please try again.');
    }
  };

  const fillDemoCredentials = () => {
    setAuthMode('signin');
    setEmailOrPhone('client@shyamcreations.com');
    setPassword('shyam123');
    setErrorMessage(null);
  };

  return (
    <div
      id="customer-auth-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        id="customer-auth-modal"
        className="w-full max-w-md bg-[#1c1c1a] border border-[#c79a3b]/40 rounded-3xl shadow-2xl overflow-hidden text-[#ded8ce] relative animate-in zoom-in-95 duration-200"
      >
        {/* Top Gold Accent Bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#c79a3b] via-[#f3ebd9] to-[#c79a3b]" />

        {/* Modal Header */}
        <div className="p-6 pb-4 flex justify-between items-start border-b border-[#333330]">
          <div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#c79a3b] text-xl">lock_open</span>
              <h3 className="font-serif text-xl md:text-2xl font-bold text-[#f3ebd9]">
                {authMode === 'signin' ? 'Client Sign In' : 'Create Client Account'}
              </h3>
            </div>
            <p className="text-xs text-[#a39c91] mt-1">
              {pendingAction?.action === 'view-price'
                ? 'Sign in to unlock live studio prices & bridal packages'
                : pendingAction?.action === 'mehendi'
                ? 'Sign in to reserve your bridal mehendi appointment slot'
                : pendingAction?.action === 'cart' || pendingAction?.action === 'buy'
                ? 'Sign in to add jewellery to cart and proceed to purchase'
                : pendingAction?.action === 'wishlist'
                ? 'Sign in to save items to your personal wishlist'
                : 'Access member-only pricing, jewellery rentals, and appointment tracking'}
            </p>
          </div>
          <button
            id="btn-close-auth-modal"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-[#2b2b28] text-[#a39c91] hover:text-white transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 p-1.5 bg-[#141413] border-b border-[#333330]">
          <button
            id="tab-btn-signin"
            type="button"
            onClick={() => {
              setAuthMode('signin');
              setErrorMessage(null);
            }}
            className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              authMode === 'signin'
                ? 'bg-[#c79a3b] text-[#1c1c1a] shadow-md'
                : 'text-[#a39c91] hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            id="tab-btn-signup"
            type="button"
            onClick={() => {
              setAuthMode('signup');
              setErrorMessage(null);
            }}
            className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              authMode === 'signup'
                ? 'bg-[#c79a3b] text-[#1c1c1a] shadow-md'
                : 'text-[#a39c91] hover:text-white'
            }`}
          >
            New Account (Sign Up)
          </button>
        </div>

        {/* Feedback Messages */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 bg-red-950/60 border border-red-500/50 rounded-xl text-red-200 text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-red-400 text-sm">error</span>
            <span>{errorMessage}</span>
          </div>
        )}
        {successMessage && (
          <div className="mx-6 mt-4 p-3 bg-emerald-950/60 border border-emerald-500/50 rounded-xl text-emerald-200 text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-400 text-sm">check_circle</span>
            <span>{successMessage}</span>
          </div>
        )}

        {/* Form Body */}
        <div className="p-6">
          {authMode === 'signin' ? (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#ded8ce] mb-1">
                  Email Address or Phone Number
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#807665] text-base">
                    person
                  </span>
                  <input
                    id="input-login-identifier"
                    type="text"
                    required
                    placeholder="e.g. client@shyamcreations.com or 9363710342"
                    value={emailOrPhone}
                    onChange={(e) => setEmailOrPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-[#252522] border border-[#3d3d38] rounded-xl text-xs text-white placeholder-[#807665] focus:outline-none focus:border-[#c79a3b]"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-semibold text-[#ded8ce]">
                    Password
                  </label>
                </div>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#807665] text-base">
                    key
                  </span>
                  <input
                    id="input-login-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter your account password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2.5 bg-[#252522] border border-[#3d3d38] rounded-xl text-xs text-white placeholder-[#807665] focus:outline-none focus:border-[#c79a3b]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-[#807665] hover:text-white cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              <button
                id="btn-submit-signin"
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-[#c79a3b] hover:bg-[#e2bd70] text-[#1c1c1a] font-bold rounded-xl text-xs tracking-wider uppercase transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-base">login</span>
                    <span>Sign In & Unlock Prices</span>
                  </>
                )}
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={fillDemoCredentials}
                  className="text-[11px] text-[#c79a3b] hover:underline cursor-pointer"
                >
                  ⚡ Quick Demo Login (Sanya Alisha / VIP Client)
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSignUp} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#ded8ce] mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#807665] text-base">
                    badge
                  </span>
                  <input
                    id="input-signup-name"
                    type="text"
                    required
                    placeholder="e.g. Sanya Alisha"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-[#252522] border border-[#3d3d38] rounded-xl text-xs text-white placeholder-[#807665] focus:outline-none focus:border-[#c79a3b]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#ded8ce] mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#807665] text-base">
                      mail
                    </span>
                    <input
                      id="input-signup-email"
                      type="email"
                      required
                      placeholder="client@gmail.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-[#252522] border border-[#3d3d38] rounded-xl text-xs text-white placeholder-[#807665] focus:outline-none focus:border-[#c79a3b]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#ded8ce] mb-1">
                    Phone Number (WhatsApp)
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#807665] text-base">
                      phone
                    </span>
                    <input
                      id="input-signup-phone"
                      type="tel"
                      required
                      placeholder="10-digit Mobile"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-[#252522] border border-[#3d3d38] rounded-xl text-xs text-white placeholder-[#807665] focus:outline-none focus:border-[#c79a3b]"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#ded8ce] mb-1">
                  Create Password
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#807665] text-base">
                    lock
                  </span>
                  <input
                    id="input-signup-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Create a password for your account"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2 bg-[#252522] border border-[#3d3d38] rounded-xl text-xs text-white placeholder-[#807665] focus:outline-none focus:border-[#c79a3b]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-[#807665] hover:text-white cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              <p className="text-[10px] text-[#807665] leading-relaxed">
                By registering, your account credentials will be securely saved in the studio database for managing bookings, jewellery wishlist, and orders.
              </p>

              <button
                id="btn-submit-signup"
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-[#c79a3b] hover:bg-[#e2bd70] text-[#1c1c1a] font-bold rounded-xl text-xs tracking-wider uppercase transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
                    <span>Creating Account...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-base">person_add</span>
                    <span>Register & Continue</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
