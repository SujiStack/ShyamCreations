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
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onProceedToCheckout,
  onSelectProduct,
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
        className="w-full max-w-md bg-[#fcf9f5] h-full shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-300 text-[#1c1c1a]"
      >
        {/* Header */}
        <div className="p-6 border-b border-[#d2c5b1]/40 flex justify-between items-center bg-white">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#7b5900] text-2xl">shopping_bag</span>
            <h3 className="font-serif text-xl font-bold text-[#1c1c1a]">
              Jewellery Shopping Bag
            </h3>
          </div>
          <button
            id="btn-close-cart-drawer"
            onClick={onClose}
            className="p-1.5 hover:bg-[#e5e2de] rounded-full text-[#4e4637] transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Cart Item List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {cartItems.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <div className="w-16 h-16 rounded-full bg-[#f6f3ef] border border-[#d2c5b1]/40 text-[#7b5900] flex items-center justify-center mx-auto">
                <span className="material-symbols-outlined text-3xl">remove_shopping_cart</span>
              </div>
              <h4 className="font-serif text-lg font-bold text-[#1c1c1a]">Your bag is empty</h4>
              <p className="text-xs text-[#5c5446] max-w-xs mx-auto">
                Explore our Subi Izhai bridal jewellery collection and add items to your cart.
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
                  className="p-4 bg-white border border-[#d2c5b1]/40 rounded-2xl shadow-xs flex gap-4 relative group"
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
                    className="w-20 h-20 object-cover rounded-xl bg-[#f6f3ef] cursor-pointer hover:opacity-90 transition-opacity shrink-0"
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
                          className="font-serif text-sm font-bold text-[#1c1c1a] hover:text-[#7b5900] cursor-pointer truncate"
                        >
                          {item.product.name}
                        </h4>
                        <button
                          onClick={() => onRemoveItem(item.productId)}
                          className="text-[#807665] hover:text-red-600 transition-colors p-1 cursor-pointer"
                          title="Remove item"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[#5c5446]">
                        <span className="px-2 py-0.5 bg-[#f6f3ef] rounded-md font-semibold text-[#7b5900]">
                          {item.product.type}
                        </span>
                        <span>Unit: {item.product.price}</span>
                      </div>
                    </div>

                    {/* Quantity & Stock status */}
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-[#d2c5b1]/20">
                      {/* Quantity Stepper */}
                      <div className="flex items-center gap-2 bg-[#f6f3ef] border border-[#d2c5b1]/40 rounded-lg p-1">
                        <button
                          onClick={() => onUpdateQuantity(item.productId, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                          className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold hover:bg-[#e5e2de] disabled:opacity-30 cursor-pointer"
                        >
                          -
                        </button>
                        <span className="text-xs font-bold px-2">{item.quantity}</span>
                        <button
                          onClick={() => onUpdateQuantity(item.productId, item.quantity + 1)}
                          disabled={item.quantity >= maxStock}
                          className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold hover:bg-[#e5e2de] disabled:opacity-30 cursor-pointer"
                          title={item.quantity >= maxStock ? `Only ${maxStock} in stock` : 'Add one more'}
                        >
                          +
                        </button>
                      </div>

                      <div className="text-right">
                        <p className="text-xs font-bold text-[#7b5900]">
                          ₹{itemTotal.toLocaleString('en-IN')}
                        </p>
                        <p className="text-[10px] text-[#807665]">
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
          <div className="p-6 bg-white border-t border-[#d2c5b1]/40 space-y-4">
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-[#5c5446]">
                <span>Items Subtotal</span>
                <span className="font-semibold text-[#1c1c1a]">₹{subtotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-[#5c5446]">
                <span>Insured Express Courier</span>
                <span className="font-semibold text-[#1c1c1a]">₹{shippingFee}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-[#1c1c1a] pt-2 border-t border-[#d2c5b1]/30">
                <span>Total Amount</span>
                <span className="text-[#7b5900] text-base">₹{grandTotal.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <button
              id="btn-proceed-to-checkout"
              onClick={() => {
                onProceedToCheckout();
                onClose();
              }}
              className="w-full py-3.5 bg-[#7b5900] hover:bg-[#926a00] text-white font-bold rounded-xl text-xs tracking-wider uppercase transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
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
