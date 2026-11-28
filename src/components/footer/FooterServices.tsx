import React from 'react';
import { ViewMode, PendingAuthAction } from '../../types';
import { ServiceCategoryKey } from '../../views/HennaBookingView';

interface FooterServicesProps {
  onNavigate: (view: ViewMode, category?: ServiceCategoryKey) => void;
  isAuthenticated?: boolean;
  onRequireAuth?: (pendingAction?: PendingAuthAction) => void;
}

export const FooterServices: React.FC<FooterServicesProps> = ({ onNavigate, isAuthenticated = false, onRequireAuth }) => {
  const linkClass = 'hover:text-[var(--sc-emerald-light)] transition-colors text-left';

  const goMehendi = () => {
    if (!isAuthenticated && onRequireAuth) {
      onRequireAuth({ action: 'mehendi', targetView: 'henna-booking', targetCategory: 'mehendi' });
    } else {
      onNavigate('henna-booking', 'mehendi');
    }
  };

  return (
    <div className="space-y-3">
      <h4 className="font-serif font-semibold text-sm uppercase tracking-wider text-[var(--sc-emerald-light)]">
        Services
      </h4>
      <ul className="space-y-2 text-xs text-[#a39c91]">
        <li>
          <button onClick={goMehendi} className={linkClass}>
            Bridal & Occasion Mehendi
          </button>
        </li>
        <li>
          <button onClick={() => onNavigate('product')} className={linkClass}>
            Jewellery Rentals & Sales
          </button>
        </li>
        <li>
          <button onClick={() => onNavigate('check-availability')} className={linkClass}>
            Check Availability
          </button>
        </li>
      </ul>
    </div>
  );
};