// =============================================================
// Jewellery rental calculation with 30% refundable security deposit
//
// Example: original jewellery price ₹2,000, rental ₹600/day, 3 days
//   Rental total        = 600 × 3          = ₹1,800
//   Security deposit    = 30% of 2,000     = ₹600  (refundable after
//                                                     safe return of product)
//   Payable (excl. ship)= 1,800 + 600      = ₹2,400
// =============================================================

export const SECURITY_DEPOSIT_RATE = 0.3;

/** Parse "₹2,000", "₹600/day", "2000" → 2000 (0 when unparseable). */
export function parsePriceAmount(value?: string | number | null): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (!value) return 0;
  const digits = String(value).replace(/[^0-9]/g, '');
  const n = parseInt(digits, 10);
  return Number.isNaN(n) ? 0 : n;
}

export function formatINR(amount: number): string {
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

export interface RentalCalculation {
  originalPricePerPiece: number;
  rentalPerDayPerPiece: number;
  days: number;
  qty: number;
  /** Original price × qty — used only to compute the deposit. */
  originalTotal: number;
  /** rentalPerDay × days × qty */
  rentalTotal: number;
  /** 30% of originalTotal — refundable after safe return. */
  securityDeposit: number;
  /** rentalTotal + securityDeposit (before shipping) */
  rentalPlusDeposit: number;
}

export function calcRental(input: {
  originalPrice: string | number;
  rentalPricePerDay: string | number;
  days: number;
  qty?: number;
}): RentalCalculation {
  const qty = Math.max(1, input.qty || 1);
  const days = Math.max(1, input.days || 1);
  const originalPricePerPiece = parsePriceAmount(input.originalPrice);
  const rentalPerDayPerPiece = parsePriceAmount(input.rentalPricePerDay);
  const originalTotal = originalPricePerPiece * qty;
  const rentalTotal = rentalPerDayPerPiece * days * qty;
  const securityDeposit = Math.round(originalTotal * SECURITY_DEPOSIT_RATE);
  return {
    originalPricePerPiece,
    rentalPerDayPerPiece,
    days,
    qty,
    originalTotal,
    rentalTotal,
    securityDeposit,
    rentalPlusDeposit: rentalTotal + securityDeposit,
  };
}

/**
 * Mixed bag (sale + rental items) totals.
 * Sale items contribute their full price; rental items contribute
 * rental-per-day × days × qty plus the 30% deposit.
 */
export function calcMixedBag(input: {
  saleSubtotal: number;
  rentalItems: Array<{ originalPrice: string | number; rentalPricePerDay: string | number; qty: number }>;
  rentalDays: number;
  shipping: number;
}) {
  const days = Math.max(1, input.rentalDays || 1);
  let rentalTotal = 0;
  let originalTotal = 0;
  for (const item of input.rentalItems) {
    const c = calcRental({
      originalPrice: item.originalPrice,
      rentalPricePerDay: item.rentalPricePerDay,
      days,
      qty: item.qty,
    });
    rentalTotal += c.rentalTotal;
    originalTotal += c.originalTotal;
  }
  const securityDeposit = Math.round(originalTotal * SECURITY_DEPOSIT_RATE);
  const subtotal = input.saleSubtotal + rentalTotal;
  const grandTotal = subtotal + securityDeposit + input.shipping;
  return {
    days,
    saleSubtotal: input.saleSubtotal,
    rentalTotal,
    originalTotal,
    securityDeposit,
    subtotal,
    shipping: input.shipping,
    grandTotal,
  };
}

export const RENTAL_DAY_OPTIONS = [1, 2, 3, 5, 7, 10, 14] as const;
export const SECURITY_DEPOSIT_NOTE =
  'Security deposit is fully refundable after safe return of the product in its original condition.';
