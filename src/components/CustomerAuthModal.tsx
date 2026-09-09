import React, { useState } from 'react';
import { CustomerAccount, PendingAuthAction } from '../types';
import {
  signupCustomerAccount,
  loginCustomerAccount,
  checkCustomerExists,
  requestCustomerPasswordReset,
  resetCustomerPassword,
} from '../lib/supabaseService';

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
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'forgot_password' | 'reset_password'>('signin');
  
  // Sign In State
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Sign Up State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);

  // Forgot / Reset Password State
  const [resetIdentifier, setResetIdentifier] = useState('');
  const [enteredOtp, setEnteredOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState<string | null>(null);
  const [resetAccountName, setResetAccountName] = useState<string>('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  // General Status
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
      
      setEmailOrPhone('');
      setPassword('');

      setTimeout(() => {
        if (onLoginSuccess) {
          onLoginSuccess(loggedInUser, pendingAction || undefined);
        } else if (onSuccess) {
          onSuccess(loggedInUser, pendingAction || undefined);
        }
        onClose();
      }, 600);
    } else {
      setErrorMessage(res.error || 'Invalid credentials. Please verify your login details.');
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const cleanPass = signupPassword.trim();

    if (!cleanName) {
      setErrorMessage('Please enter your full name.');
      return;
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (cleanPhone.length < 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!cleanPass || cleanPass.length < 4) {
      setErrorMessage('Password should be at least 4 characters.');
      return;
    }

    setLoading(true);
    
    // Proactive duplication check for both email and phone
    const emailCheck = await checkCustomerExists(cleanEmail);
    if (emailCheck.exists) {
      setLoading(false);
      setErrorMessage('An account with this email already exists. Please sign in or reset your password.');
      return;
    }

    const phoneCheck = await checkCustomerExists(cleanPhone);
    if (phoneCheck.exists) {
      setLoading(false);
      setErrorMessage('An account with this mobile phone number already exists. Please sign in or reset your password.');
      return;
    }

    const res = await signupCustomerAccount({
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      password: cleanPass,
    });
    setLoading(false);

    if (res.success && res.user) {
      setName('');
      setEmail('');
      setPhone('');
      setSignupPassword('');
      setEmailOrPhone(cleanEmail);
      setAuthMode('signin');
      setSuccessMessage(`Account registered successfully! Please sign in with your credentials.`);
      setErrorMessage(null);
    } else {
      setErrorMessage(res.error || 'Failed to create account. Please try again.');
    }
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const target = resetIdentifier.trim();
    if (!target) {
      setErrorMessage('Please enter your registered Email address or 10-digit Mobile number.');
      return;
    }

    setLoading(true);
    const res = await requestCustomerPasswordReset(target);
    setLoading(false);

    if (res.success && res.otp) {
      setGeneratedOtp(res.otp);
      setResetAccountName(res.accountName || 'Client');
      setAuthMode('reset_password');
      setSuccessMessage(`Verification OTP generated! Use code ${res.otp} to verify your account.`);
    } else {
      setErrorMessage(res.error || 'No account found with this email or mobile number. Please sign up instead.');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!enteredOtp.trim()) {
      setErrorMessage('Please enter the 6-digit verification code.');
      return;
    }

    if (generatedOtp && enteredOtp.trim() !== generatedOtp.trim()) {
      setErrorMessage('Invalid OTP code. Please check and re-enter the 6-digit code.');
      return;
    }

    if (!newPassword || newPassword.length < 4) {
      setErrorMessage('New password must be at least 4 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('New password and confirmation password do not match.');
      return;
    }

    setLoading(true);
    const res = await resetCustomerPassword(resetIdentifier, newPassword);
    setLoading(false);

    if (res.success) {
      setSuccessMessage('Password changed successfully! You can now log in with your new password.');
      setEmailOrPhone(resetIdentifier);
      setPassword('');
      setGeneratedOtp(null);
      setEnteredOtp('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setAuthMode('signin');
      }, 1000);
    } else {
      setErrorMessage(res.error || 'Failed to update password. Please try again.');
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
        className="w-full max-w-md bg-[var(--sc-surface-alt)] border border-[#E0B45F]/40 rounded-3xl shadow-2xl overflow-hidden text-[#ded8ce] relative animate-in zoom-in-95 duration-200"
      >
        {/* Top Gold Accent Bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#E0B45F] via-[#f3ebd9] to-[#E0B45F]" />

        {/* Modal Header */}
        <div className="p-6 pb-4 flex justify-between items-start border-b border-[#2a2f2b]">
          <div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#E0B45F] text-xl">
                {authMode === 'forgot_password' || authMode === 'reset_password' ? 'lock_reset' : 'lock_open'}
              </span>
              <h3 className="font-serif text-xl md:text-2xl font-bold text-[#f3ebd9]">
                {authMode === 'signin'
                  ? 'Client Sign In'
                  : authMode === 'signup'
                  ? 'Create Client Account'
                  : authMode === 'forgot_password'
                  ? 'Reset Account Password'
                  : 'Verify OTP & Set New Password'}
              </h3>
            </div>
            <p className="text-xs text-[#a39c91] mt-1">
              {pendingAction?.action === 'view-price'
                ? 'Sign in to unlock live studio prices & bridal packages'
                : pendingAction?.action === 'mehendi'
                ? 'Sign in or create account to book your bridal mehendi slot'
                : pendingAction?.action === 'cart' || pendingAction?.action === 'buy'
                ? 'Sign in to access your jewellery cart and complete order'
                : pendingAction?.action === 'wishlist'
                ? 'Sign in to save bridal jewellery to your personal wishlist'
                : authMode === 'forgot_password' || authMode === 'reset_password'
                ? 'Free email & in-app OTP verification to reset your studio password'
                : 'Access member-only pricing, jewellery rentals, and appointment tracking'}
            </p>
          </div>
          <button
            id="btn-close-auth-modal"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-[#1f2421] text-[#a39c91] hover:text-white transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Tab Switcher (Visible in Sign In and Sign Up) */}
        {(authMode === 'signin' || authMode === 'signup') && (
          <div className="grid grid-cols-2 p-1.5 bg-[#101311] border-b border-[#2a2f2b]">
            <button
              id="tab-btn-signin"
              type="button"
              onClick={() => {
                setAuthMode('signin');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                authMode === 'signin'
                  ? 'bg-[#E0B45F] text-[var(--sc-surface-alt)] shadow-md'
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
                setSuccessMessage(null);
              }}
              className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                authMode === 'signup'
                  ? 'bg-[#E0B45F] text-[var(--sc-surface-alt)] shadow-md'
                  : 'text-[#a39c91] hover:text-white'
              }`}
            >
              New Account (Sign Up)
            </button>
          </div>
        )}

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
          {authMode === 'signin' && (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#ded8ce] mb-1">
                  Email Address or Mobile Number
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#8A7F72] text-base">
                    person
                  </span>
                  <input
                    id="input-login-identifier"
                    type="text"
                    required
                    placeholder="e.g. client@shyamcreations.com or 9363710342"
                    value={emailOrPhone}
                    onChange={(e) => setEmailOrPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-[var(--sc-surface-alt-card)] border border-[var(--sc-border-dark)] rounded-xl text-xs text-white placeholder-[#8A7F72] focus:outline-none focus:border-[#E0B45F]"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-semibold text-[#ded8ce]">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('forgot_password');
                      setResetIdentifier(emailOrPhone);
                      setErrorMessage(null);
                      setSuccessMessage(null);
                    }}
                    className="text-[11px] text-[#E0B45F] hover:underline cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#8A7F72] text-base">
                    key
                  </span>
                  <input
                    id="input-login-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter your account password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2.5 bg-[var(--sc-surface-alt-card)] border border-[var(--sc-border-dark)] rounded-xl text-xs text-white placeholder-[#8A7F72] focus:outline-none focus:border-[#E0B45F]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-[#8A7F72] hover:text-white cursor-pointer"
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
                className="w-full py-3 bg-[#E0B45F] hover:bg-[#D4A24C] text-[var(--sc-surface-alt)] font-bold rounded-xl text-xs tracking-wider uppercase transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-base">login</span>
                    <span>Sign In & Continue</span>
                  </>
                )}
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={fillDemoCredentials}
                  className="text-[11px] text-[#E0B45F] hover:underline cursor-pointer"
                >
                  ⚡ Quick Demo Login (Sanya Alisha / VIP Client)
                </button>
              </div>
            </form>
          )}

          {authMode === 'signup' && (
            <form onSubmit={handleSignUp} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#ded8ce] mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#8A7F72] text-base">
                    badge
                  </span>
                  <input
                    id="input-signup-name"
                    type="text"
                    required
                    placeholder="e.g. Sanya Alisha"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-[var(--sc-surface-alt-card)] border border-[var(--sc-border-dark)] rounded-xl text-xs text-white placeholder-[#8A7F72] focus:outline-none focus:border-[#E0B45F]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#ded8ce] mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#8A7F72] text-base">
                      mail
                    </span>
                    <input
                      id="input-signup-email"
                      type="email"
                      required
                      placeholder="client@gmail.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-[var(--sc-surface-alt-card)] border border-[var(--sc-border-dark)] rounded-xl text-xs text-white placeholder-[#8A7F72] focus:outline-none focus:border-[#E0B45F]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#ded8ce] mb-1">
                    Mobile Phone (WhatsApp)
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#8A7F72] text-base">
                      phone
                    </span>
                    <input
                      id="input-signup-phone"
                      type="tel"
                      required
                      placeholder="10-digit Mobile"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-[var(--sc-surface-alt-card)] border border-[var(--sc-border-dark)] rounded-xl text-xs text-white placeholder-[#8A7F72] focus:outline-none focus:border-[#E0B45F]"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#ded8ce] mb-1">
                  Create Password
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#8A7F72] text-base">
                    lock
                  </span>
                  <input
                    id="input-signup-password"
                    type={showSignupPassword ? 'text' : 'password'}
                    required
                    placeholder="Create a password (min 4 characters)"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2 bg-[var(--sc-surface-alt-card)] border border-[var(--sc-border-dark)] rounded-xl text-xs text-white placeholder-[#8A7F72] focus:outline-none focus:border-[#E0B45F]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignupPassword(!showSignupPassword)}
                    className="absolute right-3 top-2.5 text-[#8A7F72] hover:text-white cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">
                      {showSignupPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              <div className="p-2.5 bg-[var(--sc-surface-alt-card)] rounded-xl border border-[#2f342f] text-[11px] text-[#a39c91] flex items-center gap-2">
                <span className="material-symbols-outlined text-[#E0B45F] text-sm">verified_user</span>
                <span>Free Email OTP & Database Verification included</span>
              </div>

              <button
                id="btn-submit-signup"
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-[#E0B45F] hover:bg-[#D4A24C] text-[var(--sc-surface-alt)] font-bold rounded-xl text-xs tracking-wider uppercase transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
                    <span>Checking & Creating...</span>
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

          {authMode === 'forgot_password' && (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#ded8ce] mb-1">
                  Registered Email Address or Mobile Number
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#8A7F72] text-base">
                    search
                  </span>
                  <input
                    id="input-reset-identifier"
                    type="text"
                    required
                    placeholder="Enter email or 10-digit mobile number"
                    value={resetIdentifier}
                    onChange={(e) => setResetIdentifier(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-[var(--sc-surface-alt-card)] border border-[var(--sc-border-dark)] rounded-xl text-xs text-white placeholder-[#8A7F72] focus:outline-none focus:border-[#E0B45F]"
                  />
                </div>
              </div>

              <div className="p-3 bg-[var(--sc-surface-alt-card)] rounded-xl border border-[var(--sc-border-dark)] text-xs text-[#a39c91] space-y-1">
                <div className="flex items-center gap-1.5 text-[#f3ebd9] font-semibold text-[11px]">
                  <span className="material-symbols-outlined text-[#E0B45F] text-sm">mark_email_read</span>
                  <span>Instant Verification Code</span>
                </div>
                <p className="text-[10px] text-[#8A7F72] leading-relaxed">
                  We will generate a 100% free 6-digit OTP code to verify your identity and immediately allow you to set a new password.
                </p>
              </div>

              <button
                id="btn-submit-request-otp"
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-[#E0B45F] hover:bg-[#D4A24C] text-[var(--sc-surface-alt)] font-bold rounded-xl text-xs tracking-wider uppercase transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
                    <span>Verifying Account...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-base">key</span>
                    <span>Send Verification Code</span>
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('signin');
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className="text-xs text-[#a39c91] hover:text-[#f3ebd9] flex items-center justify-center gap-1 mx-auto cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">arrow_back</span>
                  <span>Back to Sign In</span>
                </button>
              </div>
            </form>
          )}

          {authMode === 'reset_password' && (
            <form onSubmit={handleResetPassword} className="space-y-3.5">
              {generatedOtp && (
                <div className="p-3 bg-[#2d291e] border border-[#E0B45F]/60 rounded-xl text-center">
                  <div className="text-[10px] text-[#E0B45F] uppercase font-bold tracking-widest">
                    Verification OTP for {resetAccountName}
                  </div>
                  <div className="text-2xl font-mono font-bold tracking-widest text-[#f3ebd9] my-1">
                    {generatedOtp}
                  </div>
                  <button
                    type="button"
                    onClick={() => setEnteredOtp(generatedOtp)}
                    className="text-[11px] text-[#E0B45F] underline cursor-pointer hover:text-white"
                  >
                    Click to Auto-fill OTP
                  </button>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#ded8ce] mb-1">
                  Enter 6-Digit OTP Code
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#8A7F72] text-base">
                    pin
                  </span>
                  <input
                    id="input-entered-otp"
                    type="text"
                    required
                    maxLength={6}
                    placeholder="Enter 6-digit OTP code"
                    value={enteredOtp}
                    onChange={(e) => setEnteredOtp(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-[var(--sc-surface-alt-card)] border border-[var(--sc-border-dark)] rounded-xl text-xs font-mono text-white placeholder-[#8A7F72] focus:outline-none focus:border-[#E0B45F]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#ded8ce] mb-1">
                  New Password
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#8A7F72] text-base">
                    lock
                  </span>
                  <input
                    id="input-new-password"
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter new password (min 4 characters)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2 bg-[var(--sc-surface-alt-card)] border border-[var(--sc-border-dark)] rounded-xl text-xs text-white placeholder-[#8A7F72] focus:outline-none focus:border-[#E0B45F]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-2.5 text-[#8A7F72] hover:text-white cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">
                      {showNewPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#ded8ce] mb-1">
                  Confirm New Password
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#8A7F72] text-base">
                    lock_reset
                  </span>
                  <input
                    id="input-confirm-password"
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    placeholder="Re-type new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-[var(--sc-surface-alt-card)] border border-[var(--sc-border-dark)] rounded-xl text-xs text-white placeholder-[#8A7F72] focus:outline-none focus:border-[#E0B45F]"
                  />
                </div>
              </div>

              <button
                id="btn-submit-reset-password"
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-[#E0B45F] hover:bg-[#D4A24C] text-[var(--sc-surface-alt)] font-bold rounded-xl text-xs tracking-wider uppercase transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-base">check_circle</span>
                    <span>Save New Password & Sign In</span>
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('signin');
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className="text-xs text-[#a39c91] hover:text-[#f3ebd9] flex items-center justify-center gap-1 mx-auto cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">arrow_back</span>
                  <span>Back to Sign In</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
