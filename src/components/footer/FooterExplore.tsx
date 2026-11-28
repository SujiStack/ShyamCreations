import React from 'react';
import { ViewMode } from '../../types';
import { ServiceCategoryKey } from '../../views/HennaBookingView';

interface FooterExploreProps {
  onNavigate: (view: ViewMode, category?: ServiceCategoryKey) => void;
}

export const FooterExplore: React.FC<FooterExploreProps> = ({ onNavigate }) => {
  const linkClass = 'hover:text-[var(--sc-emerald-light)] transition-colors text-left';

  return (
    <div className="space-y-3">
      <h4 className="font-serif font-semibold text-sm uppercase tracking-wider text-[var(--sc-emerald-light)]">
        Explore
      </h4>
      <ul className="space-y-2 text-xs text-[#a39c91]">
        <li>
          <button onClick={() => onNavigate('henna-booking')} className={linkClass}>
            Bridal Mehendi Packages
          </button>
        </li>
        <li>
          <button onClick={() => onNavigate('product')} className={linkClass}>
            Guttapusalu Hair Ornaments
          </button>
        </li>
        <li>
          <button onClick={() => onNavigate('my-bookings')} className={linkClass}>
            Reschedule / My Appointments
          </button>
        </li>
      </ul>
    </div>
  );
};