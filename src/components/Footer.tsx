import React, { useState } from 'react';
import { ViewMode, PendingAuthAction } from '../types';
import { ServiceCategoryKey } from '../views/HennaBookingView';
import { LegalModal, LegalDocKey } from './LegalModal';
import { FooterBrand } from './footer/FooterBrand';
import { FooterContact } from './footer/FooterContact';
import { FooterServices } from './footer/FooterServices';
import { FooterExplore } from './footer/FooterExplore';
import { FooterPolicies } from './footer/FooterPolicies';
import { FooterBottomBar } from './footer/FooterBottomBar';

interface FooterProps {
  onNavigate: (view: ViewMode, category?: ServiceCategoryKey) => void;
  isAuthenticated?: boolean;
  onRequireAuth?: (pendingAction?: PendingAuthAction) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate, isAuthenticated = false, onRequireAuth }) => {
  const [legalDoc, setLegalDoc] = useState<LegalDocKey | null>(null);

  return (
    <footer className="bg-[var(--sc-surface-alt)] text-[#ded8ce] py-8 px-6 md:px-16 border-t border-[var(--sc-emerald-light)]/20">
      <LegalModal doc={legalDoc} onClose={() => setLegalDoc(null)} />

      <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-8">
        <div className="space-y-3">
          <FooterBrand />
        </div>
        <FooterServices onNavigate={onNavigate} isAuthenticated={isAuthenticated} onRequireAuth={onRequireAuth} />
        <FooterExplore onNavigate={onNavigate} />
        <FooterPolicies onOpenLegal={setLegalDoc} />
        <FooterContact />

      </div>

      <FooterBottomBar onNavigate={onNavigate} />
    </footer>
  );
};