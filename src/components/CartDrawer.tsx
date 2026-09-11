import React from 'react';
import { CartItem, Product } from '../types';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onUpdateQuantity: (productId: string, newQty: number) => void;
  onRemoveItem: (productId: string) => void;
  onProceedToCheckout: () => void;
  onSelectProduct?: (product: Product) => void;
  isAuthenticated?: boolean;
  onOpenAuthModal?: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onProceedToCheckout,
  onSelectProduct,
  isAuthenticated = false,
  onOpenAuthModal,
}) => {
  if (!isOpen) return null;

  const calculateSubtotal = () => {
    return cartItems.reduce((sum, item) => {
      const priceStr = item.product.price || '₹2,500';
      const num = parseInt(priceStr.replace(/[^0-9]/g, ''), 10) || 2500;
      return sum + num * item.quantity;
    }, 0);
  };

  const subtotal = calculateSubtotal();
  const shippingFee = cartItems.length > 0 ? 50 : 0;
  const grandTotal = subtotal + shippingFee;

  const renderContent = () => {
    if (!isAuthenticated) {
      return (
        <div className="text-center py-16 space-y-4">
          <div className="w-16 h-16 rounded-full bg-[var(--sc-accent-warm)] border border-[var(--sc-border)]/40 text-[var(--sc-emerald-dark)] flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-3xl">lock</span>
          </div>
          <h4 className="font-serif text-lg font-bold text-[var(--sc-text)]">Sign In to View Your Bag</h4>
          <p className="text-sm text-[var(--sc-text-dim)] max-w-xs mx-auto">Your bag is private to your account.</p>
          {onOpenAuthModal && (
            <button type="button" onClick={() => { onClose(); onOpenAuthModal(); }}
              className="px-6 py-3 bg-[var(--sc-emerald)] hover:bg-[var(--sc-emerald-light)] text-white font-bold rounded-xl text-sm tracking-wider uppercase shadow-md cursor-pointer transition-all">
              Sign In / Sign Up
            </button>
          )}
        </div>
      );
    }

    if (cartItems.length === 0) {
      return (
        <div className="text-center py-16 space-y-3">
          <div className="w-16 h-16 rounded-full bg-[var(--sc-accent-warm)] border border-[var(--sc-border)]/40 text-[var(--sc-emerald-dark)] flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-3xl">remove_shopping_cart</span>
          </div>
          <h4 className="font-serif text-lg font-bold text-[var(--sc-text)]">Your bag is empty</h4>
          <p className="text-sm text-[var(--sc-text-dim)] max-w-xs mx-auto">Explore our jewellery collection.</p>
          <button type="button" onClick={onClose}
            className="px-6 py-3 bg-[var(--sc-emerald-dark)] hover:bg-[var(--sc-emerald)] text-white font-bold rounded-xl text-sm cursor-pointer transition-all">
            Browse Jewellery
          </button>
        </div>
      );
    }

    return cartItems.map((item) => {
      const unitPriceNum = parseInt(item.product.price.replace(/[^0-9]/g, ''), 10) || 2500;
      const itemTotal = unitPriceNum * item.quantity;
      const maxStock = item.product.stock ?? 1;
      return (
        <div key={item.productId} className="p-3 bg-[var(--sc-surface)] border border-[var(--sc-border)]/40 rounded-2xl shadow-xs flex gap-3 relative group">
          <img src={item.product.images[0]} alt={item.product.name}
            onClick={() => { if (onSelectProduct) { onSelectProduct(item.product); onClose(); } }}
            className="w-16 h-16 object-cover rounded-xl bg-[var(--sc-accent-warm)] cursor-pointer hover:opacity-90 transition-opacity shrink-0" />
          <div className="flex-1 flex flex-col justify-between min-w-0">
            <div className="flex justify-between items-start gap-2">
              <h4 onClick={() => { if (onSelectProduct) { onSelectProduct(item.product); onClose(); } }}
                className="font-serif text-sm font-bold text-[var(--sc-text)] hover:text-[var(--sc-emerald-dark)] cursor-pointer truncate">
                {item.product.name}
              </h4>
              <button onClick={() => onRemoveItem(item.productId)} className="text-[var(--sc-text-dimmer)] hover:text-red-600 transition-colors p-1 cursor-pointer">
                <span className="material-symbols-outlined text-sm">delete</span>
              </button>
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-[var(--sc-border)]/20">
              <div className="flex items-center gap-1.5 bg-[var(--sc-accent-warm)] border border-[var(--sc-border)]/40 rounded-lg p-1">
                <button onClick={() => onUpdateQuantity(item.productId, item.quantity - 1)} disabled={item.quantity <= 1}
                  className="w-5 h-5 rounded flex items-center justify-center text-xs font-bold hover:bg-[var(--sc-accent-warm)] disabled:opacity-30 cursor-pointer">-</button>
                <span className="text-xs font-bold px-1.5">{item.quantity}</span>
                <button onClick={() => onUpdateQuantity(item.productId, item.quantity + 1)} disabled={item.quantity >= maxStock}
                  className="w-5 h-5 rounded flex items-center justify-center text-xs font-bold hover:bg-[var(--sc-accent-warm)] disabled:opacity-30 cursor-pointer">+</button>
              </div>
              <p className="text-sm font-bold text-[var(--sc-emerald-dark)]">₹{itemTotal.toLocaleString('en-IN')}</p>
            </div>
          </div>
        </div>
      );
    });
  };

  return (
    <div id="cart-drawer-overlay" className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200" onClick={onClose}>
      <div id="cart-drawer" className="w-full max-w-md bg-[var(--sc-bg-soft)] h-full shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-300 text-[var(--sc-text)]" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-[var(--sc-border)]/40 flex justify-between items-center bg-[var(--sc-surface)]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[var(--sc-emerald-dark)] text-xl">shopping_bag</span>
            <h3 className="font-serif text-lg font-bold text-[var(--sc-text)]">Shopping Bag</h3>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-[var(--sc-accent-warm)] rounded-full cursor-pointer">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {renderContent()}
        </div>

        {cartItems.length > 0 && (
          <div className="p-5 bg-[var(--sc-surface)] border-t border-[var(--sc-border)]/40 space-y-4">
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-[var(--sc-text-dim)]">
                <span>Subtotal</span><span className="font-semibold text-[var(--sc-text)]">₹{subtotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-[var(--sc-text-dim)]">
                <span>Shipping</span><span className="font-semibold text-[var(--sc-text)]">₹{shippingFee}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-[var(--sc-text)] pt-2 border-t border-[var(--sc-border)]/30">
                <span>Total</span><span className="text-[var(--sc-emerald-dark)] text-lg">₹{grandTotal.toLocaleString('en-IN')}</span>
              </div>
            </div>
            <button id="btn-proceed-to-checkout" onClick={() => { onProceedToCheckout(); onClose(); }}
              className="w-full py-3.5 bg-[var(--sc-emerald)] hover:bg-[var(--sc-emerald)] text-white font-bold rounded-xl text-sm tracking-wider uppercase transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer">
              <span className="material-symbols-outlined text-base">shopping_cart_checkout</span>
              <span>PROCEED TO CHECKOUT ({cartItems.length} {cartItems.length === 1 ? 'Item' : 'Items'})</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};