import React, { useState, useEffect } from 'react';
import { CartItem, CustomerAccount, HennaBooking } from '../types';
import { STUDIO_INFO } from '../data/mockData';
import {
  insertSupabaseJewelleryCustomer,
  insertSupabaseJewelleryBooking,
  decrementProductStockInDb,
  insertSupabasePayment,
} from '../lib/supabaseService';
import { initiateRazorpayPayment } from '../lib/razorpay';

interface CartCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  customerUser?: CustomerAccount | null;
  onClearCart: () => void;
  onDecrementStock?: (productId: string, quantity: number) => Promise<void>;
  onAddOrder?: (order: HennaBooking) => Promise<{ success: boolean; isConfigured: boolean; error?: string }>;
  onViewOrders?: () => void;
}

export const CartCheckoutModal: React.FC<CartCheckoutModalProps> = ({
  isOpen,
  onClose,
  cartItems,
  customerUser = null,
  onClearCart,
  onDecrementStock,
  onAddOrder,
  onViewOrders,
}) => {
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [customerAddress, setCustomerAddress] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [confirmedReceipt, setConfirmedReceipt] = useState<{
    ref: string;
    itemsSummary: string;
    itemCount: number;
    clientName: string;
    phone: string;
    deliveryAddress: string;
    subtotal: string;
    shippingFee: string;
    totalAmount: string;
    transactionId: string;
  } | null>(null);

  useEffect(() => {
    if (customerUser) {
      if (customerUser.name) setCustomerName(customerUser.name);
      if (customerUser.phone) setCustomerPhone(customerUser.phone);
    }
  }, [customerUser]);

  if (!isOpen && !confirmedReceipt) return null;

  const calculateSubtotal = () => {
    return cartItems.reduce((sum, item) => {
      const priceStr = item.product.price || '₹2,500';
      const num = parseInt(priceStr.replace(/[^0-9]/g, ''), 10) || 2500;
      return sum + num * item.quantity;
    }, 0);
  };

  const subtotal = calculateSubtotal();
  const shippingFeeNum = cartItems.length > 0 ? 50 : 0;
  const grandTotal = subtotal + shippingFeeNum;

  const handleRazorpayCheckout = async () => {
    setFormError(null);

    if (cartItems.length === 0) {
      setFormError('Your shopping bag is empty.');
      return;
    }
    if (!customerName.trim()) {
      setFormError('Please enter your full name.');
      return;
    }
    if (!customerPhone.trim() || customerPhone.trim().length < 10) {
      setFormError('Please enter a valid 10-digit mobile / WhatsApp number.');
      return;
    }
    if (!customerAddress.trim() || customerAddress.trim().length < 8) {
      setFormError('Please enter full delivery address (Door No, Street, Area, City, Pincode).');
      return;
    }

    setIsSubmitting(true);
    const refCode = `BAG-${Math.floor(100000 + Math.random() * 900000)}`;
    const itemsSummary = cartItems.map((i) => `${i.product.name} (x${i.quantity})`).join(', ');

    try {
      const paymentResult = await initiateRazorpayPayment({
        bookingRef: refCode,
        orderType: 'jewellery_bag',
        amount: grandTotal,
        customerName: customerName.trim(),
        customerEmail: customerUser?.email || 'client@shyamcreations.com',
        customerPhone: customerPhone.trim(),
        serviceOrProductName: `Shopping Bag: ${itemsSummary}`,
        notes: `Delivery Address: ${customerAddress.trim()}`,
        jewelleryId: cartItems[0]?.productId,
        deliveryAddress: customerAddress.trim(),
        itemsToDecrement: cartItems.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      });

      if (!paymentResult.success) {
        setIsSubmitting(false);
        setFormError(paymentResult.error || 'Payment was cancelled or failed. Please retry.');
        return;
      }

      // Clear the cart IMMEDIATELY (synchronously persisted) before the slow
      // DB writes — even if the tab dies later, the paid cart won't come back.
      onClearCart();

      const verifiedTxnId = paymentResult.razorpay_payment_id || `RZP-PAY-${Date.now()}`;
      const formattedSubtotal = `₹${subtotal.toLocaleString('en-IN')}`;
      const formattedShipping = `₹${shippingFeeNum}`;
      const formattedTotal = `₹${grandTotal.toLocaleString('en-IN')}`;

      // Save into Supabase 'jewellery_customers' table
      await insertSupabaseJewelleryCustomer({
        orderRef: refCode,
        customerName: customerName.trim(),
        phone: customerPhone.trim(),
        whatsapp: customerPhone.trim(),
        email: customerUser?.email || 'client@shyamcreations.com',
        deliveryAddress: customerAddress.trim(),
        productName: `Shopping Bag: ${itemsSummary}`,
        jewelleryId: cartItems[0]?.productId || 'bag-items',
        itemPrice: formattedSubtotal,
        shippingFee: formattedShipping,
        totalAmount: formattedTotal,
        paymentMethod: 'Razorpay (Online Payment)',
        upiTransactionId: verifiedTxnId,
        paymentStatus: 'Paid',
        orderStatus: 'Processing',
        notes: `Bag items: ${itemsSummary} | Delivery Address: ${customerAddress.trim()}`,
      });

      // Save into Supabase 'jewellery_bookings' table
      await insertSupabaseJewelleryBooking({
        bookingRef: refCode,
        clientName: customerName.trim(),
        phone: customerPhone.trim(),
        email: customerUser?.email || 'client@shyamcreations.com',
        productName: `Bag: ${itemsSummary}`,
        jewelleryId: cartItems[0]?.productId || 'bag-items',
        bookingType: 'Purchase',
        startDate: new Date().toISOString().split('T')[0],
        totalPrice: formattedTotal,
        location: customerAddress.trim(),
        paymentStatus: 'Paid',
        paymentMethod: 'Razorpay (Online Payment)',
        transactionId: verifiedTxnId,
        status: 'Confirmed',
        notes: `Bag checkout (${cartItems.length} items). Address: ${customerAddress.trim()}`,
      });

      // Decrement stock for every product in cart
      for (const item of cartItems) {
        await decrementProductStockInDb(item.productId, item.quantity);
        if (onDecrementStock) {
          await onDecrementStock(item.productId, item.quantity);
        }
      }

      // Add to local HennaBooking/Orders tracker
      const newOrder: HennaBooking = {
        id: `bag-order-${Date.now()}`,
        ref: refCode,
        serviceCategory: 'Jewellery Rental & Sale',
        serviceName: itemsSummary,
        date: new Date().toISOString().split('T')[0],
        timeSlot: 'Express Courier Dispatch',
        location: customerAddress.trim(),
        clientName: customerName.trim(),
        clientEmail: customerUser?.email || 'client@shyamcreations.com',
        phone: customerPhone.trim(),
        wa: customerPhone.trim(),
        deliveryAddress: customerAddress.trim(),
        shippingFee: formattedShipping,
        specialRequests: `Bag Purchase: ${itemsSummary}`,
        status: 'Confirmed',
        type: 'jewellery',
        paymentStatus: 'Paid',
        paymentAmount: formattedTotal,
        paymentMethod: 'Razorpay (Online Payment)',
        transactionId: verifiedTxnId,
      };

      if (onAddOrder) {
        await onAddOrder(newOrder);
      }

      setConfirmedReceipt({
        ref: refCode,
        itemsSummary,
        itemCount: cartItems.length,
        clientName: customerName.trim(),
        phone: customerPhone.trim(),
        deliveryAddress: customerAddress.trim(),
        subtotal: formattedSubtotal,
        shippingFee: formattedShipping,
        totalAmount: formattedTotal,
        transactionId: verifiedTxnId,
      });
    } catch (err: any) {
      console.error('Razorpay bag checkout error:', err);
      setFormError(err?.message || 'Failed to complete Razorpay payment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openWhatsAppBagReceipt = () => {
    if (!confirmedReceipt) return;
    const cleanPhone = STUDIO_INFO.whatsapp.replace(/[^0-9]/g, '');
    const message = `Hello Shyam Creations Studio! I have placed an order for my Shopping Bag on your website:\n\n🛍️ *Order Ref:* ${confirmedReceipt.ref}\n👑 *Items:* ${confirmedReceipt.itemsSummary}\n💰 *Items Subtotal:* ${confirmedReceipt.subtotal}\n🚚 *Shipping:* ${confirmedReceipt.shippingFee}\n💵 *Total Paid:* ${confirmedReceipt.totalAmount}\n📲 *Verified Txn ID:* ${confirmedReceipt.transactionId}\n\n👤 *Customer Name:* ${confirmedReceipt.clientName}\n📞 *Phone:* ${confirmedReceipt.phone}\n📍 *Delivery Address:* ${confirmedReceipt.deliveryAddress}\n\nPlease confirm dispatch. Thank you!`;
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  return (
    <div
      id="cart-checkout-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 md:p-6 animate-in fade-in duration-200 overflow-y-auto"
    >
      {confirmedReceipt ? (
        <div className="bg-[var(--sc-bg-soft)] rounded-3xl p-6 md:p-8 max-w-lg w-full border border-[var(--sc-emerald)] shadow-2xl space-y-6 relative text-center">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <span className="material-symbols-outlined text-3xl">check_circle</span>
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--sc-emerald-dark)] bg-[var(--sc-emerald)]/10 px-3 py-1 rounded-full">
              Order Ref: {confirmedReceipt.ref}
            </span>
            <h2 className="font-serif text-2xl font-bold text-[var(--sc-text)] mt-2">
              Bag Order Placed Successfully!
            </h2>
            <p className="text-xs text-[var(--sc-text-dim)] mt-1">
              Your jewellery pieces have been reserved and registered for express dispatch.
            </p>
          </div>

          {/* Receipt Summary Box */}
          <div className="bg-[var(--sc-surface)] p-4 rounded-2xl border border-[var(--sc-border)]/40 text-left space-y-3 text-xs">
            <div className="border-b border-[var(--sc-border)] pb-2">
              <p className="text-[11px] text-[var(--sc-text-dim)]">Ordered Items ({confirmedReceipt.itemCount}):</p>
              <p className="font-serif font-bold text-[var(--sc-text)] text-sm mt-0.5">
                {confirmedReceipt.itemsSummary}
              </p>
            </div>

            <div className="space-y-1.5 text-[var(--sc-text-dim)]">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-bold text-[var(--sc-text)]">{confirmedReceipt.subtotal}</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping Charges:</span>
                <span className="font-bold text-[var(--sc-emerald-dark)]">{confirmedReceipt.shippingFee}</span>
              </div>
              <div className="flex justify-between border-t border-[var(--sc-border)] pt-1.5 font-bold text-sm text-[var(--sc-text)]">
                <span>Total Amount Paid:</span>
                <span className="text-[var(--sc-emerald-dark)]">{confirmedReceipt.totalAmount}</span>
              </div>
              <div className="flex justify-between pt-1 text-[11px] text-[var(--sc-text-dim)]">
                <span>Payment ID:</span>
                <span className="font-mono font-bold text-[var(--sc-text)]">{confirmedReceipt.transactionId}</span>
              </div>
            </div>

            <div className="bg-[var(--sc-accent-warm)] p-3 rounded-xl border border-[var(--sc-border)]/30 space-y-1 text-[11px]">
              <p className="font-bold text-[var(--sc-text)]">Deliver To:</p>
              <p className="font-semibold text-[var(--sc-emerald-dark)]">{confirmedReceipt.clientName} ({confirmedReceipt.phone})</p>
              <p className="text-[var(--sc-text-dim)]">{confirmedReceipt.deliveryAddress}</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-1">
            <button
              type="button"
              onClick={openWhatsAppBagReceipt}
              className="w-full py-3.5 bg-[#2C6B4F] hover:bg-[#1F4D3A] text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
              </svg>
              <span>SEND ORDER RECEIPT ON WHATSAPP</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setConfirmedReceipt(null);
                onClose();
                if (onViewOrders) onViewOrders();
              }}
              className="w-full py-3 bg-[#171310] hover:bg-[var(--sc-emerald)] text-[#f3ebd9] font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              VIEW IN MY BOOKINGS & ORDERS
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-[var(--sc-bg-soft)] rounded-3xl p-5 md:p-8 max-w-2xl w-full border border-[var(--sc-border)]/60 shadow-2xl space-y-6 my-6 relative max-h-[92vh] overflow-y-auto">
          {/* Header */}
          <div className="flex justify-between items-start border-b border-[var(--sc-border)]/40 pb-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--sc-emerald-dark)] bg-[var(--sc-emerald)]/10 px-3 py-1 rounded-full">
                Express Jewellery Bag Checkout
              </span>
              <h2 className="font-serif text-xl md:text-2xl font-bold text-[var(--sc-text)] mt-1.5">
                Purchase {cartItems.length} {cartItems.length === 1 ? 'Item' : 'Items'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 bg-[var(--sc-accent-warm)] hover:bg-[var(--sc-border)] rounded-full text-[var(--sc-text)] transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>

          {/* Cart Items List Summary */}
          <div className="bg-[var(--sc-surface)] p-4 rounded-2xl border border-[var(--sc-border)]/40 space-y-3">
            <h4 className="text-xs font-bold text-[var(--sc-text-dim)] uppercase tracking-wider">
              Bag Items Summary
            </h4>
            <div className="space-y-2 max-h-40 overflow-y-auto divide-y divide-[var(--sc-border)]">
              {cartItems.map((item) => (
                <div key={item.productId} className="flex items-center justify-between pt-2 first:pt-0 text-xs">
                  <div className="flex items-center gap-3">
                    <img
                      src={item.product.images[0]}
                      alt={item.product.name}
                      className="w-10 h-10 object-cover rounded-lg border border-[var(--sc-border)]/30"
                    />
                    <div>
                      <p className="font-bold text-[var(--sc-text)]">{item.product.name}</p>
                      <p className="text-[11px] text-[var(--sc-text-dim)]">Qty: {item.quantity}</p>
                    </div>
                  </div>
                  <span className="font-bold text-[var(--sc-emerald-dark)]">{item.product.price}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-[var(--sc-border)] pt-2 flex items-center justify-between text-xs font-bold">
              <span>Grand Total Payable (with ₹50 Shipping):</span>
              <span className="text-base text-[var(--sc-emerald-dark)]">₹{grandTotal.toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* Form Section: Delivery Address & Customer Details */}
          <div className="space-y-4">
            <h3 className="font-serif font-bold text-[var(--sc-text)] text-sm md:text-base flex items-center gap-2">
              <span className="material-symbols-outlined text-[var(--sc-emerald-dark)] text-lg">local_shipping</span>
              <span>1. Delivery Address & Customer Details</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[var(--sc-text-dim)] mb-1">
                  Customer Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Suji Shyamala"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[var(--sc-surface)] border border-[var(--sc-border)]/60 rounded-xl text-xs text-[var(--sc-text)] focus:outline-none focus:border-[var(--sc-emerald)]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--sc-text-dim)] mb-1">
                  Contact / WhatsApp Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  placeholder="e.g. 9363710342"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[var(--sc-surface)] border border-[var(--sc-border)]/60 rounded-xl text-xs text-[var(--sc-text)] focus:outline-none focus:border-[var(--sc-emerald)]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--sc-text-dim)] mb-1">
                Complete Delivery Address <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={2}
                placeholder="Enter Door No, Street, Area, City, and Pincode for express courier delivery"
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[var(--sc-surface)] border border-[var(--sc-border)]/60 rounded-xl text-xs text-[var(--sc-text)] focus:outline-none focus:border-[var(--sc-emerald)] resize-none"
              />
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="space-y-4 pt-2 border-t border-[var(--sc-border)]/40">
            <div className="flex items-center justify-between">
              <h3 className="font-serif font-bold text-[var(--sc-text)] text-sm md:text-base flex items-center gap-2">
                <span className="material-symbols-outlined text-[var(--sc-emerald-dark)] text-lg">payments</span>
                <span>2. Payment (₹{grandTotal.toLocaleString('en-IN')})</span>
              </h3>
            </div>

            <div className="bg-[var(--sc-surface)] p-5 rounded-2xl border border-[var(--sc-border)]/40 space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--sc-border)] pb-3">
                  <div>
                    <h4 className="font-bold text-xs text-[var(--sc-text)]">Razorpay Official Secure Checkout</h4>
                    <p className="text-[11px] text-[var(--sc-text-dim)]">UPI (GPay/PhonePe), Credit & Debit Cards, NetBanking, Wallets</p>
                  </div>
                  <span className="bg-emerald-50 text-emerald-800 font-bold text-[10px] px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                    <span>100% Secure</span>
                  </span>
                </div>

                <div className="bg-[var(--sc-bg-soft)] p-3.5 rounded-xl border border-[var(--sc-border)]/30 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[var(--sc-text-dim)] text-[11px] block">Grand Total Payable:</span>
                    <strong className="text-base text-[var(--sc-emerald-dark)]">₹{grandTotal.toLocaleString('en-IN')}</strong>
                  </div>
                  <span className="text-[10px] text-stone-500 font-mono bg-stone-100 px-2 py-1 rounded">
                    Includes ₹50 express courier shipping
                  </span>
                </div>
              </div>
          </div>

          {/* Form Error Banner */}
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-bold text-red-700 flex items-center gap-2">
              <span className="material-symbols-outlined text-sm text-red-600">error</span>
              <span>{formError}</span>
            </div>
          )}

          {/* Action Button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleRazorpayCheckout}
              disabled={isSubmitting}
              className="w-full py-4 bg-[var(--sc-emerald)] hover:bg-[var(--sc-emerald-light)] text-white font-bold text-sm rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer active:scale-99"
            >
              <span className="material-symbols-outlined text-lg">lock</span>
              <span>
                {isSubmitting
                  ? 'LAUNCHING RAZORPAY GATEWAY...'
                  : `PAY ₹${grandTotal.toLocaleString('en-IN')} VIA RAZORPAY`}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
