import React, { useState, useEffect } from 'react';
import { ViewMode, Product, HennaBooking, CustomerAccount, PendingAuthAction } from '../types';
import { STUDIO_INFO } from '../data/mockData';
import {
  insertSupabaseJewelleryCustomer,
  insertSupabaseJewelleryBooking,
  decrementProductStockInDb,
} from '../lib/supabaseService';
import { initiateRazorpayPayment } from '../lib/razorpay';

interface JewelleryProductViewProps {
  product: Product;
  products?: Product[];
  onSelectProduct?: (product: Product) => void;
  onNavigate: (view: ViewMode) => void;
  onAddOrder?: (order: HennaBooking) => Promise<{ success: boolean; isConfigured: boolean; error?: string }>;
  isAuthenticated?: boolean;
  customerUser?: CustomerAccount | null;
  onRequireAuth?: (pendingAction?: PendingAuthAction) => void;
  onAddToCart?: (product: Product, quantity?: number) => void;
  onToggleWishlist?: (product: Product) => void;
  wishlistIds?: string[];
  onDecrementStock?: (productId: string, quantity: number) => Promise<void>;
  onOpenCart?: () => void;
  onOpenWishlist?: () => void;
  onRefreshJewellery?: () => Promise<void>;
}

export const JewelleryProductView: React.FC<JewelleryProductViewProps> = ({
  product,
  products = [],
  onSelectProduct,
  onNavigate,
  onAddOrder,
  isAuthenticated = false,
  customerUser = null,
  onRequireAuth,
  onAddToCart,
  onToggleWishlist,
  wishlistIds = [],
  onDecrementStock,
  onOpenCart,
  onOpenWishlist,
  onRefreshJewellery,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'bridal' | 'minimal' | 'hair'>('all');
  const [isSyncingDb, setIsSyncingDb] = useState<boolean>(false);
  const [selectedDays, setSelectedDays] = useState<number>(3);
  const [selectedStartDate, setSelectedStartDate] = useState<string>(
    new Date(Date.now() + 86400000).toISOString().split('T')[0]
  );
  const [rentalModalProduct, setRentalModalProduct] = useState<Product | null>(null);
  const [selectedDetailProduct, setSelectedDetailProduct] = useState<Product | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Direct Checkout & Payment State
  const [checkoutProduct, setCheckoutProduct] = useState<Product | null>(null);
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [customerAddress, setCustomerAddress] = useState<string>('');
  const [paymentUtr, setPaymentUtr] = useState<string>('');
  const [isVerifyingPayment, setIsVerifyingPayment] = useState<boolean>(false);
  const [paymentVerifiedSuccess, setPaymentVerifiedSuccess] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmedOrderCard, setConfirmedOrderCard] = useState<{
    ref: string;
    productName: string;
    clientName: string;
    phone: string;
    deliveryAddress: string;
    itemPrice: string;
    shippingFee: string;
    totalAmount: string;
    transactionId: string;
    image: string;
  } | null>(null);

  // Pre-fill customer details from logged in user
  useEffect(() => {
    if (customerUser) {
      if (!customerName) setCustomerName(customerUser.name || '');
      if (!customerPhone) setCustomerPhone(customerUser.phone || '');
    }
  }, [customerUser]);

  // When a product is selected (e.g. from Cart Drawer or Wishlist), auto-open its detail modal
  useEffect(() => {
    if (product && product.id) {
      setSelectedDetailProduct(product);
    }
  }, [product?.id]);

  const displayProducts = products.length > 0 ? products : [product];

  const filteredProducts = displayProducts.filter((p) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'bridal') return p.category === 'Bridal' || p.category === 'Royal';
    if (activeTab === 'minimal') return p.category === 'Minimal';
    if (activeTab === 'hair') return p.category === 'Hair';
    return true;
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const getProductQty = (productId: string) => quantities[productId] || 1;

  const setProductQty = (productId: string, qty: number, maxStock: number) => {
    const validQty = Math.max(1, Math.min(qty, maxStock || 1));
    setQuantities((prev) => ({ ...prev, [productId]: validQty }));
  };

  const handlePriceClick = (e: React.MouseEvent, prod: Product) => {
    e.stopPropagation();
    if (!isAuthenticated && onRequireAuth) {
      onRequireAuth({ targetView: 'product', targetProduct: prod, action: 'view-price' });
    }
  };

  const handleWishlistClick = (e: React.MouseEvent, prod: Product) => {
    e.stopPropagation();
    if (!isAuthenticated && onRequireAuth) {
      onRequireAuth({ targetView: 'product', targetProduct: prod, action: 'wishlist' });
    } else if (onToggleWishlist) {
      onToggleWishlist(prod);
      const isNowWishlisted = !wishlistIds.includes(prod.id);
      showToast(isNowWishlisted ? `❤️ Added ${prod.name} to wishlist` : `Removed from wishlist`);
    }
  };

  const handleAddToCartClick = (e: React.MouseEvent, prod: Product) => {
    e.stopPropagation();
    if (!isAuthenticated && onRequireAuth) {
      onRequireAuth({ targetView: 'product', targetProduct: prod, action: 'cart' });
      return;
    }

    const availableStock = prod.stock ?? 1;
    if (availableStock <= 0) {
      showToast(`⚠️ Sorry, ${prod.name} is currently out of stock.`);
      return;
    }

    const qty = getProductQty(prod.id);
    if (onAddToCart) {
      onAddToCart(prod, qty);
      showToast(`🛍️ Added ${qty}x ${prod.name} to shopping bag!`);
    }
  };

  const handleBuyNowAndProceed = (prod: Product, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    if (!isAuthenticated && onRequireAuth) {
      onRequireAuth({ targetView: 'product', targetProduct: prod, action: 'buy' });
      return;
    }

    const availableStock = prod.stock ?? 1;
    if (availableStock <= 0) {
      showToast(`⚠️ Sorry, ${prod.name} is currently out of stock.`);
      return;
    }

    setCheckoutProduct(prod);
    setFormError(null);
    setPaymentUtr('');
    setPaymentVerifiedSuccess(false);

    if (customerUser) {
      setCustomerName(customerUser.name || '');
      setCustomerPhone(customerUser.phone || '');
    }
  };

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

  const handleConfirmJewelleryOrder = async () => {
    setFormError(null);

    if (!checkoutProduct) return;

    if (!customerName.trim()) {
      setFormError('Delivery Details Required: Please enter your full name.');
      return;
    }
    if (!customerPhone.trim() || customerPhone.trim().length < 10) {
      setFormError('Delivery Details Required: Please enter a valid 10-digit mobile / WhatsApp number.');
      return;
    }
    if (!customerAddress.trim() || customerAddress.trim().length < 8) {
      setFormError('Delivery Details Required: Please enter complete delivery address (Door No, Street, City, Pincode).');
      return;
    }
    if (!paymentUtr.trim() || paymentUtr.trim().length < 6) {
      setFormError('Mandatory Payment: Please enter your 12-digit UPI Transaction ID from your payment app receipt.');
      return;
    }

    const selectedQty = getProductQty(checkoutProduct.id) || 1;
    const rawPrice = parseInt(checkoutProduct.price.replace(/[^0-9]/g, ''), 10) || 2500;
    const subtotal = rawPrice * selectedQty;
    const shippingFeeNum = 50;
    const totalAmountNum = subtotal + shippingFeeNum;

    const formattedItemPrice = `₹${subtotal.toLocaleString('en-IN')} (${selectedQty} Qty)`;
    const formattedShipping = `₹${shippingFeeNum}`;
    const formattedTotal = `₹${totalAmountNum.toLocaleString('en-IN')}`;

    const refCode = `JW-${Math.floor(100000 + Math.random() * 900000)}`;

    const newOrder: HennaBooking = {
      id: `jewel-order-${Date.now()}`,
      ref: refCode,
      serviceCategory: 'Jewellery Rental & Sale',
      serviceName: `${checkoutProduct.name} (${selectedQty} Qty)`,
      date: new Date().toISOString().split('T')[0],
      timeSlot: 'Express Shipping',
      location: customerAddress.trim(),
      clientName: customerName.trim(),
      clientEmail: customerUser?.email || 'client@shyamcreations.com',
      phone: customerPhone.trim(),
      wa: customerPhone.trim(),
      deliveryAddress: customerAddress.trim(),
      shippingFee: formattedShipping,
      specialRequests: `Item: ${checkoutProduct.name} | Qty: ${selectedQty} | Price: ${formattedItemPrice} | Address: ${customerAddress.trim()}`,
      status: 'Confirmed',
      type: 'jewellery',
      paymentStatus: 'Paid',
      paymentAmount: formattedTotal,
      paymentMethod: 'Google Pay / UPI',
      transactionId: paymentUtr.trim(),
    };

    // Save directly into Supabase 'jewellery_customers' table
    await insertSupabaseJewelleryCustomer({
      orderRef: refCode,
      customerName: customerName.trim(),
      phone: customerPhone.trim(),
      whatsapp: customerPhone.trim(),
      email: customerUser?.email || 'client@shyamcreations.com',
      deliveryAddress: customerAddress.trim(),
      productName: `${checkoutProduct.name} (${selectedQty} Qty)`,
      jewelleryId: checkoutProduct.id,
      itemPrice: formattedItemPrice,
      shippingFee: formattedShipping,
      totalAmount: formattedTotal,
      paymentMethod: 'Google Pay / UPI',
      upiTransactionId: paymentUtr.trim(),
      paymentStatus: 'Paid',
      orderStatus: 'Processing',
      notes: `Order placed via Express Jewellery Checkout. Courier Address: ${customerAddress.trim()}`,
    });

    // Also save directly into Supabase 'jewellery_bookings' table
    await insertSupabaseJewelleryBooking({
      bookingRef: refCode,
      clientName: customerName.trim(),
      phone: customerPhone.trim(),
      email: customerUser?.email || 'client@shyamcreations.com',
      productName: checkoutProduct.name,
      jewelleryId: checkoutProduct.id,
      bookingType: checkoutProduct.type === 'Rental' ? 'Rental' : 'Purchase',
      startDate: new Date().toISOString().split('T')[0],
      totalPrice: formattedTotal,
      location: customerAddress.trim(),
      paymentStatus: 'Paid',
      paymentMethod: 'Google Pay / UPI',
      transactionId: paymentUtr.trim(),
      status: 'Confirmed',
      notes: `Express Courier Delivery. Qty: ${selectedQty}. Address: ${customerAddress.trim()}`,
    });

    // Decrement stock in DB and App state
    await decrementProductStockInDb(checkoutProduct.id, selectedQty);
    if (onDecrementStock) {
      await onDecrementStock(checkoutProduct.id, selectedQty);
    }

    if (onAddOrder) {
      await onAddOrder(newOrder);
    }

    setConfirmedOrderCard({
      ref: refCode,
      productName: `${checkoutProduct.name} (${selectedQty} Qty)`,
      clientName: customerName.trim(),
      phone: customerPhone.trim(),
      deliveryAddress: customerAddress.trim(),
      itemPrice: formattedItemPrice,
      shippingFee: formattedShipping,
      totalAmount: formattedTotal,
      transactionId: paymentUtr.trim(),
      image: checkoutProduct.images[0],
    });

    setCheckoutProduct(null);
  };

  const openWhatsAppOrderReceipt = () => {
    if (!confirmedOrderCard) return;
    const cleanPhone = STUDIO_INFO.whatsapp.replace(/[^0-9]/g, '');
    const message = `Hello Shyam Creations Studio! I have placed a Jewellery Order on your website:\n\n🛍️ *Order Ref:* ${confirmedOrderCard.ref}\n👑 *Item:* ${confirmedOrderCard.productName}\n💰 *Item Price:* ${confirmedOrderCard.itemPrice}\n🚚 *Shipping:* ${confirmedOrderCard.shippingFee}\n💵 *Total Paid:* ${confirmedOrderCard.totalAmount}\n📲 *Verified Txn ID:* ${confirmedOrderCard.transactionId}\n\n👤 *Customer Name:* ${confirmedOrderCard.clientName}\n📞 *Phone:* ${confirmedOrderCard.phone}\n📍 *Delivery Address:* ${confirmedOrderCard.deliveryAddress}\n\nPlease dispatch my item. Thank you!`;
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const openWhatsAppRentalQuery = (prod: Product, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const cleanPhone = STUDIO_INFO.whatsapp.replace(/[^0-9]/g, '');
    const message = `Hello Shyam Creations! I am interested in renting / inquiring about this jewellery item:\n\n👑 *${prod.name}*\n🏷️ Category: ${prod.category}\n💰 Price: ${prod.price}\n📦 Stock Status: ${prod.stockLabel || 'Available'}\n📷 Image: ${prod.images[0]}\n\nPlease share availability and rental rates. Thank you!`;
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  // Helper to format MRP strikethrough price
  const getMRP = (priceStr: string) => {
    const num = parseInt(priceStr.replace(/[^0-9]/g, ''), 10);
    if (isNaN(num)) return '₹29,999';
    const mrp = Math.round(num * 1.18);
    return `₹${mrp.toLocaleString('en-IN')}`;
  };

  return (
    <div className="pt-24 pb-20 px-4 md:px-12 max-w-7xl mx-auto space-y-10 bg-[#f7f0e6] min-h-screen rounded-3xl my-4">
      {/* Toast Alert Banner */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 bg-[#1c1c1a] text-[#f3ebd9] border border-[#c79a3b] px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <span className="material-symbols-outlined text-[#c79a3b] text-xl">verified</span>
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Header & Filter Navigation */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-[#d2c5b1]/40 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold tracking-[0.25em] text-[#7b5900] uppercase">
              Shyam Creations Jewellery Vault
            </span>
            {!isAuthenticated && (
              <span className="text-[11px] text-[#7b5900] bg-[#ebdcc9] px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">lock</span>
                <span>Sign in for Prices & Bag</span>
              </span>
            )}
          </div>
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-[#1c1c1a] mt-1">
            Subi Izhai Bridal Jewellery Collection
          </h1>
          <p className="text-xs text-[#5c5446] mt-2 max-w-2xl leading-relaxed">
            Purchase directly for sale with express courier dispatch, add to shopping bag, or inquire for rental trials via WhatsApp.
          </p>
        </div>

        {/* Category Tabs & Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto bg-[#ebdcc9]/60 p-1.5 rounded-2xl border border-[#d2c5b1]/40 shrink-0">
            {(
              [
                { id: 'all', label: 'All Items' },
                { id: 'bridal', label: 'Bridal Sets' },
                { id: 'minimal', label: 'Earrings & Minimal' },
                { id: 'hair', label: 'Hair Accessories' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-[#7b5900] text-white shadow-xs'
                    : 'text-[#5c5446] hover:text-[#1c1c1a]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Bag, Wishlist & Supabase Fetch Quick Buttons */}
          <div className="flex items-center gap-2">
            {onRefreshJewellery && (
              <button
                onClick={async () => {
                  setIsSyncingDb(true);
                  try {
                    await onRefreshJewellery();
                    showToast('✨ Jewellery catalogue synced from Supabase!');
                  } catch (e) {
                    showToast('⚠️ Could not sync with Supabase.');
                  } finally {
                    setIsSyncingDb(false);
                  }
                }}
                disabled={isSyncingDb}
                className="px-3.5 py-2 bg-[#ebdcc9]/80 hover:bg-[#ebdcc9] text-[#7b5900] border border-[#d2c5b1]/40 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                title="Fetch latest jewellery data directly from Supabase"
              >
                <span className={`material-symbols-outlined text-base ${isSyncingDb ? 'animate-spin' : ''}`}>
                  sync
                </span>
                <span>{isSyncingDb ? 'Syncing...' : 'Fetch Supabase'}</span>
              </button>
            )}

            <button
              onClick={onOpenWishlist}
              className="px-3.5 py-2 bg-white hover:bg-[#ebdcc9] text-[#7b5900] border border-[#d2c5b1]/40 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <span className="material-symbols-outlined text-base text-rose-500">favorite</span>
              <span>Wishlist ({wishlistIds.length})</span>
            </button>

            <button
              onClick={onOpenCart}
              className="px-4 py-2 bg-[#7b5900] hover:bg-[#926a00] text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">shopping_bag</span>
              <span>View Bag</span>
            </button>
          </div>
        </div>
      </div>

      {/* Jewellery Catalogue Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
        {filteredProducts.map((prod) => {
          const isWishlisted = wishlistIds.includes(prod.id);
          const mrp = getMRP(prod.price);
          const maxStock = prod.stock ?? 1;
          const inStock = maxStock > 0;
          const currentQty = getProductQty(prod.id);

          return (
            <div
              key={prod.id}
              onClick={() => setSelectedDetailProduct(prod)}
              className="bg-[#f7f0e6] p-2 md:p-3 rounded-3xl transition-all cursor-pointer flex flex-col justify-between group hover:shadow-lg relative"
            >
              <div>
                {/* Product Image Box */}
                <div className="relative aspect-4/3 md:aspect-square bg-white rounded-2xl md:rounded-3xl p-6 overflow-hidden flex items-center justify-center border border-[#e8dfd1] shadow-xs">
                  <img
                    src={prod.images[0]}
                    alt={prod.name}
                    className="w-full h-full object-contain group-hover:scale-108 transition-transform duration-500"
                  />

                  {/* Wishlist Heart Icon (Top Right) */}
                  <button
                    onClick={(e) => handleWishlistClick(e, prod)}
                    className={`absolute top-3.5 right-3.5 p-2 rounded-full shadow-xs cursor-pointer z-10 transition-colors ${
                      isWishlisted
                        ? 'bg-rose-50 text-rose-600'
                        : 'bg-white/80 hover:bg-white text-stone-400 hover:text-rose-500'
                    }`}
                    title={isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
                  >
                    <span className="material-symbols-outlined text-xl">
                      {isWishlisted ? 'favorite' : 'favorite_border'}
                    </span>
                  </button>

                  {/* Category Pill Tag */}
                  <span className="absolute top-3.5 left-3.5 px-2.5 py-0.5 bg-stone-900/80 backdrop-blur-xs text-amber-300 text-[10px] font-bold uppercase tracking-wider rounded-full">
                    {prod.category}
                  </span>

                  {/* Stock Pill Tag (Bottom Left) */}
                  <span
                    className={`absolute bottom-3 left-3.5 px-2.5 py-0.5 text-[10px] font-bold rounded-full backdrop-blur-xs ${
                      !inStock
                        ? 'bg-red-900/80 text-white'
                        : maxStock <= 2
                        ? 'bg-amber-800/80 text-amber-200'
                        : 'bg-emerald-900/80 text-emerald-200'
                    }`}
                  >
                    {inStock ? `${maxStock} Available` : 'Out of Stock'}
                  </span>
                </div>

                {/* Info & Price Content */}
                <div className="pt-4 px-2 space-y-1">
                  {/* Price Row: Hidden or Unlocked */}
                  {!isAuthenticated ? (
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={(e) => handlePriceClick(e, prod)}
                        className="w-full py-2 bg-[#ebdcc9] hover:bg-[#c79a3b] text-[#7b5900] hover:text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border border-[#d2c5b1]/50 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-sm">lock</span>
                        <span>Sign In to View Price</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl md:text-2xl font-black text-[#1c1c1a]">
                        {prod.price}
                      </span>
                      <span className="text-xs md:text-sm text-[#8c8273] line-through font-normal">
                        {mrp}
                      </span>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 ml-auto">
                        98% OFF Making
                      </span>
                    </div>
                  )}

                  {/* Product Title */}
                  <h3 className="font-semibold text-sm md:text-base text-[#1c1c1a] group-hover:text-[#7b5900] transition-colors leading-snug line-clamp-2 pt-1">
                    {prod.name}
                  </h3>

                  <p className="text-xs text-[#5c5446] line-clamp-2">
                    {prod.description}
                  </p>
                </div>
              </div>

              {/* Quantity Stepper & Action Buttons */}
              <div className="pt-4 px-2 space-y-2">
                {/* Quantity Stepper (if in stock) */}
                {inStock && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center justify-between bg-white px-3 py-1.5 rounded-xl border border-[#d2c5b1]/40 text-xs font-bold"
                  >
                    <span className="text-[#5c5446]">Quantity:</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setProductQty(prod.id, currentQty - 1, maxStock)}
                        disabled={currentQty <= 1}
                        className="w-6 h-6 rounded bg-[#f6f3ef] hover:bg-[#ebdcc9] flex items-center justify-center text-xs font-bold disabled:opacity-30 cursor-pointer"
                      >
                        -
                      </button>
                      <span className="w-5 text-center">{currentQty}</span>
                      <button
                        type="button"
                        onClick={() => setProductQty(prod.id, currentQty + 1, maxStock)}
                        disabled={currentQty >= maxStock}
                        className="w-6 h-6 rounded bg-[#f6f3ef] hover:bg-[#ebdcc9] flex items-center justify-center text-xs font-bold disabled:opacity-30 cursor-pointer"
                        title={currentQty >= maxStock ? `Only ${maxStock} in stock` : 'Add one more'}
                      >
                        +
                      </button>
                    </div>
                  </div>
                )}

                {/* Primary Action Buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={(e) => handleAddToCartClick(e, prod)}
                    disabled={!inStock}
                    className="py-2.5 px-2 bg-[#ebdcc9] hover:bg-[#7b5900] text-[#7b5900] hover:text-white font-bold text-xs rounded-xl transition-all border border-[#d2c5b1]/60 flex items-center justify-center gap-1 disabled:opacity-40 cursor-pointer"
                    title="Add item to shopping bag"
                  >
                    <span className="material-symbols-outlined text-sm">add_shopping_cart</span>
                    <span>ADD TO BAG</span>
                  </button>

                  <button
                    onClick={(e) => handleBuyNowAndProceed(prod, e)}
                    disabled={!inStock}
                    className="py-2.5 px-2 bg-[#1c1c1a] hover:bg-[#7b5900] text-[#f3ebd9] font-bold text-xs rounded-xl transition-all shadow-xs flex items-center justify-center gap-1 disabled:opacity-40 cursor-pointer"
                    title="Buy now and proceed to express checkout"
                  >
                    <span className="material-symbols-outlined text-sm">shopping_bag</span>
                    <span>{inStock ? 'BUY NOW' : 'OUT OF STOCK'}</span>
                  </button>
                </div>

                <button
                  onClick={(e) => openWhatsAppRentalQuery(prod, e)}
                  className="w-full py-2 px-2 bg-[#25D366] hover:bg-[#1ebd59] text-white font-bold text-[11px] rounded-xl transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
                  title="Enquire or rent via WhatsApp"
                >
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                  </svg>
                  <span>RENT VIA WHATSAPP</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* SELECTED JEWELLERY DETAIL MODAL */}
      {selectedDetailProduct && (() => {
        const maxStock = selectedDetailProduct.stock ?? 1;
        const inStock = maxStock > 0;
        const currentQty = getProductQty(selectedDetailProduct.id);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full border border-[#d2c5b1]/40 lux-card-shadow space-y-6 relative max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="flex justify-between items-start border-b border-[#d2c5b1]/30 pb-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#7b5900] bg-[#7b5900]/10 px-3 py-1 rounded-full">
                    {selectedDetailProduct.category} Collection
                  </span>
                  <h2 className="font-serif text-2xl font-bold text-[#1c1c1a] mt-2">
                    {selectedDetailProduct.name}
                  </h2>
                </div>
                <button
                  onClick={() => setSelectedDetailProduct(null)}
                  className="p-2 bg-[#f6f3ef] hover:bg-[#e5e2de] rounded-full text-[#1c1c1a] transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>

              {/* Image Preview Box */}
              <div className="aspect-4/3 bg-[#f7f0e6] rounded-2xl p-4 border border-[#e8dfd1] flex items-center justify-center">
                <img
                  src={selectedDetailProduct.images[0]}
                  alt={selectedDetailProduct.name}
                  className="max-h-full object-contain"
                />
              </div>

              {/* Price & Stock Details */}
              <div className="space-y-2">
                {!isAuthenticated ? (
                  <div className="p-3 bg-[#f7f0e6] rounded-2xl border border-[#d2c5b1]/40 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-[#1c1c1a]">Studio Price Locked</p>
                      <p className="text-[11px] text-[#5c5446]">Sign in to unlock real-time pricing & stock</p>
                    </div>
                    <button
                      onClick={(e) => handlePriceClick(e, selectedDetailProduct)}
                      className="px-3.5 py-2 bg-[#7b5900] text-white rounded-xl text-xs font-bold hover:bg-[#926a00] cursor-pointer"
                    >
                      Sign In
                    </button>
                  </div>
                ) : (
                  <div className="flex items-baseline gap-3">
                    <span className="text-2xl font-black text-[#1c1c1a]">
                      {selectedDetailProduct.price}
                    </span>
                    <span className="text-sm text-[#8c8273] line-through font-normal">
                      {getMRP(selectedDetailProduct.price)}
                    </span>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                        inStock
                          ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                          : 'text-red-700 bg-red-50 border-red-200'
                      }`}
                    >
                      {inStock ? `${maxStock} in stock` : 'Out of stock'}
                    </span>
                  </div>
                )}

                <p className="text-xs text-[#5c5446] leading-relaxed">
                  {selectedDetailProduct.description}
                </p>
                {selectedDetailProduct.material && (
                  <div className="text-[11px] text-[#7b5900] font-semibold bg-[#7b5900]/10 p-2.5 rounded-xl">
                    ✨ Material: {selectedDetailProduct.material} | Inclusions: {selectedDetailProduct.inclusion || 'Complete Set'}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5 pt-2">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={(e) => {
                      handleAddToCartClick(e, selectedDetailProduct);
                      setSelectedDetailProduct(null);
                    }}
                    disabled={!inStock}
                    className="py-3 px-3 bg-[#ebdcc9] hover:bg-[#7b5900] text-[#7b5900] hover:text-white font-bold text-xs rounded-xl transition-all border border-[#d2c5b1]/60 flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-base">add_shopping_cart</span>
                    <span>ADD TO BAG</span>
                  </button>

                  <button
                    onClick={() => {
                      const p = selectedDetailProduct;
                      setSelectedDetailProduct(null);
                      handleBuyNowAndProceed(p);
                    }}
                    disabled={!inStock}
                    className="py-3 px-3 bg-[#1c1c1a] hover:bg-[#7b5900] text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-base">shopping_bag</span>
                    <span>BUY NOW</span>
                  </button>
                </div>

                <button
                  onClick={() => {
                    const p = selectedDetailProduct;
                    setSelectedDetailProduct(null);
                    openWhatsAppRentalQuery(p);
                  }}
                  className="w-full py-3 px-4 bg-[#25D366] hover:bg-[#1ebd59] text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                  </svg>
                  <span>RENT VIA WHATSAPP (Contact Studio)</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* DIRECT JEWELLERY CHECKOUT & PAYMENT MODAL */}
      {checkoutProduct && (() => {
        const selectedQty = getProductQty(checkoutProduct.id) || 1;
        const itemPriceNum = parseInt(checkoutProduct.price.replace(/[^0-9]/g, ''), 10) || 2500;
        const subtotal = itemPriceNum * selectedQty;
        const shippingFeeNum = 50;
        const totalPayableNum = subtotal + shippingFeeNum;
        const upiPayLink = `upi://pay?pa=sujishyamalakutti-7@okaxis&pn=Suji&am=${totalPayableNum}&cu=INR&tn=${encodeURIComponent('Jewellery Order + Delivery')}`;
        const phonepePayLink = `phonepe://pay?pa=sujishyamalakutti-7@okaxis&pn=Suji&am=${totalPayableNum}&cu=INR&tn=${encodeURIComponent('Jewellery Order + Delivery')}`;
        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(upiPayLink)}`;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 md:p-6 animate-in fade-in duration-200 overflow-y-auto">
            <div className="bg-[#fcf9f5] rounded-3xl p-5 md:p-8 max-w-2xl w-full border border-[#d2c5b1]/60 shadow-2xl space-y-6 my-6 relative max-h-[92vh] overflow-y-auto">
              {/* Header */}
              <div className="flex justify-between items-start border-b border-[#d2c5b1]/40 pb-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#7b5900] bg-[#7b5900]/10 px-3 py-1 rounded-full">
                    Direct Jewellery Purchase & Delivery
                  </span>
                  <h2 className="font-serif text-xl md:text-2xl font-bold text-[#1c1c1a] mt-1.5">
                    Express Checkout ({selectedQty} {selectedQty === 1 ? 'Item' : 'Items'})
                  </h2>
                </div>
                <button
                  onClick={() => setCheckoutProduct(null)}
                  className="p-2 bg-[#e5e2de] hover:bg-[#d2c5b1] rounded-full text-[#1c1c1a] transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>

              {/* Product Info & Shipping Price Breakdown */}
              <div className="bg-white p-4 rounded-2xl border border-[#d2c5b1]/40 shadow-xs flex flex-col sm:flex-row gap-4 items-center">
                <img
                  src={checkoutProduct.images[0]}
                  alt={checkoutProduct.name}
                  className="w-20 h-20 object-cover rounded-xl border border-[#d2c5b1]/30 shrink-0"
                />
                <div className="flex-1 space-y-1.5 text-center sm:text-left w-full">
                  <h3 className="font-serif font-bold text-[#1c1c1a] text-base leading-tight">
                    {checkoutProduct.name}
                  </h3>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1 text-xs text-[#5c5446]">
                    <span>Quantity: <strong className="text-[#1c1c1a]">{selectedQty}</strong></span>
                    <span>Item Subtotal: <strong className="text-[#1c1c1a]">₹{subtotal.toLocaleString('en-IN')}</strong></span>
                    <span>Shipping: <strong className="text-[#7b5900]">₹50</strong></span>
                  </div>
                  <div className="pt-1 flex items-center justify-between border-t border-[#f0ede9] mt-1">
                    <span className="text-xs font-bold text-[#4e4637]">Total Amount to Pay:</span>
                    <span className="text-lg font-black text-[#7b5900]">₹{totalPayableNum.toLocaleString('en-IN')}</span>
                  </div>
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

              {/* Payment Section: Google Pay / PhonePe UPI QR */}
              <div className="space-y-4 pt-2 border-t border-[#d2c5b1]/40">
                <div className="flex justify-between items-center">
                  <h3 className="font-serif font-bold text-[#1c1c1a] text-sm md:text-base flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#7b5900] text-lg">qr_code_2</span>
                    <span>2. Scan & Pay via Google Pay / PhonePe (₹{totalPayableNum.toLocaleString('en-IN')})</span>
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center bg-white p-4 rounded-2xl border border-[#d2c5b1]/40">
                  <div className="flex flex-col items-center justify-center p-2 bg-[#fcf9f5] rounded-xl border border-[#d2c5b1]/30">
                    <img
                      src={qrCodeUrl}
                      alt="UPI QR Code"
                      className="w-40 h-40 object-contain rounded-lg shadow-xs"
                    />
                    <p className="text-[10px] text-[#7b5900] font-bold mt-2">
                      Scan with any UPI App (GPay / PhonePe / Paytm)
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
                        href={gpayDeepLink(totalPayableNum)}
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
                      <span>Auto-Paste from Clipboard</span>
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

              {/* Form Error Banner */}
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-bold text-red-700 flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-red-600">error</span>
                  <span>{formError}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleConfirmJewelleryOrder}
                  className="w-full py-4 bg-[#1c1c1a] hover:bg-[#7b5900] text-[#f3ebd9] font-bold text-sm rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-lg">local_shipping</span>
                  <span>CONFIRM & PLACE JEWELLERY ORDER (₹{totalPayableNum.toLocaleString('en-IN')})</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* CONFIRMED ORDER RECEIPT CARD MODAL */}
      {confirmedOrderCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-[#fcf9f5] rounded-3xl p-6 md:p-8 max-w-lg w-full border border-[#c79a3b] shadow-2xl space-y-6 relative text-center">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <span className="material-symbols-outlined text-3xl">check_circle</span>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#7b5900] bg-[#7b5900]/10 px-3 py-1 rounded-full">
                Order Ref: {confirmedOrderCard.ref}
              </span>
              <h2 className="font-serif text-2xl font-bold text-[#1c1c1a] mt-2">
                Order Placed Successfully!
              </h2>
              <p className="text-xs text-[#5c5446] mt-1">
                Your jewellery order has been confirmed and registered with Shyam Creations Studio.
              </p>
            </div>

            {/* Receipt Summary Box */}
            <div className="bg-white p-4 rounded-2xl border border-[#d2c5b1]/40 text-left space-y-3 text-xs">
              <div className="flex items-center gap-3 border-b border-[#f0ede9] pb-3">
                <img
                  src={confirmedOrderCard.image}
                  alt={confirmedOrderCard.productName}
                  className="w-14 h-14 object-cover rounded-lg border border-[#d2c5b1]/30"
                />
                <div>
                  <h4 className="font-serif font-bold text-[#1c1c1a] text-sm">
                    {confirmedOrderCard.productName}
                  </h4>
                  <p className="text-[11px] text-[#7b5900] font-semibold">
                    Express Dispatch Scheduled
                  </p>
                </div>
              </div>

              <div className="space-y-1.5 text-[#4e4637]">
                <div className="flex justify-between">
                  <span>Jewellery Price:</span>
                  <span className="font-bold text-[#1c1c1a]">{confirmedOrderCard.itemPrice}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping Charges:</span>
                  <span className="font-bold text-[#7b5900]">{confirmedOrderCard.shippingFee}</span>
                </div>
                <div className="flex justify-between border-t border-[#f0ede9] pt-1.5 font-bold text-sm text-[#1c1c1a]">
                  <span>Total Amount Paid:</span>
                  <span className="text-[#7b5900]">{confirmedOrderCard.totalAmount}</span>
                </div>
                <div className="flex justify-between pt-1 text-[11px] text-[#5c5446]">
                  <span>UPI Transaction ID:</span>
                  <span className="font-mono font-bold text-[#1c1c1a]">{confirmedOrderCard.transactionId}</span>
                </div>
              </div>

              <div className="bg-[#f6f3ef] p-3 rounded-xl border border-[#d2c5b1]/30 space-y-1 text-[11px]">
                <p className="font-bold text-[#1c1c1a]">Deliver To:</p>
                <p className="font-semibold text-[#7b5900]">{confirmedOrderCard.clientName} ({confirmedOrderCard.phone})</p>
                <p className="text-[#5c5446]">{confirmedOrderCard.deliveryAddress}</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={openWhatsAppOrderReceipt}
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
                  setConfirmedOrderCard(null);
                  onNavigate('my-bookings');
                }}
                className="w-full py-3 bg-[#1c1c1a] hover:bg-[#7b5900] text-[#f3ebd9] font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                VIEW IN MY BOOKINGS & ORDERS
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function gpayDeepLink(amount: number) {
  return `upi://pay?pa=sujishyamalakutti-7@okaxis&pn=Suji&am=${amount}&cu=INR&tn=${encodeURIComponent('Jewellery Order + Delivery')}`;
}
