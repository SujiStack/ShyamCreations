import { STUDIO_INFO } from '../data/mockData';

export interface ReceiptRow {
  label: string;
  value: string;
}

export interface ReceiptData {
  /** e.g. 'Jewellery Order Receipt' / 'Mehandi Booking Receipt' */
  title: string;
  ref: string;
  date: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  address?: string;
  /** Item / service lines shown in the body table */
  items: ReceiptRow[];
  /** Amount breakdown rows shown above the grand total */
  summary: ReceiptRow[];
  totalLabel: string;
  totalAmount: string;
  paymentMethod?: string;
  paymentStatus?: string;
  transactionId?: string;
  notes?: string;
}

function esc(s: string | undefined | null): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Inline SVG medallion logo for Shyam Creations (self-contained, prints well). */
export const STUDIO_LOGO_SVG = `<svg width="76" height="76" viewBox="0 0 76 76" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Shyam Creations logo">
  <circle cx="38" cy="38" r="36" fill="#0e5c3f" stroke="#C08A34" stroke-width="2.5"/>
  <circle cx="38" cy="38" r="29" fill="none" stroke="#C08A34" stroke-width="1" stroke-dasharray="2 3"/>
  <text x="38" y="35.5" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="21" font-weight="bold" fill="#E8C97A" letter-spacing="2">SC</text>
  <text x="38" y="48.5" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="6.4" fill="#F7EAD1" letter-spacing="1.4">SHYAM</text>
  <text x="38" y="57" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="6.4" fill="#F7EAD1" letter-spacing="1.4">CREATIONS</text>
</svg>`;

/** UTF-8 safe base64 (btoa alone throws on ₹, emoji, etc.). */
export function utf8ToBase64(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let bin = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin);
}

/** Plain-text version of the receipt — useful inside the email body. */
export function receiptPlainText(data: ReceiptData): string {
  const line = '------------------------------------------';
  const rows = (rs: ReceiptRow[]) => rs.map((r) => `${r.label}: ${r.value}`).join('\n');
  return [
    `${STUDIO_INFO.name} — ${data.title}`,
    `Receipt Ref: ${data.ref}`,
    `Date: ${data.date}`,
    line,
    `Customer: ${data.customerName}`,
    `Phone: ${data.customerPhone}`,
    data.customerEmail ? `Email: ${data.customerEmail}` : '',
    data.address ? `Address: ${data.address}` : '',
    line,
    'Items / Services:',
    rows(data.items),
    line,
    'Payment Summary:',
    rows(data.summary),
    `${data.totalLabel}: ${data.totalAmount}`,
    data.paymentStatus ? `Payment Status: ${data.paymentStatus}` : '',
    data.paymentMethod ? `Payment Method: ${data.paymentMethod}` : '',
    data.transactionId ? `Transaction / Payment ID: ${data.transactionId}` : '',
    data.notes ? `Notes: ${data.notes}` : '',
    line,
    `Thank you for choosing ${STUDIO_INFO.name}!`,
    `Contact: ${STUDIO_INFO.phone} | ${STUDIO_INFO.email} | Instagram: ${STUDIO_INFO.instagram}`,
  ]
    .filter((l) => l !== '')
    .join('\n');
}

/** Builds the standalone receipt HTML (used by print window and email attachment). */
export function buildReceiptHtml(data: ReceiptData, options?: { autoPrint?: boolean }): string {
  const itemRows = data.items
    .map(
      (r) => `<tr><td>${esc(r.label)}</td><td style="text-align:right">${esc(r.value)}</td></tr>`
    )
    .join('');
  const summaryRows = data.summary
    .map(
      (r) => `<tr><td>${esc(r.label)}</td><td style="text-align:right">${esc(r.value)}</td></tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>${esc(data.title)} — ${esc(data.ref)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: Georgia, 'Times New Roman', serif; }
  body { background: #f5efe4; padding: 24px; color: #2b241c; }
  .receipt { max-width: 640px; margin: 0 auto; background: #fffdf8; border: 1px solid #d8c9a8; border-radius: 12px; overflow: hidden; }
  .header { background: linear-gradient(160deg, #0e5c3f, #083d29); color: #f7ead1; text-align: center; padding: 22px 20px 18px; }
  .header .logo { margin: 0 auto 10px; width: 76px; height: 76px; }
  .header .logo svg { display: block; filter: drop-shadow(0 2px 6px rgba(0,0,0,0.35)); }
  .header h1 { font-size: 22px; letter-spacing: 2px; }
  .header p { font-size: 11px; opacity: 0.9; margin-top: 4px; font-style: italic; }
  .body { padding: 20px 24px; }
  .refline { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px dashed #d8c9a8; padding-bottom: 12px; margin-bottom: 12px; font-size: 12px; }
  .refline .ref { font-family: 'Courier New', monospace; font-weight: bold; font-size: 15px; background: #0e5c3f; color: #f7ead1; padding: 4px 12px; border-radius: 20px; letter-spacing: 1px; }
  h2 { font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #0e5c3f; margin: 14px 0 6px; border-bottom: 1px solid #e5d9bd; padding-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  td { padding: 5px 2px; vertical-align: top; }
  .summary td { border-top: 1px solid #eee2c8; }
  .total { display: flex; justify-content: space-between; background: #0e5c3f; color: #f7ead1; border-radius: 8px; padding: 10px 14px; margin-top: 10px; font-size: 15px; font-weight: bold; }
  .meta { font-size: 11px; color: #4a4235; line-height: 1.7; background: #faf3e3; border: 1px solid #e5d9bd; border-radius: 8px; padding: 10px 12px; margin-top: 10px; }
  .footer { text-align: center; font-size: 10px; color: #6b5f4e; border-top: 2px dashed #d8c9a8; padding: 14px; margin-top: 14px; line-height: 1.7; }
  .badge { display: inline-block; background: #e8f5ee; color: #0e5c3f; border: 1px solid #0e5c3f; border-radius: 12px; font-size: 10px; font-weight: bold; padding: 1px 10px; }
  @media print { body { background: #fff; padding: 0; } .receipt { border: none; border-radius: 0; max-width: 100%; } .no-print { display: none; } }
</style>
</head>
<body>
  <div class="receipt">
    <div class="header">
      <div class="logo">${STUDIO_LOGO_SVG}</div>
      <h1>${esc(STUDIO_INFO.name)}</h1>
      <p>${esc(STUDIO_INFO.tagline)}</p>
      <p>${esc(STUDIO_INFO.location)} • ${esc(STUDIO_INFO.phone)} • ${esc(STUDIO_INFO.email)}</p>
    </div>
    <div class="body">
      <div class="refline">
        <div>
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#8a7f72">${esc(data.title)}</div>
          <div style="font-size:11px;margin-top:2px">Date: <strong>${esc(data.date)}</strong></div>
        </div>
        <div class="ref">${esc(data.ref)}</div>
      </div>

      <h2>Customer Details</h2>
      <div class="meta">
        <strong>${esc(data.customerName)}</strong><br/>
        Phone: ${esc(data.customerPhone)}${data.customerEmail ? `<br/>Email: ${esc(data.customerEmail)}` : ''}${data.address ? `<br/>Address: ${esc(data.address)}` : ''}
      </div>

      <h2>Items / Services</h2>
      <table><tbody>${itemRows}</tbody></table>

      <h2>Payment Summary</h2>
      <table class="summary"><tbody>${summaryRows}</tbody></table>
      <div class="total"><span>${esc(data.totalLabel)}</span><span>${esc(data.totalAmount)}</span></div>

      <div class="meta">
        ${data.paymentStatus ? `Payment Status: <span class="badge">${esc(data.paymentStatus)}</span><br/>` : ''}
        ${data.paymentMethod ? `Payment Method: ${esc(data.paymentMethod)}<br/>` : ''}
        ${data.transactionId ? `Transaction / Payment ID: <span style="font-family:'Courier New',monospace">${esc(data.transactionId)}</span><br/>` : ''}
        ${data.notes ? `Notes: ${esc(data.notes)}` : ''}
      </div>

      <div class="footer">
        Thank you for choosing ${esc(STUDIO_INFO.name)}! 🌸<br/>
        For any queries regarding this receipt, contact us at ${esc(STUDIO_INFO.phone)} / ${esc(STUDIO_INFO.email)}<br/>
        Instagram: ${esc(STUDIO_INFO.instagram)}
      </div>

      <div class="no-print" style="text-align:center;margin-top:16px">
        <button onclick="window.print()" style="background:#0e5c3f;color:#fff;border:none;padding:12px 32px;border-radius:24px;font-size:14px;font-weight:bold;cursor:pointer">🖨️ Print / Save as PDF</button>
      </div>
    </div>
  </div>
  ${options?.autoPrint ? '<script>window.onload = function () { setTimeout(function(){ window.print(); }, 350); };</script>' : ''}
</body>
</html>`;
}

/**
 * Opens a print-friendly receipt in a new window so the customer can
 * print it or "Save as PDF" from the browser print dialog.
 */
export function openPrintableReceipt(data: ReceiptData): void {
  const html = buildReceiptHtml(data, { autoPrint: true });
  const win = window.open('', '_blank', 'width=760,height=900');
  if (!win) {
    alert('Please allow pop-ups to download the receipt.');
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
}
