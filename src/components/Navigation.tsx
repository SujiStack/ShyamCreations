import React, { useState, useEffect } from 'react';
import { ViewMode, CustomerAccount, PendingAuthAction } from '../types';
import { ServiceCategoryKey } from '../views/HennaBookingView';

interface NavigationProps {
  currentView: ViewMode;
  onNavigate: (view: ViewMode, category?: ServiceCategoryKey) => void;
  cartCount?: number;
  wishlistCount?: number;
  isAuthenticated?: boolean;
  customerUser?: CustomerAccount | null;
  onOpenAuthModal?: (pendingAction?: PendingAuthAction) => void;
  onLogoutCustomer?: () => void;
  onOpenCart?: () => void;
  onOpenWishlist?: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentView,
  onNavigate,
  cartCount = 0,
  wishlistCount = 0,
  isAuthenticated = false,
  customerUser = null,
  onOpenAuthModal,
  onLogoutCustomer,
  onOpenCart,
  onOpenWishlist,
}) => {
  const [showAccountDrawer, setShowAccountDrawer] = useState(false);

  if (currentView === 'admin') return null;

  const handleNavClick = (view: ViewMode, category?: ServiceCategoryKey) => onNavigate(view, category);

  const getInitials = (name: string) => {
    if (!name) return 'SC';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const navLinkClass = (active: boolean) =>
    active
      ? 'text-[#2B231A] font-bold border-b-2 border-[#C08A34] pb-1'
      : 'text-[#6B5D4A] hover:text-[#2B231A] transition-colors';

  return (
    <>
      <nav
        id="main-navigation-bar"
        className="fixed top-0 w-full z-50 bg-[#FBF7F0]/95 backdrop-blur-md border-b border-[#E8DCC4] shadow-xs transition-all duration-300"
      >
        <div className="flex justify-between items-center px-4 md:px-12 py-3.5 w-full max-w-7xl mx-auto">
          {/* Brand */}
          <div className="flex items-center gap-6 lg:gap-8">
            <button
              id="brand-logo-btn"
              onClick={() => handleNavClick('home')}
              className="text-left group cursor-pointer"
            >
              <span className="font-serif text-xl md:text-2xl font-semibold text-[#2B231A] tracking-tight group-hover:opacity-85 transition-opacity">
                Shyam Creations
              </span>
              {currentView !== 'product' && (
                <span className="block text-[9px] tracking-widest text-[#8A7F72] uppercase font-bold">
                  Artisanal Bridal Studio
                </span>
              )}
            </button>

            {/* Desktop Nav Links */}
            <div className="hidden lg:flex items-center gap-5 text-xs font-semibold">
              <button id="nav-overview" onClick={() => handleNavClick('home')} className={navLinkClass(currentView === 'home')}>
                Overview
              </button>

             <button
               id="nav-mehendi"
               onClick={() => {
                 if (!isAuthenticated) {
                   onOpenAuthModal?.({ action: 'mehendi', targetView: 'henna-booking', targetCategory: 'mehendi' });
                 } else {
                   handleNavClick('henna-booking', 'mehendi');
                 }
               }}
               className={navLinkClass(currentView === 'henna-booking' && isAuthenticated)}
               title="Bridal & Occasion Mehendi Appointment (Login Required)"
             >
               <span className="material-symbols-outlined text-sm text-[var(--sc-emerald)]">palette</span>
               <span>Mehendi</span>
             </button>

              <button
                id="nav-jewellery"
                onClick={() => handleNavClick('product')}
                className={navLinkClass(currentView === 'product')}
                title="Shyam Creations Jewellery Rental & Sale Catalogue"
              >
                <span className="material-symbols-outlined text-sm text-[var(--sc-emerald)]">diamond</span>
                <span>Jewellery</span>
              </button>

              <button id="nav-my-bookings" onClick={() => handleNavClick('my-bookings')} className={navLinkClass(currentView === 'my-bookings')}>
                My Bookings
              </button>

              <button
                id="nav-admin"
                onClick={() => handleNavClick('admin')}
                className="text-[#C98A93] hover:text-[#D8A5AC] px-2.5 py-1 bg-[#2B231A] hover:bg-[#3A2F22] rounded-full text-[10px] font-bold tracking-wider uppercase transition-all cursor-pointer"
              >
                Admin Portal
              </button>
            </div>
          </div>

          {/* Action Icons */}
          <div className="flex items-center gap-2 md:gap-3">
            {/* Wishlist */}
            <button
              id="btn-nav-wishlist"
              onClick={() => {
                if (!isAuthenticated && onOpenAuthModal) {
                  onOpenAuthModal();
                } else if (onOpenWishlist) {
                  onOpenWishlist();
                }
              }}
              className="p-2 cursor-pointer hover:bg-[#F0E7D6] rounded-full text-[#2B231A] hover:text-rose-700 transition-colors relative"
              title={isAuthenticated ? 'Saved Jewellery Wishlist' : 'Sign in to view your Wishlist'}
            >
              <span className="material-symbols-outlined text-xl">favorite</span>
              {isAuthenticated && wishlistCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center shadow-xs">
                  {wishlistCount}
                </span>
              )}
            </button>

            {/* Cart */}
            <button
              id="btn-nav-cart"
              onClick={() => {
                if (!isAuthenticated && onOpenAuthModal) {
                  onOpenAuthModal();
                } else if (onOpenCart) {
                  onOpenCart();
                }
              }}
              className="p-2 cursor-pointer hover:bg-[#F0E7D6] rounded-full text-[#2B231A] transition-colors relative"
              title={isAuthenticated ? 'Jewellery Shopping Bag' : 'Sign in to view your Shopping Bag'}
            >
              <span className="material-symbols-outlined text-xl">shopping_bag</span>
              {isAuthenticated && cartCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-[var(--sc-emerald)] text-white text-[9px] font-bold rounded-full flex items-center justify-center shadow-xs">
                  {cartCount}
                </span>
              )}
            </button>

            {/* User Account / Sign In */}
            {isAuthenticated && customerUser ? (
              <button
                id="btn-user-avatar-menu"
                onClick={() => setShowAccountDrawer(true)}
                className="flex items-center gap-2 pl-2 pr-3 py-1.5 bg-[var(--sc-accent-warm)] hover:bg-[#E8DCC4] rounded-full border border-[var(--sc-border)] transition-all cursor-pointer shadow-2xs"
              >
                <div className="w-6 h-6 rounded-full bg-[var(--sc-emerald)] text-white text-[10px] font-bold flex items-center justify-center">
                  {getInitials(customerUser.name)}
                </div>
                <span className="text-xs font-bold text-[var(--sc-text)] max-w-[100px] truncate hidden sm:inline">
                  {customerUser.name.split(' ')[0]}
                </span>
                <span className="material-symbols-outlined text-xs text-[var(--sc-text-dimmer)]">expand_more</span>
              </button>
            ) : (
              <button
                id="btn-client-signin"
                onClick={() => { if (onOpenAuthModal) onOpenAuthModal(); }}
                className="px-3 py-1.5 bg-[var(--sc-emerald)] hover:bg-[var(--sc-emerald-light)] text-white rounded-xl text-xs font-bold tracking-wide transition-all shadow-xs flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">lock_open</span>
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Services Bar */}
        <div className="lg:hidden flex items-center justify-around py-2 px-2 border-t border-[#E8DCC4] bg-[#F5EFE3] text-[11px] font-medium overflow-x-auto">
          <button
            onClick={() => {
              if (!isAuthenticated) {
                onOpenAuthModal?.({ action: 'mehendi', targetView: 'henna-booking', targetCategory: 'mehendi' });
              } else {
                handleNavClick('henna-booking', 'mehendi');
              }
            }}
            className="px-3 py-1.5 text-[#2B231A] font-bold flex items-center gap-1 shrink-0"
            title="Mehendi - Login Required"
          >
            <span className="material-symbols-outlined text-sm text-[#C08A34]">palette</span>
            <span>Mehendi</span>
          </button>
          <button onClick={() => handleNavClick('product')} className="px-3 py-1 text-[#2B231A] font-bold flex items-center gap-1 shrink-0">
            <span className="material-symbols-outlined text-sm text-[#C08A34]">diamond</span>
            <span>Jewellery</span>
          </button>
          <button onClick={() => handleNavClick('my-bookings')} className="px-3 py-1 text-[#2B231A] font-bold shrink-0">
            Bookings
          </button>
          <button onClick={() => handleNavClick('admin')} className="px-3 py-1 text-[#A05A68] font-bold shrink-0">
            Admin
          </button>
        </div>
      </nav>

      {/* Account Drawer */}
      {showAccountDrawer && (
        <div
          id="account-drawer-overlay"
          className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs"
        >
          <div
            id="account-drawer"
            className="w-full max-w-sm bg-[var(--sc-bg)] h-full shadow-2xl p-6 flex flex-col justify-between animate-in slide-in-from-right duration-300"
          >
            <div>
              <div className="flex justify-between items-center pb-4 border-b border-[var(--sc-border)]">
                <h3 className="font-serif text-lg font-bold text-[var(--sc-text)]">
                  Client Portal
                </h3>
                <button
                  id="btn-close-account-drawer"
                  onClick={() => setShowAccountDrawer(false)}
                  className="p-1 hover:bg-[var(--sc-accent-warm)] rounded-full text-[var(--sc-text-dim)] transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="py-6 space-y-4">
                {customerUser ? (
                  <div className="flex items-center gap-3 p-3.5 bg-[var(--sc-accent-warm)] rounded-2xl border border-[var(--sc-border)]">
                    <div className="w-12 h-12 rounded-full bg-[var(--sc-emerald)] text-white font-bold flex items-center justify-center text-lg shadow-sm">
                      {getInitials(customerUser.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-serif font-bold text-sm text-[var(--sc-text)] truncate">
                        {customerUser.name}
                      </p>
                      <p className="text-xs text-[var(--sc-text-dimmer)] truncate">
                        {customerUser.email}
                      </p>
                      <p className="text-[10px] text-[var(--sc-emerald)] font-semibold mt-0.5">
                        📞 {customerUser.phone}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-[var(--sc-accent-warm)] rounded-2xl border border-[var(--sc-border)] text-center space-y-2">
                    <p className="text-xs text-[var(--sc-text-dim)]">Sign in to track your orders and bookings</p>
                    <button
                      onClick={() => { setShowAccountDrawer(false); if (onOpenAuthModal) onOpenAuthModal(); }}
                      className="w-full py-2 bg-[var(--sc-emerald)] text-white font-bold rounded-xl text-xs"
                    >
                      Sign In / Register
                    </button>
                  </div>
                )}

                <div className="space-y-1.5 pt-2">
                  <button
                    onClick={() => { setShowAccountDrawer(false); handleNavClick('my-bookings'); }}
                    className="w-full text-left px-4 py-2.5 rounded-xl hover:bg-[var(--sc-accent-warm)] text-xs font-bold text-[var(--sc-text)] flex items-center justify-between cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm text-[var(--sc-emerald)]">calendar_month</span>
                      <span>My Appointments & Orders</span>
                    </span>
                    <span className="material-symbols-outlined text-sm">chevron_right</span>
                  </button>

                  <button
                    onClick={() => { setShowAccountDrawer(false); if (onOpenWishlist) onOpenWishlist(); }}
                    className="w-full text-left px-4 py-2.5 rounded-xl hover:bg-[var(--sc-accent-warm)] text-xs font-bold text-[var(--sc-text)] flex items-center justify-between cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm text-rose-500">favorite</span>
                      <span>Saved Wishlist ({wishlistCount})</span>
                    </span>
                    <span className="material-symbols-outlined text-sm">chevron_right</span>
                  </button>

                  <button
                    onClick={() => { setShowAccountDrawer(false); if (onOpenCart) onOpenCart(); }}
                    className="w-full text-left px-4 py-2.5 rounded-xl hover:bg-[var(--sc-accent-warm)] text-xs font-bold text-[var(--sc-text)] flex items-center justify-between cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm text-[var(--sc-emerald)]">shopping_bag</span>
                      <span>Shopping Bag ({cartCount})</span>
                    </span>
                    <span className="material-symbols-outlined text-sm">chevron_right</span>
                  </button>

                  <div className="pt-2 border-t border-[var(--sc-border)]">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--sc-emerald)] px-4 mb-1">
                      Studio Services
                    </p>
                    <button
                      onClick={() => { setShowAccountDrawer(false); handleNavClick('henna-booking', 'mehendi'); }}
                      className="w-full text-left px-4 py-2 rounded-xl hover:bg-[var(--sc-accent-warm)] text-xs font-medium text-[var(--sc-text)] flex items-center justify-between cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm text-[var(--sc-emerald)]">palette</span>
                        <span>Bridal Mehendi</span>
                      </span>
                      <span className="material-symbols-outlined text-sm">chevron_right</span>
                    </button>
                    <button
                      onClick={() => { setShowAccountDrawer(false); handleNavClick('product'); }}
                      className="w-full text-left px-4 py-2 rounded-xl hover:bg-[var(--sc-accent-warm)] text-xs font-medium text-[var(--sc-text)] flex items-center justify-between cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm text-[var(--sc-emerald)]">diamond</span>
                        <span>Jewellery Catalogue & Rentals</span>
                      </span>
                      <span className="material-symbols-outlined text-sm">chevron_right</span>
                    </button>
                  </div>

                  {isAuthenticated && (
                    <div className="pt-3 border-t border-[var(--sc-border)]">
                      <button
                        onClick={() => { setShowAccountDrawer(false); if (onLogoutCustomer) onLogoutCustomer(); }}
                        className="w-full text-left px-4 py-2.5 rounded-xl hover:bg-red-50 text-xs font-bold text-red-700 flex items-center justify-between cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-sm">logout</span>
                          <span>Sign Out</span>
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-[var(--sc-border)] pt-4">
                <p className="text-[10px] text-[var(--sc-text-dimmer)] text-center uppercase tracking-widest">
                  Curated by Shyam Creations © 2026
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
