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
      if (onRequireAuth) {
        onRequireAuth(pendingAction);
      }
    } else {
      if (pendingAction.targetView) {
        onNavigate(pendingAction.targetView, pendingAction.targetCategory as ServiceCategoryKey);
      }
    }
  };

  return (
    <div className="pt-20">
      {/* HERO */}
      <section className="relative bg-black text-[#ded8ce] overflow-hidden">
        <div className="absolute -top-40 -left-32 w-[520px] h-[520px] rounded-full bg-[var(--sc-emerald)]/[0.14] blur-3xl pointer-events-none" />
        <div className="absolute -bottom-48 right-[-120px] w-[620px] h-[620px] rounded-full bg-[var(--sc-emerald)]/[0.10] blur-3xl pointer-events-none" />
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(rgba(192,138,52,0.8) 1px, transparent 1px)', backgroundSize: '28px 28px' }}
        />

        <div className="relative max-w-7xl mx-auto px-6 md:px-16 py-16 md:py-24 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: copy */}
          <div className="space-y-7">
            <div className="animate-reveal flex flex-wrap items-center gap-3">
              <span className="text-[10px] md:text-[11px] font-bold tracking-[0.22em] text-[var(--sc-emerald-lux)] uppercase bg-[var(--sc-emerald)]/15 px-4 py-1.5 rounded-full border border-[var(--sc-emerald)]/40 em-pulse">
                ✦ Artisanal Bridal Studio · Tambaram
              </span>
              {!isAuthenticated && (
                <span className="text-[11px] text-[var(--sc-emerald-lux)] flex items-center gap-1.5 bg-white/[0.06] px-3 py-1 rounded-full border border-[var(--sc-emerald)]/30">
                  <span className="material-symbols-outlined text-xs">lock</span>
                  <span>Sign in to unlock pricing</span>
                </span>
              )}
            </div>

            <h1 className="animate-reveal reveal-delay-1 font-serif text-4xl md:text-6xl font-medium leading-[1.1] text-[#f6f1e7]">
              Adorning your hands,
              <br />
              <span className="text-emerald-gradient italic font-semibold">crowning your beauty.</span>
            </h1>

            <p className="animate-reveal reveal-delay-2 text-sm md:text-base text-[#a39c91] leading-relaxed max-w-xl">
              Bespoke bridal mehendi artistry and luxury jewellery rentals &amp; sales —
              with live appointment tracking and secure online payments, from our Chennai studio to your venue.
            </p>

            {/* CTAs */}
            <div className="animate-reveal reveal-delay-3 flex flex-wrap gap-3.5 pt-1">
              <button
                id="btn-hero-book-appointment"
                onClick={() => {
                  if (!isAuthenticated && onRequireAuth) {
                    onRequireAuth({ targetView: 'henna-booking', targetCategory: 'mehendi', action: 'mehendi' });
                  } else {
                    onNavigate('henna-booking', 'mehendi');
                  }
                }}
                className="btn-emerald px-7 py-4 text-white font-bold rounded-xl flex items-center gap-2 text-xs tracking-[0.14em] uppercase cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">calendar_add_on</span>
                <span>Book Mehendi Appointment</span>
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
                className="btn-emerald-outline px-7 py-4 rounded-xl flex items-center gap-2 uppercase cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">diamond</span>
                <span>Jewellery &amp; Rentals</span>
              </button>

              <a
                href={`https://wa.me/919363710342?text=${encodeURIComponent(
                  'Hello Shyam Creations, I would like to inquire about booking an appointment.'
                )}`}
                target="_blank"
                rel="noreferrer"
                className="px-5 py-4 bg-[#2C6B4F]/15 border border-[#2C6B4F]/40 text-[#5F9E7D] font-bold rounded-xl hover:bg-[#2C6B4F] hover:text-white transition-all flex items-center gap-2 text-xs tracking-[0.14em] uppercase"
              >
                <span className="material-symbols-outlined text-base">chat</span>
                <span>WhatsApp Concierge</span>
              </a>
            </div>

            {/* Trust strip */}
            <div className="animate-reveal reveal-delay-4 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-md pt-6 border-t border-[var(--sc-emerald)]/25">
              <div className="flex items-center gap-2.5 sm:block sm:text-center">
                <span className="material-symbols-outlined text-[26px] align-[-3px] text-[var(--sc-emerald-light)] sm:hidden mr-2"></span>
                <div>
                  <p className="font-serif text-2xl md:text-3xl font-bold text-[#f3ebd9]">10+</p>
                  <p className="text-[9px] md:text-[10px] uppercase tracking-[0.18em] text-[#8A7F72] mt-0.5">Years of Craft</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 sm:block sm:text-center">
                <span className="material-symbols-outlined text-[26px] align-[-3px] text-[var(--sc-emerald-light)] sm:hidden mr-2"></span>
                <div>
                  <p className="font-serif text-2xl md:text-3xl font-bold text-[#f3ebd9]">100%</p>
                  <p className="text-[9px] md:text-[10px] uppercase tracking-[0.18em] text-[#8A7F72] mt-0.5">Organic Henna</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 sm:block sm:text-center">
                <span className="material-symbols-outlined text-[26px] align-[-3px] text-[var(--sc-emerald-light)] sm:hidden mr-2"></span>
                <div>
                  <p className="font-serif text-2xl md:text-3xl font-bold text-[#f3ebd9]">
                    <span className="material-symbols-outlined text-[26px] align-[-3px] text-[var(--sc-emerald-light)]">verified</span>
                  </p>
                  <p className="text-[9px] md:text-[10px] uppercase tracking-[0.18em] text-[#8A7F72] mt-0.5">Secure Payments</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Studio Card */}
          <div className="animate-reveal reveal-delay-2 w-full">
            <div className="absolute -inset-6 bg-[var(--sc-emerald)]/[0.07] rounded-[2rem] blur-2xl pointer-events-none" />
            <div className="relative em-top-line rounded-3xl overflow-hidden animate-float">
              <div className="w-full bg-black border border-[var(--sc-emerald)]/40 rounded-3xl p-6 md:p-8 shadow-2xl">
                <div className="absolute top-0 right-0 w-40 h-40 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[var(--sc-emerald)]/25 via-transparent to-transparent pointer-events-none" />

                <div className="flex justify-between items-start border-b border-[var(--sc-emerald)]/30 pb-4 mb-6">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[var(--sc-emerald-light)] text-2xl">flutter_dash</span>
                      <h2 className="font-serif text-2xl md:text-3xl font-bold tracking-tight text-[#f3ebd9]">
                        {STUDIO_INFO.name}
                      </h2>
                    </div>
                    <p className="font-serif italic text-xs text-[var(--sc-emerald-light)] mt-1">
                      "{STUDIO_INFO.tagline}"
                    </p>
                  </div>
                  <span className="text-[10px] uppercase tracking-widest text-[#a39c91] bg-white/[0.06] px-3 py-1 rounded-full border border-[var(--sc-emerald)]/30">
                    Studio &amp; Concierge
                  </span>
                </div>

                {/* Contact Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-[#ded8ce]">
                  <a
                    href={`tel:${STUDIO_INFO.phone}`}
                    className="flex items-center gap-2.5 p-2.5 rounded-lg bg-white/[0.04] border border-white/10 hover:border-[var(--sc-emerald)] transition-all"
                  >
                    <span className="material-symbols-outlined text-[var(--sc-emerald-light)] text-base">call</span>
                    <span className="font-semibold">{STUDIO_INFO.phone}</span>
                  </a>

                  <a
                    href={`https://instagram.com/${STUDIO_INFO.instagram.replace('@', '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2.5 p-2.5 rounded-lg bg-white/[0.04] border border-white/10 hover:border-[var(--sc-emerald)] transition-all"
                  >
                    <span className="material-symbols-outlined text-[var(--sc-emerald-light)] text-base">photo_camera</span>
                    <span className="font-semibold truncate">{STUDIO_INFO.instagram}</span>
                  </a>

                  <a
                    href={`mailto:${STUDIO_INFO.email}`}
                    className="flex items-center gap-2.5 p-2.5 rounded-lg bg-white/[0.04] border border-white/10 hover:border-[var(--sc-emerald)] transition-all"
                  >
                    <span className="material-symbols-outlined text-[var(--sc-emerald-light)] text-base">mail</span>
                    <span className="font-semibold truncate">{STUDIO_INFO.email}</span>
                  </a>

                  <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-white/[0.04] border border-white/10">
                    <span className="material-symbols-outlined text-[var(--sc-emerald-light)] text-base">location_on</span>
                    <span className="font-semibold">{STUDIO_INFO.location}</span>
                  </div>
                </div>

                {/* Core Services Badge */}
                <div className="mt-6 pt-4 border-t border-[var(--sc-emerald)]/25 grid grid-cols-2 gap-3 text-[11px] font-medium text-[var(--sc-emerald-light)]">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-base">palette</span>
                    <span>Bridal &amp; Occasion Mehendi</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-base">diamond</span>
                    <span>Jewellery Rentals &amp; Sales</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* 2 Core Services Grid */}
      <section className="py-16 px-6 md:px-16 max-w-7xl mx-auto border-b border-[var(--sc-border)]/60">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
          <span className="text-xs font-bold tracking-[0.25em] text-[var(--sc-emerald-dark)] uppercase">
            Artisanal Studio Services
          </span>
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-[var(--sc-text)]">
            Our Primary Specialities
          </h2>
          <p className="text-xs md:text-sm text-[var(--sc-text-dim)]">
            Every service is meticulously crafted at our Tambaram, Chennai studio or directly at your venue.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Service 1: Mehendi */}
             <div
            id="card-mehendi-service"
            onClick={() => handleServiceClick('mehendi')}
            className="em-top-line bg-[var(--sc-surface)] rounded-3xl p-6 md:p-8 border border-[var(--sc-border)] lux-card-shadow cursor-pointer hover:border-[var(--sc-emerald)] hover-lift transition-all flex flex-col justify-between group"
          >
            <div>
              <div className="w-14 h-14 rounded-2xl bg-[var(--sc-emerald)]/10 text-[var(--sc-emerald-dark)] flex items-center justify-center mb-6 group-hover:bg-[var(--sc-emerald)] group-hover:text-white transition-colors">
                <span className="material-symbols-outlined text-3xl">palette</span>
              </div>
              <span className="text-[10px] uppercase tracking-widest text-[var(--sc-emerald-dark)] font-bold bg-[var(--sc-emerald)]/10 px-3 py-1 rounded-full">
                Signature Service
              </span>
              <h3 className="font-serif text-2xl font-bold text-[var(--sc-text)] group-hover:text-[var(--sc-emerald-dark)] transition-colors mt-3">
                Bridal & Occasion Mehendi Artistry
              </h3>
              <p className="text-xs text-[var(--sc-text-dim)] mt-3 leading-relaxed">
                Intricate Marwari, Arabic, and South Indian bridal mehendi with 100% organic dark mahogany stain guarantee by Shyam Creations master artists.
              </p>
            </div>

            <div className="pt-8 flex items-center justify-between border-t border-[var(--sc-border)]/50 mt-6">
              {!isAuthenticated ? (
                <button
                  type="button"
                  onClick={(e) => handlePriceClick(e, { targetView: 'henna-booking', targetCategory: 'mehendi', action: 'view-price' })}
                  className="px-3 py-1.5 bg-[var(--sc-accent-warm)] hover:bg-[var(--sc-emerald)] text-[var(--sc-emerald-dark)] hover:text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border border-[var(--sc-border)]"
                >
                  <span className="material-symbols-outlined text-sm">lock</span>
                  <span>Sign In to View Price</span>
                </button>
              ) : (
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-[var(--sc-emerald-dark)]">From ₹200 · Full Bridal ₹2,000+</span>
                  <span className="text-[10px] text-[#5F9E7D] font-semibold">VIP Pricing Unlocked</span>
                </div>
              )}

              <div className="flex items-center gap-1 text-xs font-bold text-[var(--sc-emerald-dark)] group-hover:translate-x-1 transition-transform">
                <span>Reserve Slot</span>
                <span className="material-symbols-outlined text-base">arrow_forward</span>
              </div>
            </div>
          </div>

          {/* Service 2: Jewellery */}
            <div
            id="card-jewellery-service"
            onClick={() => handleServiceClick('jewellery')}
            className="em-top-line bg-[var(--sc-surface)] rounded-3xl p-6 md:p-8 border border-[var(--sc-border)] lux-card-shadow cursor-pointer hover:border-[var(--sc-emerald)] hover-lift transition-all flex flex-col justify-between group"
          >
            <div>
              <div className="w-14 h-14 rounded-2xl bg-[var(--sc-emerald)]/10 text-[var(--sc-emerald-dark)] flex items-center justify-center mb-6 group-hover:bg-[var(--sc-emerald)] group-hover:text-white transition-colors">
                <span className="material-symbols-outlined text-3xl">diamond</span>
              </div>
              <span className="text-[10px] uppercase tracking-widest text-[var(--sc-emerald-dark)] font-bold bg-[var(--sc-emerald)]/10 px-3 py-1 rounded-full">
                Shyam Creations
              </span>
              <h3 className="font-serif text-2xl font-bold text-[var(--sc-text)] group-hover:text-[var(--sc-emerald-dark)] transition-colors mt-3">
                Jewellery Rentals & Sales
              </h3>
              <p className="text-xs text-[var(--sc-text-dim)] mt-3 leading-relaxed">
                Heritage Kundan sets, Polki chokers, Guttapusalu hair accessories & temple jewelry rentals for brides with trial appointments and online purchase.
              </p>
            </div>

            <div className="pt-8 flex items-center justify-between border-t border-[var(--sc-border)]/50 mt-6">
              {!isAuthenticated ? (
                <button
                  type="button"
                  onClick={(e) => handlePriceClick(e, { targetView: 'product', action: 'view-price' })}
                  className="px-3 py-1.5 bg-[var(--sc-accent-warm)] hover:bg-[var(--sc-emerald)] text-[var(--sc-emerald-dark)] hover:text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border border-[var(--sc-border)]"
                >
                  <span className="material-symbols-outlined text-sm">lock</span>
                  <span>Sign In to View Price</span>
                </button>
              ) : (
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-[var(--sc-emerald-dark)]">Rentals from ₹1,200/day · Sets ₹4,500+</span>
                  <span className="text-[10px] text-[#5F9E7D] font-semibold">VIP Pricing Unlocked</span>
                </div>
              )}

              <div className="flex items-center gap-1 text-xs font-bold text-[var(--sc-emerald-dark)] group-hover:translate-x-1 transition-transform">
                <span>Explore Catalogue</span>
                <span className="material-symbols-outlined text-base">arrow_forward</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Jewellery Catalogue Preview (Loaded Dynamically from DB) */}
      {products.length > 0 && (
        <section className="py-16 px-6 md:px-16 max-w-7xl mx-auto border-b border-[var(--sc-border)]/60">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4">
            <div>
              <span className="text-xs font-bold tracking-[0.25em] text-[var(--sc-emerald-dark)] uppercase">
                Shyam Creations Live Catalogue
              </span>
              <h2 className="font-serif text-3xl md:text-4xl font-bold text-[var(--sc-text)]">
                Jewellery Rental & Sale Sets
              </h2>
            </div>
            <button
              onClick={() => onNavigate('product')}
              className="text-xs font-bold text-[var(--sc-emerald-dark)] tracking-wider uppercase flex items-center gap-1.5 hover:gap-2.5 transition-all cursor-pointer"
            >
              <span>EXPLORE ALL {products.length} JEWELLERY PIECES</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((prod) => {
              const isWishlisted = wishlistIds.includes(prod.id);
              const inStock = (prod.stock ?? 1) > 0;

              return (
                <div
                  key={prod.id}
                  onClick={() => {
                    if (onSelectProduct) {
                      onSelectProduct(prod);
                    } else {
                      onNavigate('product');
                    }
                  }}
                  className="bg-[var(--sc-surface)] rounded-xl md:rounded-2xl overflow-hidden border border-[var(--sc-border)] lux-card-shadow group cursor-pointer hover:border-[var(--sc-emerald)] hover-lift transition-all flex flex-col justify-between relative"
                >
                  <div>
                    <div className="relative h-44 sm:h-60 overflow-hidden bg-[var(--sc-accent-warm)]">
                      <img
                        src={prod.images[0]}
                        alt={prod.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />

                      {/* Top Badges */}
                      <span className="absolute top-3 left-3 px-2.5 py-1 bg-[var(--sc-surface-alt)]/90 text-[#fcf9f5] text-[9px] uppercase font-bold tracking-widest rounded-full shadow-sm backdrop-blur-xs">
                        {prod.category}
                      </span>
                      <span className="absolute top-3 right-3 px-2.5 py-1 bg-[var(--sc-emerald)] text-white text-[9px] font-bold rounded-full shadow-sm">
                        {prod.type}
                      </span>

                      {/* Heart / Wishlist Icon */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!isAuthenticated && onRequireAuth) {
                            onRequireAuth({ targetProduct: prod, action: 'wishlist' });
                          } else if (onToggleWishlist) {
                            onToggleWishlist(prod);
                          }
                        }}
                        className={`absolute bottom-3 right-3 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md transition-transform active:scale-90 shadow-md ${
                          isWishlisted
                            ? 'bg-rose-50 text-rose-600'
                            : 'bg-black/50 text-white hover:text-rose-400'
                        }`}
                        title={isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
                      >
                        <span className="material-symbols-outlined text-lg">
                          {isWishlisted ? 'favorite' : 'favorite_border'}
                        </span>
                      </button>

                      {/* Stock availability indicator */}
                      <div className="absolute bottom-3 left-3">
                        <span
                          className={`px-2 py-0.5 text-[9px] font-bold rounded-md backdrop-blur-md ${
                            !inStock
                              ? 'bg-red-900/80 text-white'
                              : prod.stock <= 2
                              ? 'bg-amber-900/80 text-amber-200'
                              : 'bg-black/60 text-white'
                          }`}
                        >
                          {inStock ? `${prod.stock} in stock` : 'Out of Stock'}
                        </span>
                      </div>
                    </div>

                    <div className="p-5 space-y-2">
                      <h3 className="font-serif text-lg font-bold text-[var(--sc-text)] group-hover:text-[var(--sc-emerald-dark)] transition-colors">
                        {prod.name}
                      </h3>
                      <p className="text-xs text-[var(--sc-text-dim)] line-clamp-2 leading-relaxed">
                        {prod.description}
                      </p>
                    </div>
                  </div>

                  <div className="p-5 pt-0 flex items-center justify-between border-t border-[var(--sc-border)]/50 mt-2">
                    {!isAuthenticated ? (
                      <button
                        type="button"
                        onClick={(e) =>
                          handlePriceClick(e, {
                            targetView: 'product',
                            targetProduct: prod,
                            action: 'view-price',
                          })
                        }
                        className="px-3 py-1 bg-[var(--sc-accent-warm)] hover:bg-[var(--sc-emerald)] text-[var(--sc-emerald-dark)] hover:text-white rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 border border-[var(--sc-border)]"
                      >
                        <span className="material-symbols-outlined text-xs">lock</span>
                        <span>Sign In for Price</span>
                      </button>
                    ) : (
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-[var(--sc-emerald-dark)]">
                          {prod.type === 'Rental' ? prod.rentalPriceDay : prod.price}
                        </span>
                        <span className="text-[10px] text-[var(--sc-text-dimmer)]">
                          {prod.type === 'Rental' ? 'Per Day Rate' : 'Direct Purchase'}
                        </span>
                      </div>
                    )}

                    <span className="text-xs font-bold text-[var(--sc-text)] underline group-hover:text-[var(--sc-emerald-dark)]">
                      Details & Order
                    </span>
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
