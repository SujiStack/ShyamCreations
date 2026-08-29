import React from 'react';
import { ViewMode } from '../types';
import { ServiceCategoryKey } from '../views/HennaBookingView';

interface FooterProps {
  onNavigate: (view: ViewMode, category?: ServiceCategoryKey) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="bg-[#1c1c1a] text-[#ded8ce] py-16 px-6 md:px-16 border-t border-[#c79a3b]/20">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-10">
        {/* Brand Column */}
        <div className="space-y-4 md:col-span-1">
          <h3 className="font-serif text-2xl font-bold text-[#c79a3b] tracking-tight">
            Shyam Creations
          </h3>
          <p className="text-xs text-[#a39c91] leading-relaxed">
            Crafting timeless South Asian bridal stories in Tambaram, Chennai through 2 specialized studio offerings: Bridal Mehendi Artistry & Subi Izhai Jewellery Rentals.
          </p>
          <div className="flex items-center gap-3 pt-2 text-[#c79a3b]">
            <a
              href="https://wa.me/919363710342"
              target="_blank"
              rel="noreferrer"
              className="w-8 h-8 rounded-full border border-[#c79a3b]/40 flex items-center justify-center hover:bg-[#c79a3b] hover:text-[#1c1c1a] transition-all"
              title="WhatsApp Concierge"
            >
              <span className="material-symbols-outlined text-sm">chat</span>
            </a>
            <button
              onClick={() => onNavigate('henna-booking', 'mehendi')}
              className="w-8 h-8 rounded-full border border-[#c79a3b]/40 flex items-center justify-center hover:bg-[#c79a3b] hover:text-[#1c1c1a] transition-all"
              title="Book Mehendi"
            >
              <span className="material-symbols-outlined text-sm">palette</span>
            </button>
            <button
              onClick={() => onNavigate('henna-booking', 'jewellery')}
              className="w-8 h-8 rounded-full border border-[#c79a3b]/40 flex items-center justify-center hover:bg-[#c79a3b] hover:text-[#1c1c1a] transition-all"
              title="Jewellery Rental"
            >
              <span className="material-symbols-outlined text-sm">diamond</span>
            </button>
          </div>
        </div>

        {/* Services & Booking */}
        <div className="space-y-3">
          <h4 className="font-serif font-semibold text-sm uppercase tracking-wider text-[#c79a3b]">
            Studio Services
          </h4>
          <ul className="space-y-2 text-xs text-[#a39c91]">
            <li>
              <button
                onClick={() => onNavigate('henna-booking', 'mehendi')}
                className="hover:text-[#c79a3b] transition-colors"
              >
                Bridal & Occasion Mehendi
              </button>
            </li>
            <li>
              <button
                onClick={() => onNavigate('henna-booking', 'jewellery')}
                className="hover:text-[#c79a3b] transition-colors"
              >
                Subi Izhai Jewellery Rentals & Sales
              </button>
            </li>
          </ul>
        </div>

        {/* Quick Collections */}
        <div className="space-y-3">
          <h4 className="font-serif font-semibold text-sm uppercase tracking-wider text-[#c79a3b]">
            Subi Izhai Jewellery
          </h4>
          <ul className="space-y-2 text-xs text-[#a39c91]">
            <li>
              <button
                onClick={() => onNavigate('product')}
                className="hover:text-[#c79a3b] transition-colors"
              >
                Bridal Kundan Sets
              </button>
            </li>
            <li>
              <button
                onClick={() => onNavigate('product')}
                className="hover:text-[#c79a3b] transition-colors"
              >
                Jaipur Polki Chokers
              </button>
            </li>
            <li>
              <button
                onClick={() => onNavigate('product')}
                className="hover:text-[#c79a3b] transition-colors"
              >
                Guttapusalu Hair Ornaments
              </button>
            </li>
          </ul>
        </div>

        {/* Henna Experience */}
        <div className="space-y-3">
          <h4 className="font-serif font-semibold text-sm uppercase tracking-wider text-[#c79a3b]">
            HennaBliss Studio
          </h4>
          <ul className="space-y-2 text-xs text-[#a39c91]">
            <li>
              <button
                onClick={() => onNavigate('henna-booking')}
                className="hover:text-[#c79a3b] transition-colors"
              >
                Bridal Mehandi Packages
              </button>
            </li>
            <li>
              <button
                onClick={() => onNavigate('henna-booking')}
                className="hover:text-[#c79a3b] transition-colors"
              >
                Sangeet Group Artists
              </button>
            </li>
            <li>
              <button
                onClick={() => onNavigate('henna-booking')}
                className="hover:text-[#c79a3b] transition-colors"
              >
                Master Artists Directory
              </button>
            </li>
            <li>
              <button
                onClick={() => onNavigate('my-bookings')}
                className="hover:text-[#c79a3b] transition-colors"
              >
                Reschedule / My Appointments
              </button>
            </li>
          </ul>
        </div>

        {/* Concierge & Admin */}
        <div className="space-y-3">
          <h4 className="font-serif font-semibold text-sm uppercase tracking-wider text-[#c79a3b]">
            Concierge & Admin
          </h4>
          <p className="text-xs text-[#a39c91]">
            Dedicated Concierge WhatsApp: <br />
            <a
              href="https://wa.me/919363710342"
              target="_blank"
              rel="noreferrer"
              className="text-[#c79a3b] underline font-medium"
            >
              +91 93637 10342
            </a>
          </p>
          <div className="pt-2">
            <button
              onClick={() => onNavigate('admin')}
              className="btn-royal px-4 py-2 bg-[#c79a3b]/20 hover:bg-[#c79a3b] hover:text-[#1c1c1a] border border-[#c79a3b]/40 rounded text-[11px] text-[#c79a3b] transition-all"
            >
              Open Shyam Admin Portal
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto border-t border-[#2d2d2a] mt-12 pt-6 flex flex-col md:flex-row justify-between items-center text-[11px] text-[#807665]">
        <p>© 2026 Shyam Creations. All rights reserved.</p>
        <div className="flex gap-6 mt-4 md:mt-0">
          <span className="hover:text-[#c79a3b] cursor-pointer">Privacy Policy</span>
          <span className="hover:text-[#c79a3b] cursor-pointer">Rental Terms</span>
          <span className="hover:text-[#c79a3b] cursor-pointer">Sanitization Standards</span>
        </div>
      </div>
    </footer>
  );
};
