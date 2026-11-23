export const COURIER_OPTIONS = [
  'Delhivery',
  'Blue Dart',
  'DTDC',
  'Xpressbees',
  'India Post',
  'Professional Couriers',
  'Shree Tirupati Courier',
  'Other',
] as const;

/** Best-effort public tracking URL for common Indian couriers. */
export function buildTrackingUrl(courier?: string, trackingNumber?: string): string | undefined {
  const awb = String(trackingNumber || '').trim();
  if (!awb) return undefined;
  const c = String(courier || '').trim().toLowerCase();
  const enc = encodeURIComponent(awb);

  if (c.includes('delhivery')) return `https://www.delhivery.com/track/package/${enc}`;
  if (c.includes('blue')) return `https://www.bluedart.com/tracking?AWB=${enc}`;
  if (c.includes('dtdc')) return `https://www.dtdc.in/services/trackandtrace.asp?awb=${enc}`;
  if (c.includes('xpress')) return `https://www.xpressbees.com/track/${enc}`;
  if (c.includes('india post') || c.includes('indiapost')) return `https://www.indiapost.gov.in/_layouts/15/dop.Portal.depts.BLVW/forms/trackandtrace.aspx?ItemId=${enc}`;
  if (c.includes('tirupati')) return `https://tirupaticourier.com/track?waybill=${enc}`;
  // Professional Couriers, Other/unknown, etc. — no public tracker link.
  return undefined;
}
