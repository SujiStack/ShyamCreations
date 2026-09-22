import React from 'react';
import { ViewMode, Product, PendingAuthAction } from '../types';
import { STUDIO_INFO, SERVICE_PACKAGES } from '../data/mockData';
import { ServiceCategoryKey } from './HennaBookingView';

interface HomeViewProps {
  onNavigate: (view: ViewMode, category?: ServiceCategoryKey) => void;
  onSelectProduct?: (product: Product) => void;
  products?: Product[];
  isAuthenticated?: boolean;
  onRequireAuth?: (pendingAction?: PendingAuthAction) => void;
  onAddToCart?: (product: Product) => void;
  onToggleWishlist?: (product: Product) => void;
  wishlistIds?: string[];
}

export const HomeView: React.FC<HomeViewProps> = ({
  onNavigate,
  onSelectProduct,
  products = [],
  isAuthenticated = false,
  onRequireAuth,
  onAddToCart,
  onToggleWishlist,
  wishlistIds = [],
}) => {
  const handleServiceClick = (category: ServiceCategoryKey) => {
    if (category === 'mehendi') {
      if (!isAuthenticated && onRequireAuth) {
        onRequireAuth({ targetView: 'henna-booking', targetCategory: 'mehendi', action: 'mehendi' });
      } else {
        onNavigate('henna-booking', 'mehendi');
      }
    } else {
      if (!isAuthenticated && onRequireAuth) {
        onRequireAuth({ targetView: 'product', action: 'buy' });
      } else {
        onNavigate('product');
      }
    }
  };

  const handlePriceClick = (e: React.MouseEvent, pendingAction: PendingAuthAction) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      if (onRequireAuth) onRequireAuth(pendingAction);
    } else if (pendingAction.targetView) {
      onNavigate(pendingAction.targetView, pendingAction.targetCategory as ServiceCategoryKey);
    }
  };

  return (
    <div className="pt-16">
      {/* HERO */}
      <section className="relative bg-black text-[#ded8ce] overflow-hidden">
        <div className="absolute -top-40 -left-32 w-[520px] h-[520px] rounded-full bg-[var(--sc-emerald)]/[0.14] blur-3xl pointer-events-none" />
        <div className="absolute -bottom-48 right-[-120px] w-[620px] h-[620px] rounded-full bg-[var(--sc-emerald)]/[0.10] blur-3xl pointer-events-none" />
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: 'radial-gradient(rgba(192,138,52,0.8) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />

        <div className="relative max-w-7xl mx-auto px-6 md:px-16 py-12 md:py-20 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center">
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-[10px] font-bold tracking-[0.22em] text-[var(--sc-emerald-lux)] uppercase bg-[var(--sc-emerald)]/15 px-4 py-1.5 rounded-full border border-[var(--sc-emerald)]/40">
                ✦ Artisanal Bridal Studio · Tambaram
              </span>
            </div>

            <h1 className="font-serif text-4xl md:text-5xl font-medium leading-[1.1] text-[#f6f1e7]">
              Adorning your hands,
              <br />
              <span className="text-emerald-gradient italic font-semibold">crowning your beauty.</span>
            </h1>

            <p className="text-sm text-[#a39c91] leading-relaxed max-w-xl">
              Bespoke bridal mehendi and luxury jewellery — with online booking and secure payments.
            </p>

            <div className="flex flex-wrap gap-3.5 pt-1">
              <button
                id="btn-hero-book-appointment"
                onClick={() => {
                  if (!isAuthenticated && onRequireAuth) {
                    onRequireAuth({ targetView: 'henna-booking', targetCategory: 'mehendi', action: 'mehendi' });
                  } else {
                    onNavigate('henna-booking', 'mehendi');
                  }
                }}
                className="btn-emerald px-6 py-3.5 text-white font-bold rounded-xl flex items-center gap-2 text-xs tracking-[0.14em] uppercase cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">calendar_add_on</span>
                <span>Book Appointment</span>
              </button>

              <button
                id="btn-hero-explore-jewellery"
                onClick={() => {
                  if (!isAuthenticated && onRequireAuth) {
                    onRequireAuth({ targetView: 'product', action: 'buy' });
                  } else {
                    onNavigate('product');
                  }
                }}
                className="btn-emerald-outline px-6 py-3.5 rounded-xl flex items-center gap-2 uppercase cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">diamond</span>
                <span>Jewellery</span>
              </button>

              <a
                href={`https://wa.me/919363710342?text=${encodeURIComponent('Hello Shyam Creations, I would like to inquire about booking an appointment.')}`}
                target="_blank" rel="noreferrer"
                className="px-5 py-3.5 bg-[#2C6B4F]/15 border border-[#2C6B4F]/40 text-[#5F9E7D] font-bold rounded-xl hover:bg-[#2C6B4F] hover:text-white transition-all flex items-center gap-2 text-xs tracking-[0.14em] uppercase"
              >
                <span className="material-symbols-outlined text-base">chat</span>
                <span>WhatsApp</span>
              </a>
            </div>

            <div className="grid grid-cols-3 gap-4 max-w-md pt-6 border-t border-[var(--sc-emerald)]/25">
              <div className="text-center">
                <p className="font-serif text-2xl font-bold text-[#f3ebd9]">10+</p>
                <p className="text-[9px] uppercase tracking-wider text-[#8A7F72] mt-0.5">Years Craft</p>
              </div>
              <div className="text-center">
                <p className="font-serif text-2xl font-bold text-[#f3ebd9]">100%</p>
                <p className="text-[9px] uppercase tracking-wider text-[#8A7F72] mt-0.5">Organic</p>
              </div>
              <div className="text-center">
                <p className="font-serif text-2xl font-bold text-[#f3ebd9]"><span className="material-symbols-outlined text-lg align-[-3px]">verified</span></p>
                <p className="text-[9px] uppercase tracking-wider text-[#8A7F72] mt-0.5">Secure Pay</p>
              </div>
            </div>
          </div>

          {/* Studio Card */}
          <div className="w-full">
            <div className="absolute -inset-6 bg-[var(--sc-emerald)]/[0.07] rounded-[2rem] blur-2xl pointer-events-none" />
            <div className="relative em-top-line rounded-3xl overflow-hidden animate-float">
              <div className="w-full bg-black border border-[var(--sc-emerald)]/40 rounded-3xl p-6 md:p-8 shadow-2xl">
                <div className="flex justify-between items-start border-b border-[var(--sc-emerald)]/30 pb-4 mb-6">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[var(--sc-emerald-light)] text-2xl">flutter_dash</span>
                      <h2 className="font-serif text-2xl md:text-3xl font-bold tracking-tight text-[#f3ebd9]">{STUDIO_INFO.name}</h2>
                    </div>
                    <p className="font-serif italic text-xs text-[var(--sc-emerald-light)] mt-1">"{STUDIO_INFO.tagline}"</p>
                  </div>
                  <span className="text-[10px] uppercase tracking-widest text-[#a39c91] bg-white/[0.06] px-3 py-1 rounded-full border border-[var(--sc-emerald)]/30">Studio</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-[#ded8ce]">
                  <a href={`tel:${STUDIO_INFO.phone}`} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-white/[0.04] border border-white/10 hover:border-[var(--sc-emerald)] transition-all">
                    <span className="material-symbols-outlined text-[var(--sc-emerald-light)] text-base">call</span>
                    <span className="font-semibold">{STUDIO_INFO.phone}</span>
                  </a>
                  <a href={`mailto:${STUDIO_INFO.email}`} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-white/[0.04] border border-white/10 hover:border-[var(--sc-emerald)] transition-all">
                    <span className="material-symbols-outlined text-[var(--sc-emerald-light)] text-base">mail</span>
                    <span className="font-semibold truncate">{STUDIO_INFO.email}</span>
                  </a>
                  <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-white/[0.04] border border-white/10">
                    <span className="material-symbols-outlined text-[var(--sc-emerald-light)] text-base">location_on</span>
                    <span className="font-semibold">{STUDIO_INFO.location}</span>
                  </div>
                  <a href={`https://instagram.com/${STUDIO_INFO.instagram.replace('@', '')}`} target="_blank" rel="noreferrer" className="flex items-center gap-2.5 p-2.5 rounded-lg bg-white/[0.04] border border-white/10 hover:border-[var(--sc-emerald)] transition-all">
                    <span className="material-symbols-outlined text-[var(--sc-emerald-light)] text-base">photo_camera</span>
                    <span className="font-semibold truncate">{STUDIO_INFO.instagram}</span>
                  </a>
                </div>

                <div className="mt-6 pt-4 border-t border-[var(--sc-emerald)]/25 grid grid-cols-2 gap-3 text-[11px] font-medium text-[var(--sc-emerald-light)]">
                  <div className="flex items-center gap-2"><span className="material-symbols-outlined text-base">palette</span><span>Bridal Mehendi</span></div>
                  <div className="flex items-center gap-2"><span className="material-symbols-outlined text-base">diamond</span><span>Jewellery</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-14 px-6 md:px-16 max-w-7xl mx-auto border-b border-[var(--sc-border)]/60">
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-3">
          <span className="text-xs font-bold tracking-[0.25em] text-[var(--sc-emerald-dark)] uppercase">Artisanal Studio Services</span>
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-[var(--sc-text)]">Our Specialities</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <div id="card-mehendi-service" onClick={() => handleServiceClick('mehendi')}
            className="em-top-line bg-[var(--sc-surface)] rounded-3xl p-6 md:p-8 border border-[var(--sc-border)] lux-card-shadow cursor-pointer hover:border-[var(--sc-emerald)] hover-lift transition-all flex flex-col justify-between group">
            <div>
              <div className="w-14 h-14 rounded-2xl bg-[var(--sc-emerald)]/10 text-[var(--sc-emerald-dark)] flex items-center justify-center mb-6 group-hover:bg-[var(--sc-emerald)] group-hover:text-white transition-colors">
                <span className="material-symbols-outlined text-3xl">palette</span>
              </div>
              <span className="text-[10px] uppercase tracking-widest text-[var(--sc-emerald-dark)] font-bold bg-[var(--sc-emerald)]/10 px-3 py-1 rounded-full">Signature</span>
              <h3 className="font-serif text-2xl font-bold text-[var(--sc-text)] group-hover:text-[var(--sc-emerald-dark)] transition-colors mt-3">Bridal & Occasion Mehendi</h3>
              <p className="text-xs text-[var(--sc-text-dim)] mt-3 leading-relaxed">Intricate Marwari, Arabic, and South Indian bridal mehendi with 100% organic dark stain guarantee.</p>
            </div>
            <div className="pt-8 flex items-center justify-between border-t border-[var(--sc-border)]/50 mt-6">
              {!isAuthenticated ? (
                <button onClick={(e) => handlePriceClick(e, { targetView: 'henna-booking', targetCategory: 'mehendi', action: 'view-price' })}
                  className="px-3 py-1.5 bg-[var(--sc-accent-warm)] hover:bg-[var(--sc-emerald)] text-[var(--sc-emerald-dark)] hover:text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border border-[var(--sc-border)] cursor-pointer">
                  <span className="material-symbols-outlined text-sm">lock</span>
                  <span>Sign In to View Price</span>
                </button>
              ) : (
                <span className="text-xs font-bold text-[var(--sc-emerald-dark)]">From ₹200 · Full ₹2,000+</span>
              )}
              <div className="flex items-center gap-1 text-xs font-bold text-[var(--sc-emerald-dark)] group-hover:translate-x-1 transition-transform">
                <span>Book</span><span className="material-symbols-outlined text-base">arrow_forward</span>
              </div>
            </div>
          </div>

          <div id="card-jewellery-service" onClick={() => handleServiceClick('jewellery')}
            className="em-top-line bg-[var(--sc-surface)] rounded-3xl p-6 md:p-8 border border-[var(--sc-border)] lux-card-shadow cursor-pointer hover:border-[var(--sc-emerald)] hover-lift transition-all flex flex-col justify-between group">
            <div>
              <div className="w-14 h-14 rounded-2xl bg-[var(--sc-emerald)]/10 text-[var(--sc-emerald-dark)] flex items-center justify-center mb-6 group-hover:bg-[var(--sc-emerald)] group-hover:text-white transition-colors">
                <span className="material-symbols-outlined text-3xl">diamond</span>
              </div>
              <span className="text-[10px] uppercase tracking-widest text-[var(--sc-emerald-dark)] font-bold bg-[var(--sc-emerald)]/10 px-3 py-1 rounded-full">Shyam Creations</span>
              <h3 className="font-serif text-2xl font-bold text-[var(--sc-text)] group-hover:text-[var(--sc-emerald-dark)] transition-colors mt-3">Jewellery Rentals & Sales</h3>
              <p className="text-xs text-[var(--sc-text-dim)] mt-3 leading-relaxed">Heritage Kundan sets, Polki chokers, and temple jewelry with trial appointments and online purchase.</p>
            </div>
            <div className="pt-8 flex items-center justify-between border-t border-[var(--sc-border)]/50 mt-6">
              {!isAuthenticated ? (
                <button onClick={(e) => handlePriceClick(e, { targetView: 'product', action: 'view-price' })}
                  className="px-3 py-1.5 bg-[var(--sc-accent-warm)] hover:bg-[var(--sc-emerald)] text-[var(--sc-emerald-dark)] hover:text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border border-[var(--sc-border)] cursor-pointer">
                  <span className="material-symbols-outlined text-sm">lock</span>
                  <span>Sign In to View Price</span>
                </button>
              ) : (
                <span className="text-xs font-bold text-[var(--sc-emerald-dark)]">Rentals from ₹1,200/day</span>
              )}
              <div className="flex items-center gap-1 text-xs font-bold text-[var(--sc-emerald-dark)] group-hover:translate-x-1 transition-transform">
                <span>Explore</span><span className="material-symbols-outlined text-base">arrow_forward</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Jewellery Catalogue */}
      {products.length > 0 && (
        <section className="py-14 px-6 md:px-16 max-w-7xl mx-auto border-b border-[var(--sc-border)]/60">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
            <div>
              <span className="text-xs font-bold tracking-[0.25em] text-[var(--sc-emerald-dark)] uppercase">Live Catalogue</span>
              <h2 className="font-serif text-3xl md:text-4xl font-bold text-[var(--sc-text)]">Jewellery Collection</h2>
            </div>
            <button onClick={() => onNavigate('product')}
              className="text-xs font-bold text-[var(--sc-emerald-dark)] tracking-wider uppercase flex items-center gap-1.5 hover:gap-2.5 transition-all cursor-pointer">
              <span>EXPLORE ALL</span><span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((prod) => {
              const isWishlisted = wishlistIds.includes(prod.id);
              const inStock = (prod.stock ?? 1) > 0;
              return (
                <div key={prod.id} onClick={() => { if (onSelectProduct) onSelectProduct(prod); else onNavigate('product'); }}
                  className="bg-[var(--sc-surface)] rounded-2xl overflow-hidden border border-[var(--sc-border)] lux-card-shadow group cursor-pointer hover:border-[var(--sc-emerald)] hover-lift transition-all flex flex-col">
                  <div className="relative h-64 sm:h-72 overflow-hidden bg-[var(--sc-accent-warm)]">
                    <img src={prod.images[0]} alt={prod.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <span className="absolute top-3 left-3 px-2.5 py-1 bg-[var(--sc-surface-alt)]/90 text-[#fcf9f5] text-[9px] uppercase font-bold tracking-widest rounded-full shadow-sm backdrop-blur-xs">{prod.category}</span>
                    <span className="absolute top-3 right-3 px-2.5 py-1 bg-[var(--sc-emerald)] text-white text-[9px] font-bold rounded-full shadow-sm">{prod.type}</span>
                    <button type="button" onClick={(e) => { e.stopPropagation(); if (!isAuthenticated && onRequireAuth) onRequireAuth({ targetProduct: prod, action: 'wishlist' }); else if (onToggleWishlist) onToggleWishlist(prod); }}
                      className={`absolute bottom-3 right-3 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md transition-transform active:scale-90 shadow-md ${isWishlisted ? 'bg-rose-50 text-rose-600' : 'bg-black/50 text-white hover:text-rose-400'}`}
                      title={isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}>
                      <span className="material-symbols-outlined text-lg">{isWishlisted ? 'favorite' : 'favorite_border'}</span>
                    </button>
                    <div className="absolute bottom-3 left-3">
                      <span className={`px-2 py-0.5 text-[9px] font-bold rounded-md backdrop-blur-md ${!inStock ? 'bg-red-900/80 text-white' : 'bg-black/60 text-white'}`}>
                        {inStock ? `${prod.stock} in stock` : 'Out of Stock'}
                      </span>
                    </div>
                  </div>
                  <div className="p-5 space-y-2 flex-1 flex flex-col justify-between">
                    <h3 className="font-serif text-lg font-bold text-[var(--sc-text)] group-hover:text-[var(--sc-emerald-dark)] transition-colors">{prod.name}</h3>
                    {!isAuthenticated ? (
                      <button type="button" onClick={(e) => handlePriceClick(e, { targetView: 'product', targetProduct: prod, action: 'view-price' })}
                        className="px-3 py-1.5 bg-[var(--sc-accent-warm)] hover:bg-[var(--sc-emerald)] text-[var(--sc-emerald-dark)] hover:text-white rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 border border-[var(--sc-border)] cursor-pointer">
                        <span className="material-symbols-outlined text-xs">lock</span>
                        <span>Sign In for Price</span>
                      </button>
                    ) : (
                      <span className="text-sm font-bold text-[var(--sc-emerald-dark)]">{prod.type === 'Rental' ? prod.rentalPriceDay : prod.price}</span>
                    )}
                    <span className="text-xs font-bold text-[var(--sc-text)] underline group-hover:text-[var(--sc-emerald-dark)]">View Details</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};
