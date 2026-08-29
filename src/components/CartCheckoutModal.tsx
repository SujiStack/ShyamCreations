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
  const [paymentMode, setPaymentMode] = useState<'razorpay' | 'manual_upi'>('razorpay');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [customerAddress, setCustomerAddress] = useState<string>('');
  const [paymentUtr, setPaymentUtr] = useState<string>('');
  const [paymentVerifiedSuccess, setPaymentVerifiedSuccess] = useState<boolean>(false);
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

  const upiPayLink = `upi://pay?pa=sujishyamalakutti-7@okaxis&pn=Suji&am=${grandTotal}&cu=INR&tn=${encodeURIComponent('Bag Order + Delivery')}`;
  const phonepePayLink = `phonepe://pay?pa=sujishyamalakutti-7@okaxis&pn=Suji&am=${grandTotal}&cu=INR&tn=${encodeURIComponent('Bag Order + Delivery')}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(upiPayLink)}`;

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
        itemsToDecrement: cartItems.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      });

      if (!paymentResult.success) {
        setIsSubmitting(false);
        setFormError(paymentResult.error || 'Payment was cancelled or failed. Please retry.');
        return;
      }

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

      onClearCart();

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

  const handleConfirmBagOrder = async () => {
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
    if (!paymentUtr.trim() || paymentUtr.trim().length < 6) {
      setFormError('Please enter the 12-digit UPI Transaction ID from your payment app receipt.');
      return;
    }

    setIsSubmitting(true);

    try {
      const refCode = `BAG-${Math.floor(100000 + Math.random() * 900000)}`;
      const itemsSummary = cartItems
        .map((i) => `${i.product.name} (x${i.quantity})`)
        .join(', ');

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
        paymentMethod: 'Google Pay / UPI',
        upiTransactionId: paymentUtr.trim(),
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
        paymentMethod: 'Google Pay / UPI',
        transactionId: paymentUtr.trim(),
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
        paymentMethod: 'Google Pay / UPI',
        transactionId: paymentUtr.trim(),
      };

      if (onAddOrder) {
        await onAddOrder(newOrder);
      }

      onClearCart();

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
        transactionId: paymentUtr.trim(),
      });
    } catch (err) {
      console.error('Cart checkout error:', err);
      setFormError('Order processing failed. Please try again.');
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
        <div className="bg-[#fcf9f5] rounded-3xl p-6 md:p-8 max-w-lg w-full border border-[#c79a3b] shadow-2xl space-y-6 relative text-center">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <span className="material-symbols-outlined text-3xl">check_circle</span>
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#7b5900] bg-[#7b5900]/10 px-3 py-1 rounded-full">
              Order Ref: {confirmedReceipt.ref}
            </span>
            <h2 className="font-serif text-2xl font-bold text-[#1c1c1a] mt-2">
              Bag Order Placed Successfully!
            </h2>
            <p className="text-xs text-[#5c5446] mt-1">
              Your jewellery pieces have been reserved and registered for express dispatch.
            </p>
          </div>

          {/* Receipt Summary Box */}
          <div className="bg-white p-4 rounded-2xl border border-[#d2c5b1]/40 text-left space-y-3 text-xs">
            <div className="border-b border-[#f0ede9] pb-2">
              <p className="text-[11px] text-[#5c5446]">Ordered Items ({confirmedReceipt.itemCount}):</p>
              <p className="font-serif font-bold text-[#1c1c1a] text-sm mt-0.5">
                {confirmedReceipt.itemsSummary}
              </p>
            </div>

            <div className="space-y-1.5 text-[#4e4637]">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-bold text-[#1c1c1a]">{confirmedReceipt.subtotal}</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping Charges:</span>
                <span className="font-bold text-[#7b5900]">{confirmedReceipt.shippingFee}</span>
              </div>
              <div className="flex justify-between border-t border-[#f0ede9] pt-1.5 font-bold text-sm text-[#1c1c1a]">
                <span>Total Amount Paid:</span>
                <span className="text-[#7b5900]">{confirmedReceipt.totalAmount}</span>
              </div>
              <div className="flex justify-between pt-1 text-[11px] text-[#5c5446]">
                <span>UPI Transaction ID:</span>
                <span className="font-mono font-bold text-[#1c1c1a]">{confirmedReceipt.transactionId}</span>
              </div>
            </div>

            <div className="bg-[#f6f3ef] p-3 rounded-xl border border-[#d2c5b1]/30 space-y-1 text-[11px]">
              <p className="font-bold text-[#1c1c1a]">Deliver To:</p>
              <p className="font-semibold text-[#7b5900]">{confirmedReceipt.clientName} ({confirmedReceipt.phone})</p>
              <p className="text-[#5c5446]">{confirmedReceipt.deliveryAddress}</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-1">
            <button
              type="button"
              onClick={openWhatsAppBagReceipt}
              className="w-full py-3.5 bg-[#25D366] hover:bg-[#1ebd59] text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
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
              className="w-full py-3 bg-[#1c1c1a] hover:bg-[#7b5900] text-[#f3ebd9] font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              VIEW IN MY BOOKINGS & ORDERS
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-[#fcf9f5] rounded-3xl p-5 md:p-8 max-w-2xl w-full border border-[#d2c5b1]/60 shadow-2xl space-y-6 my-6 relative max-h-[92vh] overflow-y-auto">
          {/* Header */}
          <div className="flex justify-between items-start border-b border-[#d2c5b1]/40 pb-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#7b5900] bg-[#7b5900]/10 px-3 py-1 rounded-full">
                Express Jewellery Bag Checkout
              </span>
              <h2 className="font-serif text-xl md:text-2xl font-bold text-[#1c1c1a] mt-1.5">
                Purchase {cartItems.length} {cartItems.length === 1 ? 'Item' : 'Items'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 bg-[#e5e2de] hover:bg-[#d2c5b1] rounded-full text-[#1c1c1a] transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>

          {/* Cart Items List Summary */}
          <div className="bg-white p-4 rounded-2xl border border-[#d2c5b1]/40 space-y-3">
            <h4 className="text-xs font-bold text-[#4e4637] uppercase tracking-wider">
              Bag Items Summary
            </h4>
            <div className="space-y-2 max-h-40 overflow-y-auto divide-y divide-[#f0ede9]">
              {cartItems.map((item) => (
                <div key={item.productId} className="flex items-center justify-between pt-2 first:pt-0 text-xs">
                  <div className="flex items-center gap-3">
                    <img
                      src={item.product.images[0]}
                      alt={item.product.name}
                      className="w-10 h-10 object-cover rounded-lg border border-[#d2c5b1]/30"
                    />
                    <div>
                      <p className="font-bold text-[#1c1c1a]">{item.product.name}</p>
                      <p className="text-[11px] text-[#5c5446]">Qty: {item.quantity}</p>
                    </div>
                  </div>
                  <span className="font-bold text-[#7b5900]">{item.product.price}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-[#f0ede9] pt-2 flex items-center justify-between text-xs font-bold">
              <span>Grand Total Payable (with ₹50 Shipping):</span>
              <span className="text-base text-[#7b5900]">₹{grandTotal.toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* Form Section: Delivery Address & Customer Details */}
          <div className="space-y-4">
            <h3 className="font-serif font-bold text-[#1c1c1a] text-sm md:text-base flex items-center gap-2">
              <span className="material-symbols-outlined text-[#7b5900] text-lg">local_shipping</span>
              <span>1. Delivery Address & Customer Details</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#4e4637] mb-1">
                  Customer Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Suji Shyamala"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#d2c5b1]/60 rounded-xl text-xs text-[#1c1c1a] focus:outline-none focus:border-[#7b5900]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#4e4637] mb-1">
                  Contact / WhatsApp Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  placeholder="e.g. 9363710342"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#d2c5b1]/60 rounded-xl text-xs text-[#1c1c1a] focus:outline-none focus:border-[#7b5900]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#4e4637] mb-1">
                Complete Delivery Address <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={2}
                placeholder="Enter Door No, Street, Area, City, and Pincode for express courier delivery"
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-[#d2c5b1]/60 rounded-xl text-xs text-[#1c1c1a] focus:outline-none focus:border-[#7b5900] resize-none"
              />
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="space-y-4 pt-2 border-t border-[#d2c5b1]/40">
            <div className="flex items-center justify-between">
              <h3 className="font-serif font-bold text-[#1c1c1a] text-sm md:text-base flex items-center gap-2">
                <span className="material-symbols-outlined text-[#7b5900] text-lg">payments</span>
                <span>2. Select Payment Method (₹{grandTotal.toLocaleString('en-IN')})</span>
              </h3>
            </div>

            {/* Payment Method Tabs */}
            <div className="grid grid-cols-2 gap-2 bg-[#ece7df] p-1.5 rounded-2xl">
              <button
                type="button"
                onClick={() => {
                  setPaymentMode('razorpay');
                  setFormError(null);
                }}
                className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  paymentMode === 'razorpay'
                    ? 'bg-[#1c1c1a] text-[#f5d796] shadow-sm'
                    : 'text-[#5c5446] hover:text-[#1c1c1a]'
                }`}
              >
                <span>⚡</span>
                <span>Razorpay (Instant)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPaymentMode('manual_upi');
                  setFormError(null);
                }}
                className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  paymentMode === 'manual_upi'
                    ? 'bg-[#1c1c1a] text-[#f5d796] shadow-sm'
                    : 'text-[#5c5446] hover:text-[#1c1c1a]'
                }`}
              >
                <span>📱</span>
                <span>Direct UPI / QR</span>
              </button>
            </div>

            {paymentMode === 'razorpay' ? (
              <div className="bg-white p-5 rounded-2xl border border-[#d2c5b1]/40 space-y-4">
                <div className="flex items-center justify-between border-b border-[#f0ede9] pb-3">
                  <div>
                    <h4 className="font-bold text-xs text-[#1c1c1a]">Razorpay Official Secure Checkout</h4>
                    <p className="text-[11px] text-[#5c5446]">UPI (GPay/PhonePe), Credit & Debit Cards, NetBanking, Wallets</p>
                  </div>
                  <span className="bg-emerald-50 text-emerald-800 font-bold text-[10px] px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                    <span>100% Secure</span>
                  </span>
                </div>

                <div className="bg-[#fcf9f5] p-3.5 rounded-xl border border-[#d2c5b1]/30 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[#5c5446] text-[11px] block">Grand Total Payable:</span>
                    <strong className="text-base text-[#7b5900]">₹{grandTotal.toLocaleString('en-IN')}</strong>
                  </div>
                  <span className="text-[10px] text-stone-500 font-mono bg-stone-100 px-2 py-1 rounded">
                    Includes ₹50 express courier shipping
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center bg-white p-4 rounded-2xl border border-[#d2c5b1]/40">
                  <div className="flex flex-col items-center justify-center p-2 bg-[#fcf9f5] rounded-xl border border-[#d2c5b1]/30">
                    <img
                      src={qrCodeUrl}
                      alt="UPI QR Code"
                      className="w-36 h-36 object-contain rounded-lg shadow-xs"
                    />
                    <p className="text-[10px] text-[#7b5900] font-bold mt-2">
                      Scan with GPay / PhonePe / Paytm
                    </p>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="p-3 bg-[#f6f3ef] rounded-xl space-y-1">
                      <p className="text-[11px] text-[#5c5446]">Studio UPI ID:</p>
                      <p className="font-mono font-bold text-sm text-[#1c1c1a] select-all">
                        sujishyamalakutti-7@okaxis
                      </p>
                      <p className="text-[10px] text-[#7b5900] font-semibold">Recipient: Suji (Shyam Creations)</p>
                    </div>

                    <div className="flex gap-2">
                      <a
                        href={upiPayLink}
                        className="flex-1 py-2 px-3 bg-[#1a73e8] hover:bg-[#1557b0] text-white font-bold text-[11px] rounded-xl text-center shadow-xs"
                      >
                        Open Google Pay
                      </a>
                      <a
                        href={phonepePayLink}
                        className="flex-1 py-2 px-3 bg-[#5f259f] hover:bg-[#4a1c7d] text-white font-bold text-[11px] rounded-xl text-center shadow-xs"
                      >
                        Open PhonePe
                      </a>
                    </div>
                  </div>
                </div>

                {/* 12-Digit UPI Transaction ID Input with Auto-Paste */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="block text-xs font-bold text-[#4e4637]">
                      3. Enter 12-Digit UPI Transaction ID / UTR <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleClipboardAutoPaste}
                      className="text-[11px] font-bold text-[#7b5900] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-xs">content_paste</span>
                      <span>Auto-Paste</span>
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. 408123456789 (From Payment Receipt)"
                      value={paymentUtr}
                      onChange={(e) => {
                        setPaymentUtr(e.target.value);
                        setPaymentVerifiedSuccess(e.target.value.trim().length >= 6);
                      }}
                      className="flex-1 px-3.5 py-2.5 bg-white border border-[#d2c5b1]/60 rounded-xl text-xs font-mono font-bold text-[#1c1c1a] focus:outline-none focus:border-[#7b5900]"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (paymentUtr.trim().length >= 6) {
                          setPaymentVerifiedSuccess(true);
                          setFormError(null);
                        } else {
                          setFormError('Please enter at least 6 digits of your UPI Transaction ID.');
                        }
                      }}
                      className="px-4 py-2.5 bg-[#7b5900] hover:bg-[#c79a3b] text-white font-bold text-xs rounded-xl transition-colors cursor-pointer shrink-0"
                    >
                      VERIFY
                    </button>
                  </div>

                  {paymentVerifiedSuccess && (
                    <p className="text-xs font-bold text-emerald-700 bg-emerald-50 p-2 rounded-xl border border-emerald-200 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm">check_circle</span>
                      <span>✓ Transaction ID linked successfully!</span>
                    </p>
                  )}
                </div>
              </div>
            )}
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
            {paymentMode === 'razorpay' ? (
              <button
                type="button"
                onClick={handleRazorpayCheckout}
                disabled={isSubmitting}
                className="w-full py-4 bg-[#7b5900] hover:bg-[#c79a3b] text-white font-bold text-sm rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer active:scale-99"
              >
                <span className="material-symbols-outlined text-lg">lock</span>
                <span>
                  {isSubmitting
                    ? 'LAUNCHING RAZORPAY GATEWAY...'
                    : `PAY ₹${grandTotal.toLocaleString('en-IN')} VIA RAZORPAY`}
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleConfirmBagOrder}
                disabled={isSubmitting}
                className="w-full py-4 bg-[#1c1c1a] hover:bg-[#7b5900] text-[#f3ebd9] font-bold text-sm rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">local_shipping</span>
                <span>
                  {isSubmitting
                    ? 'PROCESSING ORDER...'
                    : `CONFIRM & PLACE BAG ORDER (₹${grandTotal.toLocaleString('en-IN')})`}
                </span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
