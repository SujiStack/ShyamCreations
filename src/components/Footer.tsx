import React from 'react';
import { ViewMode, PendingAuthAction } from '../types';
import { ServiceCategoryKey } from '../views/HennaBookingView';

interface FooterProps {
  onNavigate: (view: ViewMode, category?: ServiceCategoryKey) => void;
  isAuthenticated?: boolean;
  onRequireAuth?: (pendingAction?: PendingAuthAction) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate, isAuthenticated = false, onRequireAuth }) => {
  return (
    <footer className="bg-[var(--sc-surface-alt)] text-[#ded8ce] py-16 px-6 md:px-16 border-t border-[var(--sc-emerald-light)]/20">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-10">
        {/* Brand Column */}
        <div className="space-y-4 md:col-span-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[var(--sc-emerald)] text-white font-serif font-black text-lg flex items-center justify-center">
              S
            </div>
            <h3 className="font-serif text-2xl font-bold text-[var(--sc-emerald-light)] tracking-tight">
              Shyam Creations
            </h3>
          </div>
          <p className="text-xs text-[#a39c91] leading-relaxed">
            Crafting timeless South Asian bridal stories in Tambaram, Chennai through 2 specialised studio offerings: Bridal Mehendi Artistry & Luxury Jewellery Rentals.
          </p>
           <div className="flex items-center gap-3 pt-2 text-[var(--sc-emerald-light)]">
            <a
              href="https://wa.me/919363710342"
              target="_blank"
              rel="noreferrer"
              className="w-8 h-8 rounded-full border border-[var(--sc-emerald)]/40 flex items-center justify-center hover:bg-[var(--sc-emerald)] hover:text-[var(--sc-surface-alt)] transition-all"
              title="WhatsApp Concierge"
            >
              <span className="material-symbols-outlined text-sm">chat</span>
            </a>
            <button
              onClick={() => {
                if (!isAuthenticated && onRequireAuth) {
                  onRequireAuth({ action: 'mehendi', targetView: 'henna-booking', targetCategory: 'mehendi' });
                } else {
                  onNavigate('henna-booking', 'mehendi');
                }
              }}
              className="w-8 h-8 rounded-full border border-[var(--sc-emerald)]/40 flex items-center justify-center hover:bg-[var(--sc-emerald)] hover:text-[var(--sc-surface-alt)] transition-all"
              title={isAuthenticated ? "Book Mehendi" : "Book Mehendi (Login Required)"}
            >
              <span className="material-symbols-outlined text-sm">palette</span>
            </button>
            <button
              onClick={() => onNavigate('product')}
              className="w-8 h-8 rounded-full border border-[var(--sc-emerald)]/40 flex items-center justify-center hover:bg-[var(--sc-emerald)] hover:text-[var(--sc-surface-alt)] transition-all"
              title="Jewellery Rental"
            >
              <span className="material-symbols-outlined text-sm">diamond</span>
            </button>
          </div>
        </div>

        {/* Services */}
        <div className="space-y-3">
          <h4 className="font-serif font-semibold text-sm uppercase tracking-wider text-[var(--sc-emerald-light)]">
            Studio Services
          </h4>
            <ul className="space-y-2 text-xs text-[#a39c91]">
            <li>
              <button
                onClick={() => {
                  if (!isAuthenticated && onRequireAuth) {
                    onRequireAuth({ action: 'mehendi', targetView: 'henna-booking', targetCategory: 'mehendi' });
                  } else {
                    onNavigate('henna-booking', 'mehendi');
                  }
                }}
                className="hover:text-[var(--sc-emerald-light)] transition-colors"
              >
                Bridal & Occasion Mehendi
              </button>
            </li>
            <li>
              <button onClick={() => onNavigate('product')} className="hover:text-[var(--sc-emerald-light)] transition-colors">
                Jewellery Rentals & Sales
              </button>
            </li>
          </ul>
        </div>

        {/* Collections */}
        <div className="space-y-3">
          <h4 className="font-serif font-semibold text-sm uppercase tracking-wider text-[var(--sc-emerald-light)]">
            Jewellery Collections
          </h4>
          <ul className="space-y-2 text-xs text-[#a39c91]">
            <li>
              <button onClick={() => onNavigate('product')} className="hover:text-[var(--sc-emerald-light)] transition-colors">
                Bridal Kundan Sets
              </button>
            </li>
            <li>
              <button onClick={() => onNavigate('product')} className="hover:text-[var(--sc-emerald-light)] transition-colors">
                Jaipur Polki Chokers
              </button>
            </li>
            <li>
              <button onClick={() => onNavigate('product')} className="hover:text-[var(--sc-emerald-light)] transition-colors">
                Guttapusalu Hair Ornaments
              </button>
            </li>
          </ul>
        </div>

        {/* Henna Experience */}
        <div className="space-y-3">
          <h4 className="font-serif font-semibold text-sm uppercase tracking-wider text-[var(--sc-emerald-light)]">
            HennaBliss Studio
          </h4>
          <ul className="space-y-2 text-xs text-[#a39c91]">
            <li>
              <button
                onClick={() => {
                  if (!isAuthenticated && onRequireAuth) {
                    onRequireAuth({ action: 'mehendi', targetView: 'henna-booking', targetCategory: 'mehendi' });
                  } else {
                    onNavigate('henna-booking');
                  }
                }}
                className="hover:text-[var(--sc-emerald-light)] transition-colors"
              >
                Bridal Mehandi Packages
              </button>
            </li>
            <li>
              <button
                onClick={() => {
                  if (!isAuthenticated && onRequireAuth) {
                    onRequireAuth({ action: 'mehendi', targetView: 'henna-booking', targetCategory: 'mehendi' });
                  } else {
                    onNavigate('henna-booking');
                  }
                }}
                className="hover:text-[var(--sc-emerald-light)] transition-colors"
              >
                Sangeet Group Artists
              </button>
            </li>
            <li>
              <button
                onClick={() => {
                  if (!isAuthenticated && onRequireAuth) {
                    onRequireAuth({ action: 'mehendi', targetView: 'henna-booking', targetCategory: 'mehendi' });
                  } else {
                    onNavigate('henna-booking');
                  }
                }}
                className="hover:text-[var(--sc-emerald-light)] transition-colors"
              >
                Master Artists Directory
              </button>
            </li>
            <li>
              <button onClick={() => onNavigate('my-bookings')} className="hover:text-[var(--sc-emerald-light)] transition-colors">
                Reschedule / My Appointments
              </button>
            </li>
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto border-t border-[var(--sc-border-dark)] mt-12 pt-6 flex flex-col md:flex-row justify-between items-center text-[11px] text-[var(--sc-text-dimmer)]">
        <p>© 2026 Shyam Creations. All rights reserved.</p>
        <div className="flex gap-6 mt-4 md:mt-0">
          <span className="hover:text-[var(--sc-emerald-light)] cursor-pointer">Privacy Policy</span>
          <span className="hover:text-[var(--sc-emerald-light)] cursor-pointer">Rental Terms</span>
          <span className="hover:text-[var(--sc-emerald-light)] cursor-pointer">Sanitization Standards</span>
        </div>
      </div>
    </footer>
  );
};
