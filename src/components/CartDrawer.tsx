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

  return (
    <div
      id="cart-drawer-overlay"
      className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        id="cart-drawer"
        className="w-full max-w-md bg-[var(--sc-bg-soft)] h-full shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-300 text-[var(--sc-text)]"
      >
        {/* Header */}
        <div className="p-6 border-b border-[var(--sc-border)]/40 flex justify-between items-center bg-[var(--sc-surface)]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[var(--sc-emerald-dark)] text-2xl">shopping_bag</span>
            <h3 className="font-serif text-xl font-bold text-[var(--sc-text)]">
              Jewellery Shopping Bag
            </h3>
          </div>
          <button
            id="btn-close-cart-drawer"
            onClick={onClose}
            className="p-1.5 hover:bg-[var(--sc-accent-warm)] rounded-full text-[var(--sc-text-dim)] transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Cart Item List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {!isAuthenticated ? (
            <div className="text-center py-16 space-y-4">
              <div className="w-16 h-16 rounded-full bg-[var(--sc-accent-warm)] border border-[var(--sc-border)]/40 text-[var(--sc-emerald-dark)] flex items-center justify-center mx-auto">
                <span className="material-symbols-outlined text-3xl">lock</span>
              </div>
              <h4 className="font-serif text-lg font-bold text-[var(--sc-text)]">Sign In to View Your Bag</h4>
              <p className="text-xs text-[var(--sc-text-dim)] max-w-xs mx-auto">
                Your shopping bag is private to your registered account. Please sign in or create an account to view and manage your items.
              </p>
              {onOpenAuthModal && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenAuthModal();
                  }}
                  className="px-6 py-2.5 bg-[var(--sc-emerald)] hover:bg-[var(--sc-emerald-light)] text-[var(--sc-text)] font-bold rounded-xl text-xs tracking-wider uppercase shadow-md cursor-pointer transition-all"
                >
                  Sign In / Sign Up
                </button>
              )}
            </div>
          ) : cartItems.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <div className="w-16 h-16 rounded-full bg-[var(--sc-accent-warm)] border border-[var(--sc-border)]/40 text-[var(--sc-emerald-dark)] flex items-center justify-center mx-auto">
                <span className="material-symbols-outlined text-3xl">remove_shopping_cart</span>
              </div>
              <h4 className="font-serif text-lg font-bold text-[var(--sc-text)]">Your bag is empty</h4>
              <p className="text-xs text-[var(--sc-text-dim)] max-w-xs mx-auto">
                Explore our Shyam Creations bridal jewellery collection and add items to your cart.
              </p>
            </div>
          ) : (
            cartItems.map((item) => {
              const unitPriceNum = parseInt(item.product.price.replace(/[^0-9]/g, ''), 10) || 2500;
              const itemTotal = unitPriceNum * item.quantity;
              const maxStock = item.product.stock ?? 1;

              return (
                <div
                  key={item.productId}
                  className="p-4 bg-[var(--sc-surface)] border border-[var(--sc-border)]/40 rounded-2xl shadow-xs flex gap-4 relative group"
                >
                  {/* Thumbnail */}
                  <img
                    src={item.product.images[0]}
                    alt={item.product.name}
                    onClick={() => {
                      if (onSelectProduct) {
                        onSelectProduct(item.product);
                        onClose();
                      }
                    }}
                    className="w-20 h-20 object-cover rounded-xl bg-[var(--sc-accent-warm)] cursor-pointer hover:opacity-90 transition-opacity shrink-0"
                  />

                  {/* Info */}
                  <div className="flex-1 flex flex-col justify-between min-w-0">
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <h4
                          onClick={() => {
                            if (onSelectProduct) {
                              onSelectProduct(item.product);
                              onClose();
                            }
                          }}
                          className="font-serif text-sm font-bold text-[var(--sc-text)] hover:text-[var(--sc-emerald-dark)] cursor-pointer truncate"
                        >
                          {item.product.name}
                        </h4>
                        <button
                          onClick={() => onRemoveItem(item.productId)}
                          className="text-[var(--sc-text-dimmer)] hover:text-red-600 transition-colors p-1 cursor-pointer"
                          title="Remove item"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[var(--sc-text-dim)]">
                        <span className="px-2 py-0.5 bg-[var(--sc-accent-warm)] rounded-md font-semibold text-[var(--sc-emerald-dark)]">
                          {item.product.type}
                        </span>
                        <span>Unit: {item.product.price}</span>
                      </div>
                    </div>

                    {/* Quantity & Stock status */}
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-[var(--sc-border)]/20">
                      {/* Quantity Stepper */}
                      <div className="flex items-center gap-2 bg-[var(--sc-accent-warm)] border border-[var(--sc-border)]/40 rounded-lg p-1">
                        <button
                          onClick={() => onUpdateQuantity(item.productId, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                          className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold hover:bg-[var(--sc-accent-warm)] disabled:opacity-30 cursor-pointer"
                        >
                          -
                        </button>
                        <span className="text-xs font-bold px-2">{item.quantity}</span>
                        <button
                          onClick={() => onUpdateQuantity(item.productId, item.quantity + 1)}
                          disabled={item.quantity >= maxStock}
                          className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold hover:bg-[var(--sc-accent-warm)] disabled:opacity-30 cursor-pointer"
                          title={item.quantity >= maxStock ? `Only ${maxStock} in stock` : 'Add one more'}
                        >
                          +
                        </button>
                      </div>

                      <div className="text-right">
                        <p className="text-xs font-bold text-[var(--sc-emerald-dark)]">
                          ₹{itemTotal.toLocaleString('en-IN')}
                        </p>
                        <p className="text-[10px] text-[var(--sc-text-dimmer)]">
                          {maxStock <= 2 ? (
                            <span className="text-amber-700 font-semibold">Only {maxStock} left</span>
                          ) : (
                            <span>{maxStock} in stock</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer with Summary & Checkout */}
        {cartItems.length > 0 && (
          <div className="p-6 bg-[var(--sc-surface)] border-t border-[var(--sc-border)]/40 space-y-4">
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-[var(--sc-text-dim)]">
                <span>Items Subtotal</span>
                <span className="font-semibold text-[var(--sc-text)]">₹{subtotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-[var(--sc-text-dim)]">
                <span>Insured Express Courier</span>
                <span className="font-semibold text-[var(--sc-text)]">₹{shippingFee}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-[var(--sc-text)] pt-2 border-t border-[var(--sc-border)]/30">
                <span>Total Amount</span>
                <span className="text-[var(--sc-emerald-dark)] text-base">₹{grandTotal.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <button
              id="btn-proceed-to-checkout"
              onClick={() => {
                onProceedToCheckout();
                onClose();
              }}
              className="w-full py-3.5 bg-[var(--sc-emerald)] hover:bg-[var(--sc-emerald)] text-white font-bold rounded-xl text-xs tracking-wider uppercase transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">shopping_cart_checkout</span>
              <span>PROCEED TO PURCHASE ({cartItems.length} {cartItems.length === 1 ? 'Item' : 'Items'})</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
