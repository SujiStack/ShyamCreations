// =============================================================
// Shyam Creations — Date formatting
// Display format everywhere customer-facing: DD/MM/YY (e.g. 05/11/26)
// Storage format stays ISO YYYY-MM-DD (e.g. 2026-11-05) so Supabase
// DATE columns, sorting and date comparisons keep working.
// Note: <input type="date"> always stores YYYY-MM-DD and its visible
// format is decided by the browser locale (US browsers show MM/DD/YY)
// and cannot be forced — so date entry uses the DateInputDDMMYY text
// component, which shows DD/MM/YY and emits ISO YYYY-MM-DD.
// =============================================================

export interface DateParts {
  day: number;
  month: number; // 1-12
  year: number; // full year, e.g. 2026
}

/**
 * Parse a stored date without timezone shifting.
 * Accepts: YYYY-MM-DD, DD/MM/YYYY, DD/MM/YY, DD-MM-YYYY, DD-MM-YY,
 * and ISO datetime strings (2026-11-05T00:00:00…).
 * Returns null for empty/invalid input.
 */
export function parseDateParts(value?: string | null): DateParts | null {
  if (!value) return null;
  const v = String(value).trim();
  if (!v) return null;

  // ISO date / datetime: YYYY-MM-DD…
  let m = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) {
    const year = Number(m[1]);
    const month = Number(m[2]);
    const day = Number(m[3]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) return { day, month, year };
    return null;
  }

  // DD/MM/YY, DD/MM/YYYY, DD-MM-YY, DD-MM-YYYY
  m = v.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2}|\d{4})$/);
  if (m) {
    const day = Number(m[1]);
    const month = Number(m[2]);
    let year = Number(m[3]);
    if (year < 100) year += 2000;
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) return { day, month, year };
    return null;
  }

  // Last resort: let Date parse it, but read parts in local time.
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return { day: d.getDate(), month: d.getMonth() + 1, year: d.getFullYear() };
}

const pad2 = (n: number) => String(n).padStart(2, '0');

/** Format any stored date as DD/MM/YY. Returns '' for empty, original for invalid. */
export function formatDateDDMMYY(value?: string | null): string {
  if (!value) return '';
  const p = parseDateParts(value);
  if (!p) return String(value);
  return `${pad2(p.day)}/${pad2(p.month)}/${pad2(p.year % 100)}`;
}

/** Format as DD/MM/YYYY (full year) — kept for places that need the century. */
export function formatDateDDMMYYYY(value?: string | null): string {
  if (!value) return '';
  const p = parseDateParts(value);
  if (!p) return String(value);
  return `${pad2(p.day)}/${pad2(p.month)}/${p.year}`;
}

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Parts for the date-badge UI (month name + day number). */
export function getDateBadgeParts(value?: string | null): { month: string; day: string } {
  const p = parseDateParts(value);
  if (!p) return { month: '---', day: '---' };
  return { month: MONTH_SHORT[p.month - 1] || '---', day: String(p.day) };
}
