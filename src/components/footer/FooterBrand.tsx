import React from 'react';

export const FooterBrand: React.FC = () => {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <img
          src="/ShyamCreation.png"
          alt="Shyam Creations logo"
          className="h-10 w-10 md:h-11 md:w-11 shrink-0 rounded-xl ring-1 ring-[var(--sc-emerald)]/40 object-contain bg-black/20"
        />
        <h3 className="font-serif text-2xl font-bold text-[var(--sc-emerald-light)] tracking-tight">
          Shyam Creations
        </h3>
      </div>

      <p className="text-xs text-[#a39c91] leading-relaxed">
        Crafting timeless South Asian bridal stories in Tambaram, Chennai through 2 specialised studio offerings: Bridal Mehendi Artistry & Luxury Jewellery Rentals.
      </p>
    </div>
  );
};