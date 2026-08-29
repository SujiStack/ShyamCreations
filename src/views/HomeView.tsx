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
      onNavigate('henna-booking', 'mehendi');
    } else {
      onNavigate('product');
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
      {/* Business Card Luxury Banner */}
      <section className="bg-[#1c1c1a] text-[#ded8ce] py-12 px-6 md:px-16 border-b border-[#c79a3b]/30">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-8">
          
          {/* Card Digital Rendering */}
          <div className="w-full lg:w-1/2 bg-gradient-to-br from-[#2b2b28] via-[#1a1a18] to-[#0f0f0e] border border-[#c79a3b]/40 rounded-2xl p-6 md:p-8 shadow-2xl relative overflow-hidden group">
            {/* Gold Corner Accents */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#c79a3b]/20 via-transparent to-transparent pointer-events-none" />
            
            <div className="flex justify-between items-start border-b border-[#c79a3b]/30 pb-4 mb-6">
              <div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#c79a3b] text-2xl">flutter_dash</span>
                  <h1 className="font-serif text-2xl md:text-3xl font-bold tracking-tight text-[#f3ebd9]">
                    {STUDIO_INFO.name}
                  </h1>
                </div>
                <p className="font-serif italic text-xs text-[#c79a3b] mt-1">
                  "{STUDIO_INFO.tagline}"
                </p>
              </div>
              <span className="text-[10px] uppercase tracking-widest text-[#a39c91] bg-[#2d2d2a] px-3 py-1 rounded-full border border-[#c79a3b]/30">
                Studio & Concierge
              </span>
            </div>

            {/* Contact Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-[#ded8ce]">
              <a
                href={`tel:${STUDIO_INFO.phone}`}
                className="flex items-center gap-2.5 p-2.5 rounded-lg bg-[#252522] border border-[#3d3d38] hover:border-[#c79a3b] transition-all"
              >
                <span className="material-symbols-outlined text-[#c79a3b] text-base">call</span>
                <span className="font-semibold">{STUDIO_INFO.phone}</span>
              </a>

              <a
                href={`https://instagram.com/${STUDIO_INFO.instagram.replace('@', '')}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2.5 p-2.5 rounded-lg bg-[#252522] border border-[#3d3d38] hover:border-[#c79a3b] transition-all"
              >
                <span className="material-symbols-outlined text-[#c79a3b] text-base">photo_camera</span>
                <span className="font-semibold truncate">{STUDIO_INFO.instagram}</span>
              </a>

              <a
                href={`mailto:${STUDIO_INFO.email}`}
                className="flex items-center gap-2.5 p-2.5 rounded-lg bg-[#252522] border border-[#3d3d38] hover:border-[#c79a3b] transition-all"
              >
                <span className="material-symbols-outlined text-[#c79a3b] text-base">mail</span>
                <span className="font-semibold truncate">{STUDIO_INFO.email}</span>
              </a>

              <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-[#252522] border border-[#3d3d38]">
                <span className="material-symbols-outlined text-[#c79a3b] text-base">location_on</span>
                <span className="font-semibold">{STUDIO_INFO.location}</span>
              </div>
            </div>

            {/* Two Primary Core Services Badge */}
            <div className="mt-6 pt-4 border-t border-[#c79a3b]/20 grid grid-cols-2 gap-3 text-[11px] font-medium text-[#c79a3b]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-base">palette</span>
                <span>Bridal & Occasion Mehendi</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-base">diamond</span>
                <span>Subi Izhai Jewellery Rentals & Sales</span>
              </div>
            </div>
          </div>

          {/* Call to Actions & Welcome Header */}
          <div className="w-full lg:w-1/2 space-y-6">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold tracking-[0.2em] text-[#c79a3b] uppercase bg-[#c79a3b]/10 px-3 py-1 rounded-full border border-[#c79a3b]/30 inline-block">
                Welcome to Shyam Creations
              </span>
              {!isAuthenticated && (
                <span className="text-[11px] text-[#e2bd70] flex items-center gap-1 bg-[#252522] px-2.5 py-0.5 rounded-full border border-[#c79a3b]/30">
                  <span className="material-symbols-outlined text-xs">lock</span>
                  <span>Sign in to unlock pricing</span>
                </span>
              )}
            </div>

            <h1 className="font-serif text-3xl md:text-5xl font-normal text-[#f3ebd9] leading-tight">
              Adorning your hands, <br />
              <span className="text-[#c79a3b] italic">Crowning your beauty.</span>
            </h1>
            <p className="text-xs md:text-sm text-[#a39c91] leading-relaxed">
              Your premier bridal studio in Tambaram, Chennai specializing exclusively in bespoke bridal mehendi artistry and Subi Izhai luxury jewellery rentals & sales, with full online appointment tracking.
            </p>

            <div className="flex flex-wrap gap-4 pt-2">
              <button
                id="btn-hero-book-appointment"
                onClick={() => {
                  if (!isAuthenticated && onRequireAuth) {
                    onRequireAuth({ targetView: 'henna-booking', targetCategory: 'mehendi', action: 'mehendi' });
                  } else {
                    onNavigate('henna-booking', 'mehendi');
                  }
                }}
                className="btn-royal px-6 py-3.5 bg-[#c79a3b] text-[#1c1c1a] font-bold rounded-lg hover:bg-[#e2bd70] transition-all flex items-center gap-2 shadow-lg cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">calendar_add_on</span>
                <span>BOOK MEHENDI APPOINTMENT</span>
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
                className="px-6 py-3.5 bg-[#252522] border border-[#c79a3b]/50 text-[#c79a3b] font-bold rounded-lg hover:bg-[#c79a3b] hover:text-[#1c1c1a] transition-all flex items-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">diamond</span>
                <span>JEWELLERY & RENTALS</span>
              </button>

              <a
                href={`https://wa.me/919363710342?text=${encodeURIComponent(
                  'Hello Shyam Creations, I would like to inquire about booking an appointment.'
                )}`}
                target="_blank"
                rel="noreferrer"
                className="px-5 py-3.5 bg-[#25d366]/20 border border-[#25d366]/40 text-[#25d366] font-bold rounded-lg hover:bg-[#25d366] hover:text-white transition-all flex items-center gap-2 text-xs"
              >
                <span className="material-symbols-outlined text-base">chat</span>
                <span>WHATSAPP CONCIERGE</span>
              </a>
            </div>
          </div>

        </div>
      </section>

      {/* 2 Core Services Grid */}
      <section className="py-16 px-6 md:px-16 max-w-7xl mx-auto border-b border-[#d2c5b1]/30">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
          <span className="text-xs font-bold tracking-[0.25em] text-[#7b5900] uppercase">
            Artisanal Studio Services
          </span>
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-[#1c1c1a]">
            Our Primary Specialities
          </h2>
          <p className="text-xs md:text-sm text-[#5c5446]">
            Every service is meticulously crafted at our Tambaram, Chennai studio or directly at your venue.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Service 1: Mehendi */}
          <div
            id="card-mehendi-service"
            onClick={() => handleServiceClick('mehendi')}
            className="bg-white rounded-3xl p-8 border border-[#d2c5b1]/40 lux-card-shadow cursor-pointer hover:border-[#7b5900] transition-all flex flex-col justify-between group"
          >
            <div>
              <div className="w-14 h-14 rounded-2xl bg-[#7b5900]/10 text-[#7b5900] flex items-center justify-center mb-6 group-hover:bg-[#7b5900] group-hover:text-white transition-colors">
                <span className="material-symbols-outlined text-3xl">palette</span>
              </div>
              <span className="text-[10px] uppercase tracking-widest text-[#7b5900] font-bold bg-[#7b5900]/10 px-3 py-1 rounded-full">
                Signature Service
              </span>
              <h3 className="font-serif text-2xl font-bold text-[#1c1c1a] group-hover:text-[#7b5900] transition-colors mt-3">
                Bridal & Occasion Mehendi Artistry
              </h3>
              <p className="text-xs text-[#5c5446] mt-3 leading-relaxed">
                Intricate Marwari, Arabic, and South Indian bridal mehendi with 100% organic dark mahogany stain guarantee by Shyam Creations master artists.
              </p>
            </div>

            <div className="pt-8 flex items-center justify-between border-t border-[#d2c5b1]/20 mt-6">
              {!isAuthenticated ? (
                <button
                  type="button"
                  onClick={(e) => handlePriceClick(e, { targetView: 'henna-booking', targetCategory: 'mehendi', action: 'view-price' })}
                  className="px-3 py-1.5 bg-[#f6f3ef] hover:bg-[#c79a3b] text-[#7b5900] hover:text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border border-[#d2c5b1]/40"
                >
                  <span className="material-symbols-outlined text-sm">lock</span>
                  <span>Sign In to View Price</span>
                </button>
              ) : (
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-[#7b5900]">From ₹200 · Full Bridal ₹2,000+</span>
                  <span className="text-[10px] text-[#42a85f] font-semibold">VIP Pricing Unlocked</span>
                </div>
              )}

              <div className="flex items-center gap-1 text-xs font-bold text-[#7b5900] group-hover:translate-x-1 transition-transform">
                <span>Reserve Slot</span>
                <span className="material-symbols-outlined text-base">arrow_forward</span>
              </div>
            </div>
          </div>

          {/* Service 2: Jewellery Rental & Sale */}
          <div
            id="card-jewellery-service"
            onClick={() => handleServiceClick('jewellery')}
            className="bg-white rounded-3xl p-8 border border-[#d2c5b1]/40 lux-card-shadow cursor-pointer hover:border-[#7b5900] transition-all flex flex-col justify-between group"
          >
            <div>
              <div className="w-14 h-14 rounded-2xl bg-[#7b5900]/10 text-[#7b5900] flex items-center justify-center mb-6 group-hover:bg-[#7b5900] group-hover:text-white transition-colors">
                <span className="material-symbols-outlined text-3xl">diamond</span>
              </div>
              <span className="text-[10px] uppercase tracking-widest text-[#7b5900] font-bold bg-[#7b5900]/10 px-3 py-1 rounded-full">
                Subi Izhai
              </span>
              <h3 className="font-serif text-2xl font-bold text-[#1c1c1a] group-hover:text-[#7b5900] transition-colors mt-3">
                Jewellery Rentals & Sales
              </h3>
              <p className="text-xs text-[#5c5446] mt-3 leading-relaxed">
                Heritage Kundan sets, Polki chokers, Guttapusalu hair accessories & temple jewelry rentals for brides with trial appointments and online purchase.
              </p>
            </div>

            <div className="pt-8 flex items-center justify-between border-t border-[#d2c5b1]/20 mt-6">
              {!isAuthenticated ? (
                <button
                  type="button"
                  onClick={(e) => handlePriceClick(e, { targetView: 'product', action: 'view-price' })}
                  className="px-3 py-1.5 bg-[#f6f3ef] hover:bg-[#c79a3b] text-[#7b5900] hover:text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border border-[#d2c5b1]/40"
                >
                  <span className="material-symbols-outlined text-sm">lock</span>
                  <span>Sign In to View Price</span>
                </button>
              ) : (
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-[#7b5900]">Rentals from ₹1,200/day · Sets ₹4,500+</span>
                  <span className="text-[10px] text-[#42a85f] font-semibold">VIP Pricing Unlocked</span>
                </div>
              )}

              <div className="flex items-center gap-1 text-xs font-bold text-[#7b5900] group-hover:translate-x-1 transition-transform">
                <span>Explore Catalogue</span>
                <span className="material-symbols-outlined text-base">arrow_forward</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Jewellery Catalogue Preview (Loaded Dynamically from DB) */}
      {products.length > 0 && (
        <section className="py-16 px-6 md:px-16 max-w-7xl mx-auto border-b border-[#d2c5b1]/30">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4">
            <div>
              <span className="text-xs font-bold tracking-[0.25em] text-[#7b5900] uppercase">
                Subi Izhai Live Catalogue
              </span>
              <h2 className="font-serif text-3xl md:text-4xl font-bold text-[#1c1c1a]">
                Jewellery Rental & Sale Sets
              </h2>
            </div>
            <button
              onClick={() => onNavigate('product')}
              className="text-xs font-bold text-[#7b5900] tracking-wider uppercase flex items-center gap-1.5 hover:gap-2.5 transition-all cursor-pointer"
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
                  className="bg-white rounded-2xl overflow-hidden border border-[#d2c5b1]/40 lux-card-shadow group cursor-pointer hover:border-[#7b5900] transition-all flex flex-col justify-between relative"
                >
                  <div>
                    <div className="relative h-60 overflow-hidden bg-[#f6f3ef]">
                      <img
                        src={prod.images[0]}
                        alt={prod.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      
                      {/* Top Badges */}
                      <span className="absolute top-3 left-3 px-2.5 py-1 bg-[#1c1c1a] text-[#fcf9f5] text-[9px] uppercase font-bold tracking-widest rounded-full shadow-sm">
                        {prod.category}
                      </span>
                      <span className="absolute top-3 right-3 px-2.5 py-1 bg-[#c79a3b] text-white text-[9px] font-bold rounded-full shadow-sm">
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
                      <h3 className="font-serif text-lg font-bold text-[#1c1c1a] group-hover:text-[#7b5900] transition-colors">
                        {prod.name}
                      </h3>
                      <p className="text-xs text-[#5c5446] line-clamp-2 leading-relaxed">
                        {prod.description}
                      </p>
                    </div>
                  </div>

                  <div className="p-5 pt-0 flex items-center justify-between border-t border-[#d2c5b1]/20 mt-2">
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
                        className="px-3 py-1 bg-[#f6f3ef] hover:bg-[#c79a3b] text-[#7b5900] hover:text-white rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 border border-[#d2c5b1]/40"
                      >
                        <span className="material-symbols-outlined text-xs">lock</span>
                        <span>Sign In for Price</span>
                      </button>
                    ) : (
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-[#7b5900]">
                          {prod.type === 'Rental' ? prod.rentalPriceDay : prod.price}
                        </span>
                        <span className="text-[10px] text-[#807665]">
                          {prod.type === 'Rental' ? 'Per Day Rate' : 'Direct Purchase'}
                        </span>
                      </div>
                    )}

                    <span className="text-xs font-bold text-[#1c1c1a] underline group-hover:text-[#7b5900]">
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
