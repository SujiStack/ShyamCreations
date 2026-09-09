import React, { useState } from 'react';
import { Product } from '../types';

interface WishlistDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  wishlistProducts: Product[];
  onRemoveFromWishlist: (productId: string) => void;
  onAddToCart: (product: Product) => void;
  onSelectProduct?: (product: Product) => void;
  isAuthenticated?: boolean;
  onOpenAuthModal?: () => void;
}

export const WishlistDrawer: React.FC<WishlistDrawerProps> = ({
  isOpen,
  onClose,
  wishlistProducts,
  onRemoveFromWishlist,
  onAddToCart,
  onSelectProduct,
  isAuthenticated = false,
  onOpenAuthModal,
}) => {
  const [filterAvailability, setFilterAvailability] = useState<'all' | 'available' | 'out_of_stock'>('all');

  if (!isOpen) return null;

  const inStockCount = wishlistProducts.filter((p) => (p.stock ?? 1) > 0).length;
  const outOfStockCount = wishlistProducts.length - inStockCount;

  const displayedProducts = wishlistProducts.filter((prod) => {
    const isAvailable = (prod.stock ?? 1) > 0;
    if (filterAvailability === 'available') return isAvailable;
    if (filterAvailability === 'out_of_stock') return !isAvailable;
    return true;
  });

  const handleAddAllAvailable = () => {
    const availableItems = wishlistProducts.filter((p) => (p.stock ?? 1) > 0);
    availableItems.forEach((p) => onAddToCart(p));
  };

  return (
    <div
      id="wishlist-drawer-overlay"
      className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        id="wishlist-drawer"
        className="w-full max-w-md bg-[var(--sc-bg-soft)] h-full shadow-2xl flex flex-col justify-between animate-in slide-from-right duration-300 text-[var(--sc-text)]"
      >
        {/* Header */}
        <div className="p-5 border-b border-[var(--sc-border)]/40 bg-[var(--sc-surface)]">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[var(--sc-emerald-light)] text-2xl">favorite</span>
              <div>
                <h3 className="font-serif text-xl font-bold text-[var(--sc-text)]">
                  My Jewellery Wishlist
                </h3>
                <p className="text-[11px] text-[var(--sc-text-dimmer)]">
                  {wishlistProducts.length} {wishlistProducts.length === 1 ? 'piece' : 'pieces'} saved
                </p>
              </div>
            </div>
            <button
              id="btn-close-wishlist-drawer"
              onClick={onClose}
              className="p-1.5 hover:bg-[var(--sc-accent-warm)] rounded-full text-[var(--sc-text-dim)] transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          {/* Cloud Sync Status / Auth Banner */}
          <div className="mt-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200/60 rounded-xl text-[11px] text-emerald-800 font-medium">
                <span className="material-symbols-outlined text-sm text-emerald-600">cloud_done</span>
                <span>Saved & synced to your Supabase account</span>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2 px-3 py-2 bg-amber-50/80 border border-amber-200/70 rounded-xl text-[11px] text-amber-900">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-[var(--sc-emerald-light)]">lock_clock</span>
                  <span>Sign in to store wishlist in your account</span>
                </div>
                {onOpenAuthModal && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenAuthModal();
                    }}
                    className="font-bold underline text-[var(--sc-emerald-dark)] hover:text-[#8C5F20] cursor-pointer whitespace-nowrap"
                  >
                    Sign In
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Availability Filter Chips (if more than 1 product) */}
          {wishlistProducts.length > 0 && (
            <div className="flex items-center gap-2 mt-3 pt-2 border-t border-[var(--sc-border)]/30">
              <button
                onClick={() => setFilterAvailability('all')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                  filterAvailability === 'all'
                    ? 'bg-[var(--sc-emerald)] text-white'
                    : 'bg-[var(--sc-accent-warm)] text-[var(--sc-text-dim)] hover:bg-[var(--sc-accent-warm)]'
                }`}
              >
                All ({wishlistProducts.length})
              </button>
              <button
                onClick={() => setFilterAvailability('available')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
                  filterAvailability === 'available'
                    ? 'bg-emerald-700 text-white'
                    : 'bg-[var(--sc-accent-warm)] text-emerald-800 hover:bg-emerald-100/60'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>Available ({inStockCount})</span>
              </button>
              {outOfStockCount > 0 && (
                <button
                  onClick={() => setFilterAvailability('out_of_stock')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
                    filterAvailability === 'out_of_stock'
                      ? 'bg-rose-700 text-white'
                      : 'bg-[var(--sc-accent-warm)] text-rose-800 hover:bg-rose-100/60'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                  <span>Out of Stock ({outOfStockCount})</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3.5">
          {wishlistProducts.length === 0 ? (
            <div className="text-center py-16 space-y-4">
              <div className="w-16 h-16 rounded-full bg-[var(--sc-accent-warm)] border border-[var(--sc-border)]/40 text-[var(--sc-emerald-light)] flex items-center justify-center mx-auto">
                <span className="material-symbols-outlined text-3xl">favorite_border</span>
              </div>
              <h4 className="font-serif text-lg font-bold text-[var(--sc-text)]">Your wishlist is empty</h4>
              <p className="text-xs text-[var(--sc-text-dim)] max-w-xs mx-auto">
                {isAuthenticated
                  ? 'Click the heart icon on any jewellery piece to save it to your personal wishlist for quick access.'
                  : 'Sign in to your client account to save and access your favourite jewellery pieces across all your devices.'}
              </p>
              {!isAuthenticated && onOpenAuthModal && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenAuthModal();
                  }}
                  className="px-5 py-2.5 bg-[var(--sc-emerald)] hover:bg-[var(--sc-emerald-light)] text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5 mx-auto cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">lock_open</span>
                  <span>Sign In / Register</span>
                </button>
              )}
            </div>
          ) : displayedProducts.length === 0 ? (
            <div className="text-center py-12 text-[var(--sc-text-dimmer)]">
              <p className="text-xs">No items match the selected availability filter.</p>
              <button
                onClick={() => setFilterAvailability('all')}
                className="mt-2 text-xs font-bold text-[var(--sc-emerald-dark)] underline cursor-pointer"
              >
                Show all items
              </button>
            </div>
          ) : (
            displayedProducts.map((product) => {
              const stock = product.stock ?? 1;
              const inStock = stock > 0;
              const isLowStock = inStock && stock <= 2;

              return (
                <div
                  key={product.id}
                  className="p-3.5 bg-[var(--sc-surface)] border border-[var(--sc-border)]/40 rounded-2xl shadow-xs flex gap-3.5 relative group hover:border-[var(--sc-emerald)]/60 transition-all"
                >
                  {/* Image with quick preview */}
                  <div
                    onClick={() => {
                      if (onSelectProduct) {
                        onSelectProduct(product);
                        onClose();
                      }
                    }}
                    className="w-22 h-22 rounded-xl bg-[var(--sc-accent-warm)] border border-[var(--sc-border)] overflow-hidden shrink-0 cursor-pointer relative"
                  >
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {/* Category tag overlay */}
                    <span className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/70 backdrop-blur-xs text-[9px] font-bold text-amber-300 rounded">
                      {product.category}
                    </span>
                  </div>

                  <div className="flex-1 flex flex-col justify-between min-w-0">
                    <div>
                      {/* Title and Remove Button */}
                      <div className="flex justify-between items-start gap-1.5">
                        <h4
                          onClick={() => {
                            if (onSelectProduct) {
                              onSelectProduct(product);
                              onClose();
                            }
                          }}
                          className="font-serif text-sm font-bold text-[var(--sc-text)] hover:text-[var(--sc-emerald-dark)] cursor-pointer truncate"
                          title={product.name}
                        >
                          {product.name}
                        </h4>
                        <button
                          onClick={() => onRemoveFromWishlist(product.id)}
                          className="text-[var(--sc-text-dimmer)] hover:text-red-600 transition-colors p-1 cursor-pointer shrink-0"
                          title="Remove from wishlist"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                      </div>

                      {/* Price */}
                      <p className="text-xs font-bold text-[var(--sc-emerald-dark)] mt-0.5">
                        {product.type === 'Rental'
                          ? `${product.rentalPriceDay} • Rental`
                          : product.price}
                      </p>

                      {/* Availability Badge */}
                      <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                        {inStock ? (
                          isLowStock ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                              <span>Available • Only {stock} left</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              <span>Available in Showroom ({stock} units)</span>
                            </span>
                          )
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                            <span>Currently Out of Stock</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-2 flex items-center justify-between gap-2 border-t border-[var(--sc-border)]/20 mt-2">
                      <button
                        onClick={() => {
                          if (onSelectProduct) {
                            onSelectProduct(product);
                            onClose();
                          }
                        }}
                        className="text-[11px] font-semibold text-[var(--sc-text-dim)] hover:text-[var(--sc-emerald-dark)] cursor-pointer"
                      >
                        View Details
                      </button>

                      <button
                        onClick={() => onAddToCart(product)}
                        disabled={!inStock}
                        className="px-3 py-1.5 bg-[var(--sc-emerald)] hover:bg-[var(--sc-emerald)] text-white text-[11px] font-bold rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs"
                      >
                        <span className="material-symbols-outlined text-xs">
                          {inStock ? 'add_shopping_cart' : 'block'}
                        </span>
                        <span>{inStock ? 'Add to Bag' : 'Out of Stock'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {wishlistProducts.length > 0 && (
          <div className="p-4 bg-[var(--sc-surface)] border-t border-[var(--sc-border)]/40 space-y-2.5">
            {inStockCount > 0 && (
              <button
                onClick={handleAddAllAvailable}
                className="w-full py-2.5 bg-[var(--sc-emerald)] hover:bg-[var(--sc-emerald)] text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">shopping_bag</span>
                <span>Add All Available to Bag ({inStockCount})</span>
              </button>
            )}

            <p className="text-[11px] text-[var(--sc-text-dimmer)] text-center">
              {inStockCount} of {wishlistProducts.length} items available in stock
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

