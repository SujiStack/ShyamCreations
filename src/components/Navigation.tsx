import React, { useState } from 'react';
import { ViewMode, CustomerAccount } from '../types';
import { ServiceCategoryKey } from '../views/HennaBookingView';

interface NavigationProps {
  currentView: ViewMode;
  onNavigate: (view: ViewMode, category?: ServiceCategoryKey) => void;
  cartCount?: number;
  wishlistCount?: number;
  isAuthenticated?: boolean;
  customerUser?: CustomerAccount | null;
  onOpenAuthModal?: () => void;
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

  // If in admin view, the admin portal has its own structured dashboard header & sidebar.
  if (currentView === 'admin') {
    return null;
  }

  const handleNavClick = (view: ViewMode, category?: ServiceCategoryKey) => {
    onNavigate(view, category);
  };

  const getInitials = (name: string) => {
    if (!name) return 'SC';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <>
      <nav
        id="main-navigation-bar"
        className="fixed top-0 w-full z-50 bg-[#fcf9f5]/95 backdrop-blur-md border-b border-[#d2c5b1]/20 shadow-xs transition-all duration-300"
      >
        <div className="flex justify-between items-center px-4 md:px-12 py-3.5 w-full max-w-7xl mx-auto">
          {/* Brand Logo */}
          <div className="flex items-center gap-6 lg:gap-8">
            <button
              id="brand-logo-btn"
              onClick={() => handleNavClick('home')}
              className="text-left group cursor-pointer"
            >
              <span className="font-serif text-xl md:text-2xl font-semibold text-[#7b5900] tracking-tight group-hover:opacity-85 transition-opacity">
                {currentView === 'product' ? 'Subi Izhai' : 'Shyam Creations'}
              </span>
              {currentView !== 'product' && (
                <span className="block text-[9px] tracking-widest text-[#807665] uppercase font-bold">
                  Artisanal Bridal Studio
                </span>
              )}
            </button>

            {/* Desktop Navigation Links */}
            <div className="hidden lg:flex items-center gap-5 text-xs font-semibold">
              <button
                id="nav-overview"
                onClick={() => handleNavClick('home')}
                className={`transition-colors py-1 cursor-pointer ${
                  currentView === 'home'
                    ? 'text-[#7b5900] font-bold border-b-2 border-[#7b5900]'
                    : 'text-[#4e4637] hover:text-[#7b5900]'
                }`}
              >
                Overview
              </button>

              {/* 2 Core Services Nav Buttons */}
              <button
                id="nav-mehendi"
                onClick={() => handleNavClick('henna-booking', 'mehendi')}
                className={`transition-colors py-1 flex items-center gap-1 cursor-pointer ${
                  currentView === 'henna-booking'
                    ? 'text-[#7b5900] font-bold border-b-2 border-[#7b5900]'
                    : 'text-[#4e4637] hover:text-[#7b5900]'
                }`}
                title="Bridal & Occasion Mehendi Appointment"
              >
                <span className="material-symbols-outlined text-sm text-[#7b5900]">palette</span>
                <span>Mehendi</span>
              </button>

              <button
                id="nav-jewellery"
                onClick={() => handleNavClick('product')}
                className={`transition-colors py-1 flex items-center gap-1 cursor-pointer ${
                  currentView === 'product'
                    ? 'text-[#7b5900] font-bold border-b-2 border-[#7b5900]'
                    : 'text-[#4e4637] hover:text-[#7b5900]'
                }`}
                title="Subi Izhai Jewellery Rental & Sale Catalogue"
              >
                <span className="material-symbols-outlined text-sm text-[#7b5900]">diamond</span>
                <span>Jewellery</span>
              </button>

              <button
                id="nav-my-bookings"
                onClick={() => handleNavClick('my-bookings')}
                className={`transition-colors py-1 cursor-pointer ${
                  currentView === 'my-bookings'
                    ? 'text-[#7b5900] font-bold border-b-2 border-[#7b5900]'
                    : 'text-[#4e4637] hover:text-[#7b5900]'
                }`}
              >
                My Bookings
              </button>

              <button
                id="nav-admin"
                onClick={() => handleNavClick('admin')}
                className="text-[#8a4c58] hover:text-[#5c2632] px-2.5 py-1 bg-[#ffd9de]/50 hover:bg-[#ffd9de] rounded-full text-[10px] font-bold tracking-wider uppercase transition-all cursor-pointer"
              >
                Admin Portal
              </button>
            </div>
          </div>

          {/* Action Icons: Wishlist, Cart, Client Auth */}
          <div className="flex items-center gap-2 md:gap-3">
            {/* Wishlist Button */}
            <button
              id="btn-nav-wishlist"
              onClick={() => {
                if (onOpenWishlist) onOpenWishlist();
              }}
              className="p-2 cursor-pointer hover:bg-[#f0ede9] rounded-full text-[#4e4637] hover:text-rose-600 transition-colors relative"
              title="Saved Jewellery Wishlist"
            >
              <span className="material-symbols-outlined text-xl">favorite</span>
              {wishlistCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center shadow-xs">
                  {wishlistCount}
                </span>
              )}
            </button>

            {/* Shopping Cart Button */}
            <button
              id="btn-nav-cart"
              onClick={() => {
                if (onOpenCart) onOpenCart();
              }}
              className="p-2 cursor-pointer hover:bg-[#f0ede9] rounded-full text-[#7b5900] transition-colors relative"
              title="Jewellery Shopping Bag"
            >
              <span className="material-symbols-outlined text-xl">shopping_bag</span>
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#7b5900] text-white text-[9px] font-bold rounded-full flex items-center justify-center shadow-xs">
                  {cartCount}
                </span>
              )}
            </button>

            {/* User Account / Sign In */}
            {isAuthenticated && customerUser ? (
              <button
                id="btn-user-avatar-menu"
                onClick={() => setShowAccountDrawer(true)}
                className="flex items-center gap-2 pl-2 pr-3 py-1.5 bg-[#f6f3ef] hover:bg-[#ebdcc9] rounded-full border border-[#d2c5b1]/40 transition-all cursor-pointer shadow-2xs"
              >
                <div className="w-6 h-6 rounded-full bg-[#7b5900] text-white text-[10px] font-bold flex items-center justify-center">
                  {getInitials(customerUser.name)}
                </div>
                <span className="text-xs font-bold text-[#1c1c1a] max-w-[100px] truncate hidden sm:inline">
                  {customerUser.name.split(' ')[0]}
                </span>
                <span className="material-symbols-outlined text-xs text-[#5c5446]">expand_more</span>
              </button>
            ) : (
              <button
                id="btn-client-signin"
                onClick={() => {
                  if (onOpenAuthModal) onOpenAuthModal();
                }}
                className="px-3 py-1.5 bg-[#c79a3b] hover:bg-[#e2bd70] text-[#1c1c1a] rounded-xl text-xs font-bold tracking-wide transition-all shadow-xs flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">lock_open</span>
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Services Bar */}
        <div className="lg:hidden flex items-center justify-around py-2 px-2 border-t border-[#d2c5b1]/20 bg-[#f6f3ef] text-[11px] font-medium overflow-x-auto">
          <button
            onClick={() => handleNavClick('henna-booking', 'mehendi')}
            className="px-3 py-1 text-[#7b5900] font-bold flex items-center gap-1 shrink-0"
          >
            <span className="material-symbols-outlined text-sm">palette</span>
            <span>Mehendi</span>
          </button>

          <button
            onClick={() => handleNavClick('product')}
            className="px-3 py-1 text-[#7b5900] font-bold flex items-center gap-1 shrink-0"
          >
            <span className="material-symbols-outlined text-sm">diamond</span>
            <span>Jewellery</span>
          </button>

          <button
            onClick={() => handleNavClick('my-bookings')}
            className="px-3 py-1 text-[#1c1c1a] font-bold shrink-0"
          >
            Bookings
          </button>

          <button
            onClick={() => handleNavClick('admin')}
            className="px-3 py-1 text-[#8a4c58] font-bold shrink-0"
          >
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
            className="w-full max-w-sm bg-[#fcf9f5] h-full shadow-2xl p-6 flex flex-col justify-between animate-in slide-in-from-right duration-300"
          >
            <div>
              <div className="flex justify-between items-center pb-4 border-b border-[#d2c5b1]/40">
                <h3 className="font-serif text-lg font-bold text-[#1c1c1a]">
                  Client Portal
                </h3>
                <button
                  id="btn-close-account-drawer"
                  onClick={() => setShowAccountDrawer(false)}
                  className="p-1 hover:bg-[#e5e2de] rounded-full text-[#4e4637] cursor-pointer"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="py-6 space-y-4">
                {customerUser ? (
                  <div className="flex items-center gap-3 p-3.5 bg-[#f6f3ef] rounded-2xl border border-[#d2c5b1]/40">
                    <div className="w-12 h-12 rounded-full bg-[#7b5900] text-white font-bold flex items-center justify-center text-lg shadow-sm">
                      {getInitials(customerUser.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-serif font-bold text-[#1c1c1a] text-sm truncate">
                        {customerUser.name}
                      </p>
                      <p className="text-xs text-[#5c5446] truncate">
                        {customerUser.email}
                      </p>
                      <p className="text-[10px] text-[#7b5900] font-semibold mt-0.5">
                        📞 {customerUser.phone}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-[#f6f3ef] rounded-2xl border border-[#d2c5b1]/40 text-center space-y-2">
                    <p className="text-xs text-[#5c5446]">Sign in to track your orders and bookings</p>
                    <button
                      onClick={() => {
                        setShowAccountDrawer(false);
                        if (onOpenAuthModal) onOpenAuthModal();
                      }}
                      className="w-full py-2 bg-[#c79a3b] text-[#1c1c1a] font-bold rounded-xl text-xs"
                    >
                      Sign In / Register
                    </button>
                  </div>
                )}

                <div className="space-y-1.5 pt-2">
                  <button
                    onClick={() => {
                      setShowAccountDrawer(false);
                      handleNavClick('my-bookings');
                    }}
                    className="w-full text-left px-4 py-2.5 rounded-xl hover:bg-[#e5e2de] text-xs font-bold text-[#1c1c1a] flex items-center justify-between cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm text-[#7b5900]">calendar_month</span>
                      <span>My Appointments & Orders</span>
                    </span>
                    <span className="material-symbols-outlined text-sm">chevron_right</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowAccountDrawer(false);
                      if (onOpenWishlist) onOpenWishlist();
                    }}
                    className="w-full text-left px-4 py-2.5 rounded-xl hover:bg-[#e5e2de] text-xs font-bold text-[#1c1c1a] flex items-center justify-between cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm text-rose-500">favorite</span>
                      <span>Saved Wishlist ({wishlistCount})</span>
                    </span>
                    <span className="material-symbols-outlined text-sm">chevron_right</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowAccountDrawer(false);
                      if (onOpenCart) onOpenCart();
                    }}
                    className="w-full text-left px-4 py-2.5 rounded-xl hover:bg-[#e5e2de] text-xs font-bold text-[#1c1c1a] flex items-center justify-between cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm text-[#7b5900]">shopping_bag</span>
                      <span>Shopping Bag ({cartCount})</span>
                    </span>
                    <span className="material-symbols-outlined text-sm">chevron_right</span>
                  </button>

                  <div className="pt-2 border-t border-[#d2c5b1]/30">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#7b5900] px-4 mb-1">
                      Studio Services
                    </p>
                    <button
                      onClick={() => {
                        setShowAccountDrawer(false);
                        handleNavClick('henna-booking', 'mehendi');
                      }}
                      className="w-full text-left px-4 py-2 rounded-xl hover:bg-[#e5e2de] text-xs font-medium text-[#1c1c1a] flex items-center justify-between cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm text-[#7b5900]">palette</span>
                        <span>Bridal Mehendi</span>
                      </span>
                      <span className="material-symbols-outlined text-sm">chevron_right</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowAccountDrawer(false);
                        handleNavClick('product');
                      }}
                      className="w-full text-left px-4 py-2 rounded-xl hover:bg-[#e5e2de] text-xs font-medium text-[#1c1c1a] flex items-center justify-between cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm text-[#7b5900]">diamond</span>
                        <span>Jewellery Catalogue & Rentals</span>
                      </span>
                      <span className="material-symbols-outlined text-sm">chevron_right</span>
                    </button>
                  </div>

                  {isAuthenticated && (
                    <div className="pt-3 border-t border-[#d2c5b1]/30">
                      <button
                        onClick={() => {
                          setShowAccountDrawer(false);
                          if (onLogoutCustomer) onLogoutCustomer();
                        }}
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
            </div>

            <div className="border-t border-[#d2c5b1]/40 pt-4">
              <p className="text-[10px] text-[#807665] text-center uppercase tracking-widest">
                Curated by Shyam Creations © 2026
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
