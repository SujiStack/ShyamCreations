import React from 'react';
import { ViewMode } from '../../types';
import { ServiceCategoryKey } from '../../views/HennaBookingView';

interface FooterBottomBarProps {
  onNavigate: (view: ViewMode, category?: ServiceCategoryKey) => void;
}

export const FooterBottomBar: React.FC<FooterBottomBarProps> = ({ onNavigate }) => {
  return (
    <div className="max-w-7xl mx-auto border-t border-[var(--sc-border-dark)] mt-6 pt-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-[var(--sc-text-dimmer)]">
      <p>© 2026 Shyam Creations. All rights reserved.</p>
      <button
        onClick={() => onNavigate('admin')}
        className="inline-flex items-center gap-1 text-[10px] text-[var(--sc-text-dimmer)] hover:text-[var(--sc-emerald-light)] transition-colors cursor-pointer"
        title="Admin Portal"
      >
        <span className="material-symbols-outlined text-xs">admin_panel_settings</span>
        <span>Admin</span>
      </button>
    </div>
  );
};