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
  onRefreshJewellery?: () => void;
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
  const [activeTab, setActiveTab] = useState<'all' | 'bridal' | 'minimal' | 'hair' | 'buy' | 'rent'>('all');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [checkoutProduct, setCheckoutProduct] = useState<Product | null>(null);
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [customerAddress, setCustomerAddress] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmedOrderCard, setConfirmedOrderCard] = useState<{
    ref: string; productName: string; clientName: string; phone: string;
    deliveryAddress: string; itemPrice: string; shippingFee: string;
    totalAmount: string; transactionId: string; image: string;
  } | null>(null);

  useEffect(() => {
    if (customerUser) {
      if (!customerName) setCustomerName(customerUser.name || '');
      if (!customerPhone) setCustomerPhone(customerUser.phone || '');
    }
  }, [customerUser]);

  useEffect(() => {
    if (product && product.id) {
      setSelectedDetailProduct(product);
    }
  }, [product?.id]);

  const displayProducts = [...products];
  if (!displayProducts.some(p => p?.id === product?.id) && product) {
    displayProducts.push(product);
  }
  const filteredProducts = displayProducts.filter((p) => p != null && (
    activeTab === 'all' ? true
    : activeTab === 'bridal' ? (p.category === 'Bridal' || p.category === 'Royal')
    : activeTab === 'minimal' ? p.category === 'Minimal'
    : activeTab === 'hair' ? p.category === 'Hair'
    : activeTab === 'buy' ? p.type === 'Sale'
    : activeTab === 'rent' ? p.type === 'Rental'
    : true
  ));

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };
  const getProductQty = (id: string) => quantities[id] || 1;
  const setProductQty = (id: string, qty: number, max: number) => {
    setQuantities((prev) => ({ ...prev, [id]: Math.max(1, Math.min(qty, max || 1)) }));
  };
  const getMRP = (priceStr: string) => {
    const num = parseInt(priceStr.replace(/[^0-9]/g, ''), 10);
    if (isNaN(num)) return '₹29,999';
    return `₹${Math.round(num * 1.18).toLocaleString('en-IN')}`;
  };

  const handlePriceClick = (e: React.MouseEvent, prod: Product) => {
    e.stopPropagation();
    if (!isAuthenticated && onRequireAuth) onRequireAuth({ targetView: 'product', targetProduct: prod, action: 'view-price' });
  };

  const handleWishlistClick = (e: React.MouseEvent, prod: Product) => {
    e.stopPropagation();
    if (!isAuthenticated && onRequireAuth) {
      onRequireAuth({ targetView: 'product', targetProduct: prod, action: 'wishlist' });
    } else if (onToggleWishlist) {
      onToggleWishlist(prod);
      showToast(!wishlistIds.includes(prod.id) ? `❤️ Added ${prod.name} to wishlist` : 'Removed from wishlist');
    }
  };

  const handleAddToCartClick = (e: React.MouseEvent, prod: Product) => {
    e.stopPropagation();
    if (!isAuthenticated && onRequireAuth) { onRequireAuth({ targetView: 'product', targetProduct: prod, action: 'cart' }); return; }
    if ((prod.stock ?? 1) <= 0) { showToast(`⚠️ ${prod.name} is out of stock.`); return; }
    const qty = getProductQty(prod.id);
    if (onAddToCart) { onAddToCart(prod, qty); showToast(`🛍️ Added ${qty}x ${prod.name} to bag!`); }
  };

  const handleBuyNowAndProceed = (prod: Product, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!isAuthenticated && onRequireAuth) { onRequireAuth({ targetView: 'product', targetProduct: prod, action: 'buy' }); return; }
    if ((prod.stock ?? 1) <= 0) { showToast(`⚠️ ${prod.name} is out of stock.`); return; }
    setCheckoutProduct(prod); setFormError(null);
    if (customerUser) { setCustomerName(customerUser.name || ''); setCustomerPhone(customerUser.phone || ''); }
  };

  const handleRazorpayJewelleryOrder = async () => {
    setFormError(null);
    if (!checkoutProduct) return;
    if (!customerName.trim()) { setFormError('Please enter your full name.'); return; }
    if (!customerPhone.trim() || customerPhone.trim().length < 10) { setFormError('Please enter a valid 10-digit mobile number.'); return; }
    if (!customerAddress.trim() || customerAddress.trim().length < 8) { setFormError('Please enter complete delivery address.'); return; }

    const qty = getProductQty(checkoutProduct.id) || 1;
    const rawPrice = parseInt(checkoutProduct.price.replace(/[^0-9]/g, ''), 10) || 2500;
    const subtotal = rawPrice * qty;
    const totalAmountNum = subtotal + 50;
    const formattedItemPrice = `₹${subtotal.toLocaleString('en-IN')} (${qty} Qty)`;
    const formattedShipping = `₹50`;
    const formattedTotal = `₹${totalAmountNum.toLocaleString('en-IN')}`;
    const refCode = `JW-${Math.floor(100000 + Math.random() * 900000)}`;

    try {
      const paymentResult = await initiateRazorpayPayment({
        bookingRef: refCode,
        orderType: checkoutProduct.type === 'Rental' ? 'jewellery_rental' : 'jewellery_single',
        amount: totalAmountNum,
        customerName: customerName.trim(),
        customerEmail: customerUser?.email || 'client@shyamcreations.com',
        customerPhone: customerPhone.trim(),
        serviceOrProductName: `${checkoutProduct.name} (${qty} Qty)`,
        notes: `Courier Address: ${customerAddress.trim()}`,
        jewelleryId: checkoutProduct.id,
        deliveryAddress: customerAddress.trim(),
        itemsToDecrement: [{ productId: checkoutProduct.id, quantity: qty }],
      });

      if (!paymentResult.success) { setFormError(paymentResult.error || 'Payment failed. Please retry.'); return; }
      const verifiedTxnId = paymentResult.razorpay_payment_id || `RZP-PAY-${Date.now()}`;

      const newOrder: HennaBooking = {
        id: `jewel-order-${Date.now()}`, ref: refCode,
        serviceCategory: 'Jewellery Rental & Sale',
        serviceName: `${checkoutProduct.name} (${qty} Qty)`,
        date: new Date().toISOString().split('T')[0], timeSlot: 'Express Shipping',
        location: customerAddress.trim(), clientName: customerName.trim(),
        clientEmail: customerUser?.email || 'client@shyamcreations.com',
        phone: customerPhone.trim(), wa: customerPhone.trim(),
        deliveryAddress: customerAddress.trim(),
        shippingFee: formattedShipping,
        specialRequests: `Item: ${checkoutProduct.name} | Qty: ${qty} | Address: ${customerAddress.trim()}`,
        status: 'Confirmed', type: 'jewellery', paymentStatus: 'Paid',
        paymentAmount: formattedTotal, paymentMethod: 'Razorpay (Online Payment)',
        transactionId: verifiedTxnId,
      };

      await insertSupabaseJewelleryCustomer({ orderRef: refCode, customerName: customerName.trim(), phone: customerPhone.trim(), whatsapp: customerPhone.trim(), email: customerUser?.email || 'client@shyamcreations.com', deliveryAddress: customerAddress.trim(), productName: `${checkoutProduct.name} (${qty} Qty)`, jewelleryId: checkoutProduct.id, itemPrice: formattedItemPrice, shippingFee: formattedShipping, totalAmount: formattedTotal, paymentMethod: 'Razorpay (Online Payment)', upiTransactionId: verifiedTxnId, paymentStatus: 'Paid', orderStatus: 'Processing', notes: `Express Jewellery Checkout. Address: ${customerAddress.trim()}` });
      await insertSupabaseJewelleryBooking({ bookingRef: refCode, clientName: customerName.trim(), phone: customerPhone.trim(), email: customerUser?.email || 'client@shyamcreations.com', productName: checkoutProduct.name, jewelleryId: checkoutProduct.id, bookingType: checkoutProduct.type === 'Rental' ? 'Rental' : 'Purchase', startDate: new Date().toISOString().split('T')[0], totalPrice: formattedTotal, location: customerAddress.trim(), paymentStatus: 'Paid', paymentMethod: 'Razorpay (Online Payment)', transactionId: verifiedTxnId, status: 'Confirmed', notes: `Express Courier. Qty: ${qty}. Address: ${customerAddress.trim()}` });
      await decrementProductStockInDb(checkoutProduct.id, qty);
      if (onDecrementStock) await onDecrementStock(checkoutProduct.id, qty);
      if (onAddOrder) await onAddOrder(newOrder);

      setConfirmedOrderCard({ ref: refCode, productName: `${checkoutProduct.name} (${qty} Qty)`, clientName: customerName.trim(), phone: customerPhone.trim(), deliveryAddress: customerAddress.trim(), itemPrice: formattedItemPrice, shippingFee: formattedShipping, totalAmount: formattedTotal, transactionId: verifiedTxnId, image: checkoutProduct.images[0] });
      setCheckoutProduct(null);
    } catch (err: any) {
      console.error('Razorpay jewellery checkout error:', err);
      setFormError(err?.message || 'Payment failed. Please retry.');
    }
  };

  const openWhatsAppOrderReceipt = () => {
    if (!confirmedOrderCard) return;
    const cleanPhone = STUDIO_INFO.whatsapp.replace(/[^0-9]/g, '');
    const message = `Hello Shyam Creations! I placed a Jewellery Order:\n🛍️ *Ref:* ${confirmedOrderCard.ref}\n👑 *Item:* ${confirmedOrderCard.productName}\n💰 *Total:* ${confirmedOrderCard.totalAmount}\n📲 *Txn ID:* ${confirmedOrderCard.transactionId}\n👤 *Name:* ${confirmedOrderCard.clientName}\n📞 *Phone:* ${confirmedOrderCard.phone}\n📍 *Address:* ${confirmedOrderCard.deliveryAddress}`;
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const [selectedDetailProduct, setSelectedDetailProduct] = useState<Product | null>(null);

  return (
    <div className="pt-20 pb-16 px-4 md:px-12 max-w-7xl mx-auto space-y-8 min-h-screen">
      {toastMessage && (
        <div className="fixed top-16 right-4 z-50 bg-[#171310] text-[#f3ebd9] border border-[var(--sc-emerald)] px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <span className="material-symbols-outlined text-[var(--sc-emerald)] text-lg">verified</span>
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-[var(--sc-border)]/40 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold tracking-[0.25em] text-[var(--sc-emerald-dark)] uppercase">Jewellery Vault</span>
            {!isAuthenticated && (
              <span className="text-[11px] text-[var(--sc-emerald-dark)] bg-[var(--sc-accent-warm)] px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">lock</span>
                <span>Sign in for Prices</span>
              </span>
            )}
          </div>
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-[var(--sc-text)] mt-1">Bridal Jewellery Collection</h1>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={onOpenWishlist} className="px-3 py-2 bg-[var(--sc-surface)] hover:bg-[var(--sc-accent-warm)] text-[var(--sc-emerald-dark)] border border-[var(--sc-border)]/40 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer">
            <span className="material-symbols-outlined text-base text-rose-500">favorite</span>
            <span>Wishlist ({wishlistIds.length})</span>
          </button>
          <button onClick={onOpenCart} className="px-4 py-2 bg-[var(--sc-emerald-dark)] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer">
            <span className="material-symbols-outlined text-base">shopping_bag</span>
            <span>Bag</span>
          </button>
        </div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto bg-[var(--sc-accent-warm)]/60 p-1.5 rounded-2xl border border-[var(--sc-border)]/40 shrink-0">
        {[
          { id: 'all', label: 'All' },
          { id: 'bridal', label: 'Bridal' },
          { id: 'minimal', label: 'Minimal' },
          { id: 'hair', label: 'Hair' },
          { id: 'buy', label: 'Buy' },
          { id: 'rent', label: 'Rent' },
        ].map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${activeTab === tab.id ? 'bg-[var(--sc-emerald-dark)] text-white shadow-xs' : 'text-[var(--sc-text-dim)] hover:text-[var(--sc-text)]'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {filteredProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <span className="material-symbols-outlined text-6xl text-[var(--sc-text-dimmer)] mb-4">inventory_2</span>
          <h3 className="font-serif text-2xl font-bold text-[var(--sc-text)] mb-2">No Jewellery Items Available</h3>
          {/* <p className="text-[var(--sc-text-dim)] max-w-md">
            The jewellery collection is currently empty. Please add items to the <code className="bg-[var(--sc-surface)] px-2 py-1 rounded">jewellery</code> table in your Supabase database, then refresh this page.
          </p> */}
          {onRefreshJewellery && (
            <button
              onClick={onRefreshJewellery}
              className="mt-6 px-5 py-2.5 bg-[var(--sc-emerald-dark)] text-white rounded-xl font-bold text-sm flex items-center gap-2 cursor-pointer hover:bg-[var(--sc-accent-warm)] transition-all"
            >
              <span className="material-symbols-outlined text-sm">refresh</span>
              Refresh Collection
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((prod) => {
            const isWishlisted = wishlistIds.includes(prod.id);
            const maxStock = prod.stock ?? 1;
            const inStock = maxStock > 0;
            const currentQty = getProductQty(prod.id);

            return (
              <div key={prod.id} onClick={() => setSelectedDetailProduct(prod)}
                className="bg-[var(--sc-bg-soft)] rounded-3xl overflow-hidden transition-all cursor-pointer group hover:shadow-lg relative border border-[var(--sc-border)]/30">
                <div className="relative aspect-[4/5] bg-[var(--sc-surface)] overflow-hidden flex items-center justify-center">
                  <img src={prod.images[0]} alt={prod.name}
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500" />
                  <button onClick={(e) => handleWishlistClick(e, prod)}
                    className="absolute top-3 right-3 p-2 rounded-full shadow-xs z-10 cursor-pointer transition-colors ${isWishlisted ? 'bg-rose-50 text-rose-600' : 'bg-white/80 hover:bg-white text-stone-400 hover:text-rose-500'}">
                    <span className="material-symbols-outlined text-lg">{isWishlisted ? 'favorite' : 'favorite_border'}</span>
                  </button>
                  <span className="absolute top-3 left-3 px-2.5 py-0.5 bg-stone-900/80 backdrop-blur-xs text-amber-300 text-[10px] font-bold uppercase rounded-full">{prod.category}</span>
                  <span className={`absolute bottom-3 left-3 px-2.5 py-0.5 text-[10px] font-bold rounded-full ${!inStock ? 'bg-red-900/80 text-white' : maxStock <= 2 ? 'bg-amber-800/80 text-amber-200' : 'bg-emerald-900/80 text-emerald-200'}`}>
                    {inStock ? `${maxStock} Available` : 'Out of Stock'}
                  </span>
                </div>

                <div className="p-4 space-y-3">
                  <h3 className="font-semibold text-base text-[var(--sc-text)] group-hover:text-[var(--sc-emerald-dark)] transition-colors leading-snug line-clamp-2">{prod.name}</h3>

                  {!isAuthenticated ? (
                    <button type="button" onClick={(e) => handlePriceClick(e, prod)}
                      className="w-full py-2.5 bg-[var(--sc-accent-warm)] hover:bg-[var(--sc-emerald)] text-[var(--sc-emerald-dark)] hover:text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border border-[var(--sc-border)]/50 cursor-pointer">
                      <span className="material-symbols-outlined text-sm">lock</span>
                      <span>Sign In to View Price</span>
                    </button>
                  ) : (
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black text-[var(--sc-text)]">{prod.price}</span>
                      <span className="text-sm text-[var(--sc-text-dimmer)] line-through">{getMRP(prod.price)}</span>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md ml-auto">98% OFF</span>
                    </div>
                  )}

                  {inStock && (
                    <div className="flex items-center justify-between bg-[var(--sc-surface)] px-3 py-1.5 rounded-xl border border-[var(--sc-border)]/40 text-xs font-bold">
                      <span className="text-[var(--sc-text-dim)]">Qty:</span>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setProductQty(prod.id, currentQty - 1, maxStock)} disabled={currentQty <= 1}
                          className="w-6 h-6 rounded bg-[var(--sc-accent-warm)] flex items-center justify-center font-bold disabled:opacity-30 cursor-pointer">-</button>
                        <span className="w-5 text-center">{currentQty}</span>
                        <button onClick={() => setProductQty(prod.id, currentQty + 1, maxStock)} disabled={currentQty >= maxStock}
                          className="w-6 h-6 rounded bg-[var(--sc-accent-warm)] flex items-center justify-center font-bold disabled:opacity-30 cursor-pointer">+</button>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button onClick={(e) => handleAddToCartClick(e, prod)} disabled={!inStock}
                      className="py-3 px-3 bg-[var(--sc-accent-warm)] hover:bg-[var(--sc-emerald-dark)] text-[var(--sc-emerald-dark)] hover:text-white font-bold text-sm rounded-xl transition-all border border-[var(--sc-border)]/60 flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer">
                      <span className="material-symbols-outlined text-base">add_shopping_cart</span>
                      <span>ADD TO CART</span>
                    </button>
                    <button onClick={(e) => handleBuyNowAndProceed(prod, e)} disabled={!inStock}
                      className="py-3 px-3 bg-[#171310] hover:bg-[var(--sc-emerald-dark)] text-[#f3ebd9] font-bold text-sm rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer">
                      <span className="material-symbols-outlined text-base">shopping_bag</span>
                      <span>{inStock ? 'BUY NOW' : 'OUT OF STOCK'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      {selectedDetailProduct && (() => {
        const maxStock = selectedDetailProduct.stock ?? 1;
        const inStock = maxStock > 0;
        const currentQty = getProductQty(selectedDetailProduct.id);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
            <div className="bg-[var(--sc-surface)] rounded-3xl p-6 md:p-8 max-w-lg w-full border border-[var(--sc-border)]/40 space-y-5 relative max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-start border-b border-[var(--sc-border)]/30 pb-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--sc-emerald-dark)] bg-[var(--sc-emerald-dark)]/10 px-3 py-1 rounded-full">{selectedDetailProduct.category}</span>
                  <h2 className="font-serif text-2xl font-bold text-[var(--sc-text)] mt-2">{selectedDetailProduct.name}</h2>
                </div>
                <button onClick={() => setSelectedDetailProduct(null)} className="p-2 hover:bg-[var(--sc-accent-warm)] rounded-full cursor-pointer">
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>
              <div className="aspect-square bg-[var(--sc-bg-soft)] rounded-2xl p-4 border border-[var(--sc-border)] flex items-center justify-center">
                <img src={selectedDetailProduct.images[0]} alt={selectedDetailProduct.name} className="max-h-full object-contain" />
              </div>
              {!isAuthenticated ? (
                <div className="p-3 bg-[var(--sc-bg-soft)] rounded-2xl border border-[var(--sc-border)]/40 flex items-center justify-between">
                  <p className="text-xs font-bold text-[var(--sc-text)]">Sign in to unlock pricing</p>
                  <button onClick={(e) => handlePriceClick(e, selectedDetailProduct)} className="px-3.5 py-2 bg-[var(--sc-emerald-dark)] text-white rounded-xl text-xs font-bold cursor-pointer">Sign In</button>
                </div>
              ) : (
                <div className="flex items-baseline gap-3">
                  <span className="text-2xl font-black text-[var(--sc-text)]">{selectedDetailProduct.price}</span>
                  <span className="text-sm text-[var(--sc-text-dimmer)] line-through">{getMRP(selectedDetailProduct.price)}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${inStock ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-red-700 bg-red-50 border-red-200'}`}>
                    {inStock ? `${maxStock} in stock` : 'Out of stock'}
                  </span>
                </div>
              )}
              <div className="space-y-2.5 pt-2">
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={(e) => { handleAddToCartClick(e, selectedDetailProduct); setSelectedDetailProduct(null); }} disabled={!inStock}
                    className="py-3 px-3 bg-[var(--sc-accent-warm)] hover:bg-[var(--sc-emerald-dark)] text-[var(--sc-emerald-dark)] hover:text-white font-bold text-sm rounded-xl transition-all border border-[var(--sc-border)]/60 flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer">
                    <span className="material-symbols-outlined text-base">add_shopping_cart</span>
                    <span>ADD TO CART</span>
                  </button>
                  <button onClick={() => { const p = selectedDetailProduct; setSelectedDetailProduct(null); handleBuyNowAndProceed(p); }} disabled={!inStock}
                    className="py-3 px-3 bg-[#171310] hover:bg-[var(--sc-emerald-dark)] text-white font-bold text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer">
                    <span className="material-symbols-outlined text-base">shopping_bag</span>
                    <span>BUY NOW</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Checkout Modal */}
      {checkoutProduct && (() => {
        const qty = getProductQty(checkoutProduct.id) || 1;
        const itemPriceNum = parseInt(checkoutProduct.price.replace(/[^0-9]/g, ''), 10) || 2500;
        const subtotal = itemPriceNum * qty;
        const totalPayableNum = subtotal + 50;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 md:p-6 animate-in fade-in duration-200 overflow-y-auto">
            <div className="bg-[var(--sc-bg-soft)] rounded-3xl p-5 md:p-8 max-w-2xl w-full border border-[var(--sc-border)]/60 shadow-2xl space-y-5 my-6 relative max-h-[92vh] overflow-y-auto">
              <div className="flex justify-between items-start border-b border-[var(--sc-border)]/40 pb-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--sc-emerald-dark)] bg-[var(--sc-emerald-dark)]/10 px-3 py-1 rounded-full">Direct Purchase</span>
                  <h2 className="font-serif text-xl md:text-2xl font-bold text-[var(--sc-text)] mt-1.5">Express Checkout ({qty} {qty === 1 ? 'Item' : 'Items'})</h2>
                </div>
                <button onClick={() => setCheckoutProduct(null)} className="p-2 hover:bg-[var(--sc-accent-warm)] rounded-full cursor-pointer">
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>
              <div className="bg-[var(--sc-surface)] p-4 rounded-2xl border border-[var(--sc-border)]/40 flex flex-col sm:flex-row gap-4 items-center">
                <img src={checkoutProduct.images[0]} alt={checkoutProduct.name} className="w-24 h-24 object-cover rounded-xl border border-[var(--sc-border)]/30 shrink-0" />
                <div className="flex-1 space-y-1.5 text-center sm:text-left">
                  <h3 className="font-serif font-bold text-[var(--sc-text)]">{checkoutProduct.name}</h3>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1 text-xs text-[var(--sc-text-dim)]">
                    <span>Qty: <strong>{qty}</strong></span>
                    <span>Subtotal: <strong>₹{subtotal.toLocaleString('en-IN')}</strong></span>
                    <span>Shipping: <strong>₹50</strong></span>
                  </div>
                  <div className="pt-1 flex items-center justify-between border-t border-[var(--sc-border)]">
                    <span className="text-xs font-bold text-[var(--sc-text-dim)]">Total:</span>
                    <span className="text-lg font-black text-[var(--sc-emerald-dark)]">₹{totalPayableNum.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="font-serif font-bold text-[var(--sc-text)] text-sm flex items-center gap-2">
                  <span className="material-symbols-outlined text-[var(--sc-emerald-dark)]">local_shipping</span>
                  Delivery Details
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[var(--sc-text-dim)] mb-1">Full Name *</label>
                    <input type="text" placeholder="e.g. Suji Shyamala" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="w-full px-3.5 py-2.5 bg-[var(--sc-surface)] border border-[var(--sc-border)]/60 rounded-xl text-xs text-[var(--sc-text)] focus:outline-none focus:border-[var(--sc-emerald-dark)]" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[var(--sc-text-dim)] mb-1">Phone *</label>
                    <input type="tel" placeholder="e.g. 9363710342" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="w-full px-3.5 py-2.5 bg-[var(--sc-surface)] border border-[var(--sc-border)]/60 rounded-xl text-xs text-[var(--sc-text)] focus:outline-none focus:border-[var(--sc-emerald-dark)]" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--sc-text-dim)] mb-1">Delivery Address *</label>
                  <textarea rows={2} placeholder="Door No, Street, Area, City, Pincode" value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} className="w-full px-3.5 py-2.5 bg-[var(--sc-surface)] border border-[var(--sc-border)]/60 rounded-xl text-xs text-[var(--sc-text)] focus:outline-none focus:border-[var(--sc-emerald-dark)] resize-none" />
                </div>
              </div>
              <div className="space-y-4 pt-2 border-t border-[var(--sc-border)]/40">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif font-bold text-[var(--sc-text)] text-sm flex items-center gap-2">
                    <span className="material-symbols-outlined text-[var(--sc-emerald-dark)]">payments</span>
                    Payment (₹{totalPayableNum.toLocaleString('en-IN')})
                  </h3>
                </div>
                <div className="bg-[var(--sc-surface)] p-4 rounded-2xl border border-[var(--sc-border)]/40 space-y-3">
                  <div className="flex items-center justify-between border-b border-[var(--sc-border)] pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">💳</span>
                      <div><h4 className="font-bold text-xs text-[var(--sc-text)]">Razorpay Secure Checkout</h4><p className="text-[11px] text-[var(--sc-text-dim)]">UPI, Cards, NetBanking, Wallets</p></div>
                    </div>
                    <span className="bg-emerald-50 text-emerald-800 font-bold text-[10px] px-2.5 py-1 rounded-full border border-emerald-200">100% Secure</span>
                  </div>
                  <div className="bg-[var(--sc-bg-soft)] p-3.5 rounded-xl border border-[var(--sc-border)]/30 flex items-center justify-between text-xs">
                    <span>Total Payable:</span>
                    <strong className="text-base text-[var(--sc-emerald-dark)]">₹{totalPayableNum.toLocaleString('en-IN')}</strong>
                  </div>
                </div>
              </div>
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-bold text-red-700 flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-red-600">error</span>
                  <span>{formError}</span>
                </div>
              )}
              <div className="pt-2">
                <button type="button" onClick={handleRazorpayJewelleryOrder}
                  className="w-full py-4 bg-[var(--sc-emerald-dark)] hover:bg-[var(--sc-emerald)] text-white font-bold text-sm rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer">
                  <span className="material-symbols-outlined text-lg">lock</span>
                  <span>PAY ₹{totalPayableNum.toLocaleString('en-IN')} & PLACE ORDER</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Confirmed Order Receipt */}
      {confirmedOrderCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-[var(--sc-bg-soft)] rounded-3xl p-6 md:p-8 max-w-lg w-full border border-[var(--sc-emerald)] shadow-2xl space-y-6 relative text-center">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-3xl">check_circle</span>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--sc-emerald-dark)] bg-[var(--sc-emerald-dark)]/10 px-3 py-1 rounded-full">Order Ref: {confirmedOrderCard.ref}</span>
              <h2 className="font-serif text-2xl font-bold text-[var(--sc-text)] mt-2">Order Placed Successfully!</h2>
            </div>
            <div className="bg-[var(--sc-surface)] p-4 rounded-2xl border border-[var(--sc-border)]/40 text-left space-y-3 text-xs">
              <div className="flex items-center gap-3 border-b border-[var(--sc-border)] pb-3">
                <img src={confirmedOrderCard.image} alt={confirmedOrderCard.productName} className="w-14 h-14 object-cover rounded-lg border border-[var(--sc-border)]/30" />
                <div><h4 className="font-serif font-bold text-[var(--sc-text)]">{confirmedOrderCard.productName}</h4></div>
              </div>
              <div className="space-y-1.5 text-[var(--sc-text-dim)]">
                <div className="flex justify-between"><span>Item Price:</span><span className="font-bold text-[var(--sc-text)]">{confirmedOrderCard.itemPrice}</span></div>
                <div className="flex justify-between"><span>Shipping:</span><span className="font-bold text-[var(--sc-emerald-dark)]">{confirmedOrderCard.shippingFee}</span></div>
                <div className="flex justify-between border-t border-[var(--sc-border)] pt-1.5 font-bold text-sm text-[var(--sc-text)]">
                  <span>Total Paid:</span><span className="text-[var(--sc-emerald-dark)]">{confirmedOrderCard.totalAmount}</span>
                </div>
                <div className="flex justify-between pt-1 text-[11px] text-[var(--sc-text-dim)]">
                  <span>Txn ID:</span><span className="font-mono font-bold text-[var(--sc-text)]">{confirmedOrderCard.transactionId}</span>
                </div>
              </div>
              <div className="bg-[var(--sc-accent-warm)] p-3 rounded-xl border border-[var(--sc-border)]/30 space-y-1 text-[11px]">
                <p className="font-bold text-[var(--sc-text)]">Deliver To:</p>
                <p className="font-semibold text-[var(--sc-emerald-dark)]">{confirmedOrderCard.clientName} ({confirmedOrderCard.phone})</p>
                <p className="text-[var(--sc-text-dim)]">{confirmedOrderCard.deliveryAddress}</p>
              </div>
            </div>
            <div className="space-y-2 pt-1">
              <button type="button" onClick={openWhatsAppOrderReceipt}
                className="w-full py-3.5 bg-[#2C6B4F] hover:bg-[#1F4D3A] text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
                <span>SEND RECEIPT ON WHATSAPP</span>
              </button>
              <button type="button" onClick={() => { setConfirmedOrderCard(null); onNavigate('my-bookings'); }}
                className="w-full py-3 bg-[#171310] hover:bg-[var(--sc-emerald-dark)] text-[#f3ebd9] font-bold text-xs rounded-xl transition-all cursor-pointer">
                VIEW MY BOOKINGS
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
