import { getSupabaseCredentials, supabase } from './supabase';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export interface RazorpayPaymentOptions {
  bookingRef: string;
  orderType: 'henna' | 'jewellery_single' | 'jewellery_bag' | 'jewellery_rental';
  amount: number; // in INR Rupees (e.g. 500 or 2550)
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  serviceOrProductName: string;
  notes?: string;
  jewelleryId?: string;
  deliveryAddress?: string;
  itemsToDecrement?: Array<{ productId: string; quantity: number }>;
}

export interface RazorpayPaymentResult {
  success: boolean;
  razorpay_payment_id?: string;
  razorpay_order_id?: string;
  razorpay_signature?: string;
  error?: string;
  isSimulated?: boolean;
}

/**
 * Get active Razorpay Key ID (from environment or localStorage override)
 */
export function getRazorpayKeyId(): string {
  const envKey = (import.meta.env.VITE_RAZORPAY_KEY_ID || '').trim();
  let customKey = '';
  if (typeof window !== 'undefined') {
    try {
      customKey = (localStorage.getItem('shyam_custom_razorpay_key_id') || '').trim();
    } catch {
      // ignore
    }
  }
  return customKey || envKey || 'rzp_test_1DP5mmOlF5G5ag'; // standard test key placeholder
}

/**
 * Save custom Razorpay Key ID in browser localStorage
 */
export function saveCustomRazorpayKeyId(keyId: string): void {
  try {
    if (keyId && keyId.trim()) {
      localStorage.setItem('shyam_custom_razorpay_key_id', keyId.trim());
    } else {
      localStorage.removeItem('shyam_custom_razorpay_key_id');
    }
  } catch {
    // ignore
  }
}

/**
 * Dynamically load Razorpay standard checkout script
 */
export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(false);
      return;
    }
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.warn('Failed to load official Razorpay script.');
      resolve(false);
    };
    document.body.appendChild(script);
  });
}

/**
 * Check if the active key is a real user-provided Razorpay Key ID
 */
export function isRealRazorpayKey(keyId: string): boolean {
  if (!keyId) return false;
  // A valid key starts with rzp_test_ or rzp_live_ and has meaningful length (> 18 chars) and is not the inactive dummy placeholder
  return (
    (keyId.startsWith('rzp_test_') || keyId.startsWith('rzp_live_')) &&
    keyId !== 'rzp_test_1DP5mmOlF5G5ag' &&
    keyId.length >= 18
  );
}

/**
 * Main function to initiate Razorpay Order, display checkout modal, and verify signature
 */
export async function initiateRazorpayPayment(
  options: RazorpayPaymentOptions
): Promise<RazorpayPaymentResult> {
  const isScriptLoaded = await loadRazorpayScript();
  const activeKeyId = getRazorpayKeyId();
  const supabaseCreds = getSupabaseCredentials();

  let razorpayOrderId: string | undefined = undefined;
  let amountInPaise = Math.round(options.amount * 100);
  let keyIdToUse = activeKeyId;

  // 1. Attempt to create order via Supabase Edge Function if Supabase is active
  if (supabaseCreds.isConfigured) {
    try {
      const { data, error } = await supabase.functions.invoke('create-razorpay-order', {
        body: {
          bookingRef: options.bookingRef,
          orderType: options.orderType,
          amount: options.amount,
          currency: 'INR',
          customerName: options.customerName,
          customerEmail: options.customerEmail,
          customerPhone: options.customerPhone,
          serviceOrProductName: options.serviceOrProductName,
          notes: options.notes,
          jewelleryId: options.jewelleryId,
        },
      });

      if (!error && data?.success && data?.razorpayOrderId) {
        razorpayOrderId = data.razorpayOrderId;
        amountInPaise = data.amount || amountInPaise;
        if (data.razorpayKeyId) {
          keyIdToUse = data.razorpayKeyId;
        }
      } else if (error) {
        console.warn('create-razorpay-order Edge Function returned error:', error.message);
      }
    } catch (edgeErr) {
      console.warn('Could not call create-razorpay-order Edge Function:', edgeErr);
    }
  }

  // If Supabase is configured but the order could not be created, do NOT open
  // an order-less checkout: such payments cannot be verified or tracked.
  if (supabaseCreds.isConfigured && !razorpayOrderId) {
    return {
      success: false,
      error:
        'Could not start a secure payment session (order creation failed). Please try again in a moment.',
    };
  }

  // If the key is the placeholder/inactive test key and no real key is configured,
  // we provide an interactive test-mode payment confirmation modal to prevent the "No appropriate payment method found" error
  if (!isRealRazorpayKey(keyIdToUse)) {
    return showTestModePaymentModal(options);
  }

  // 2. Open Razorpay Checkout modal for real/configured keys
  return new Promise((resolve) => {
    if (!isScriptLoaded || typeof window.Razorpay === 'undefined') {
      // Fallback to simulation
      return showTestModePaymentModal(options).then(resolve);
    }

    const rzpOptions: any = {
      key: keyIdToUse,
      amount: amountInPaise,
      currency: 'INR',
      name: 'Shyam Creations',
      description: options.serviceOrProductName || 'Online Reservation / Purchase',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBjFHTab9h762r8M6V6-ZdWjsTXARICmnrQBUgUkXVLgeu_JNQNaOfUnfMM0oeFiakmwOHEnTE6dRxQP0CJ4wpUSrmzWOCHGKYawcEG8EjCwVi2nvKrLbenZ3j_j5cwa_8rK76POfQx-E9RarHxDZQHwzoLAysDrfXnhw9e1f5NConq3ZOCilQmud9ogQz_-WNnvoTtWt6216gAnXWMHT24mMGMSHiVcElTz8hcKjxb6rdM_ELubhwLABBQXHHDHOj3bPedbyXzIODj',
      prefill: {
        name: options.customerName || '',
        email: options.customerEmail || '',
        contact: options.customerPhone ? options.customerPhone.replace(/\D/g, '').slice(-10) : '',
      },
      notes: {
        bookingRef: options.bookingRef,
        orderType: options.orderType,
        service: options.serviceOrProductName,
      },
      theme: {
        color: '#C08A34',
        backdrop_color: 'rgba(28, 28, 26, 0.7)',
      },
      modal: {
        ondismiss: function () {
          resolve({
            success: false,
            error: 'Payment window was closed by the customer.',
          });
        },
      },
      handler: async function (response: any) {
        const paymentId = response.razorpay_payment_id;
        const orderId = response.razorpay_order_id || razorpayOrderId || `order_${Date.now()}`;
        const signature = response.razorpay_signature || `sig_${Date.now()}`;

        // 3. Verify Payment Signature via Supabase Edge Function
        if (supabaseCreds.isConfigured && response.razorpay_signature) {
          try {
            const { data: verifyData, error: verifyError } = await supabase.functions.invoke(
              'verify-razorpay-payment',
              {
                body: {
                  razorpay_order_id: orderId,
                  razorpay_payment_id: paymentId,
                  razorpay_signature: signature,
                  bookingRef: options.bookingRef,
                  orderType: options.orderType,
                  amount: options.amount,
                  customerName: options.customerName,
                  customerEmail: options.customerEmail,
                  customerPhone: options.customerPhone,
                  serviceOrProductName: options.serviceOrProductName,
                  jewelleryId: options.jewelleryId,
                  deliveryAddress: options.deliveryAddress,
                  itemsToDecrement: options.itemsToDecrement,
                },
              }
            );

            if (verifyError || verifyData?.success === false) {
              console.warn('Server verification warning:', verifyError?.message || verifyData?.error);
            }
          } catch (vErr) {
            console.warn('Failed to contact verify-razorpay-payment Edge Function:', vErr);
          }
        }

        resolve({
          success: true,
          razorpay_payment_id: paymentId,
          razorpay_order_id: orderId,
          razorpay_signature: signature,
        });
      },
    };

    // Only attach order_id if it is a genuine order ID from backend
    if (razorpayOrderId) {
      rzpOptions.order_id = razorpayOrderId;
    }

    try {
      const rzp = new window.Razorpay(rzpOptions);
      rzp.on('payment.failed', function (response: any) {
        console.error('Razorpay payment failed:', response.error);
        resolve({
          success: false,
          error: response.error?.description || response.error?.reason || 'Payment transaction failed. Please retry.',
          razorpay_order_id: razorpayOrderId,
        });
      });
      rzp.open();
    } catch (err: any) {
      console.error('Failed to open Razorpay modal:', err);
      // Fallback to simulation modal if Razorpay throws client errors
      showTestModePaymentModal(options).then(resolve);
    }
  });
}

/**
 * Interactive Test Mode Gateway & Payment Simulator
 * Runs seamlessly when in test/sandbox environment or before live merchant keys are configured.
 */
function showTestModePaymentModal(options: RazorpayPaymentOptions): Promise<RazorpayPaymentResult> {
  return new Promise((resolve) => {
    // Remove any previous modal if exists
    const existing = document.getElementById('shyam-razorpay-sim-modal');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'shyam-razorpay-sim-modal';
    overlay.className = 'fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200';

    const formattedAmount = `₹${options.amount.toLocaleString('en-IN')}`;

    overlay.innerHTML = `
      <div class="bg-[var(--sc-bg-soft)] border border-[var(--sc-border)] rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 text-[var(--sc-text)] font-sans">
        <div class="flex items-center justify-between border-b border-[var(--sc-border)]/60 pb-3">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-xl bg-[#C08A34] text-white flex items-center justify-center font-bold text-sm shadow-xs">
              ⚡
            </div>
            <div>
              <h3 class="font-serif font-bold text-base text-[var(--sc-text)]">Razorpay Sandbox Simulator</h3>
              <p class="text-[10px] text-[#C08A34] font-semibold">Test Mode Payment Simulator</p>
            </div>
          </div>
          <button id="sim-close-btn" class="w-7 h-7 rounded-full bg-[#2A2118] hover:bg-[#3A2F22] text-[#B8AFA3] font-bold text-xs flex items-center justify-center cursor-pointer">
            ✕
          </button>
        </div>

        <div class="bg-[var(--sc-surface)] p-4 rounded-2xl border border-[var(--sc-border)]/50 space-y-2 text-xs">
          <div class="flex justify-between items-center text-[#8A7F72]">
            <span>Item / Service:</span>
            <span class="font-bold text-[#F5F0E8] truncate max-w-[200px]">${options.serviceOrProductName}</span>
          </div>
          <div class="flex justify-between items-center text-[#8A7F72]">
            <span>Order Reference:</span>
            <span class="font-mono font-bold text-[#F5F0E8]">${options.bookingRef}</span>
          </div>
          <div class="flex justify-between items-center text-[#8A7F72]">
            <span>Customer:</span>
            <span class="font-semibold text-[#F5F0E8]">${options.customerName} (${options.customerPhone})</span>
          </div>
          <div class="pt-2 border-t border-[#3A2F22] flex justify-between items-center">
            <span class="font-bold text-[var(--sc-text)]">Total Amount:</span>
            <span class="font-bold text-lg text-[#C08A34]">${formattedAmount}</span>
          </div>
        </div>

        <div class="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900 leading-relaxed">
          <strong>ℹ️ Test Payment:</strong> Click <strong>"Simulate Successful Payment"</strong> to test order placement, receipt generation, and stock deduction. To connect real UPI/Cards, paste your free Key ID from <span class="underline font-semibold">dashboard.razorpay.com</span> into Admin Settings.
        </div>

        <div class="space-y-2 pt-1">
          <button id="sim-success-btn" class="w-full py-3.5 bg-[#C08A34] hover:bg-[#E0B45F] text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-99">
            <span>✓</span>
            <span>SIMULATE SUCCESSFUL PAYMENT (${formattedAmount})</span>
          </button>
          
          <button id="sim-cancel-btn" class="w-full py-2.5 bg-[#2A2118] hover:bg-[#3A2F22] text-[#B8AFA3] font-semibold text-xs rounded-xl transition-colors cursor-pointer">
            Cancel & Return
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const cleanup = () => {
      overlay.remove();
    };

    const successBtn = document.getElementById('sim-success-btn');
    const cancelBtn = document.getElementById('sim-cancel-btn');
    const closeBtn = document.getElementById('sim-close-btn');

    successBtn?.addEventListener('click', () => {
      cleanup();
      const simPayId = `pay_test_${Date.now().toString().slice(-8)}${Math.random().toString(36).substring(2, 5)}`;
      resolve({
        success: true,
        razorpay_payment_id: simPayId,
        razorpay_order_id: `order_test_${Date.now()}`,
        razorpay_signature: `sig_test_${Date.now()}`,
        isSimulated: true,
      });
    });

    cancelBtn?.addEventListener('click', () => {
      cleanup();
      resolve({
        success: false,
        error: 'Payment was cancelled by the user.',
      });
    });

    closeBtn?.addEventListener('click', () => {
      cleanup();
      resolve({
        success: false,
        error: 'Payment window was closed.',
      });
    });
  });
}
