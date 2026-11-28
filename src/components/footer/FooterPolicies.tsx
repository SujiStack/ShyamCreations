import React from 'react';
import { LegalDocKey } from '../LegalModal';

interface FooterPoliciesProps {
  onOpenLegal: (doc: LegalDocKey) => void;
}

export const FooterPolicies: React.FC<FooterPoliciesProps> = ({ onOpenLegal }) => {
  const linkClass = 'hover:text-[var(--sc-emerald-light)] transition-colors text-left';

  return (
    <div className="space-y-3">
      <h4 className="font-serif font-semibold text-sm uppercase tracking-wider text-[var(--sc-emerald-light)]">
        Help & Policies
      </h4>
      <ul className="space-y-2 text-xs text-[#a39c91]">
        <li>
          <button onClick={() => onOpenLegal('privacy')} className={linkClass}>
            Privacy Policy
          </button>
        </li>
        <li>
          <button onClick={() => onOpenLegal('rental-terms')} className={linkClass}>
            Jewellery Rental Terms
          </button>
        </li>
        <li>
          <button onClick={() => onOpenLegal('sanitization')} className={linkClass}>
            Sanitization Standards
          </button>
        </li>
      </ul>
    </div>
  );
};