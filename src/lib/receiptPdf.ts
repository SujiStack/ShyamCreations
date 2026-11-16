import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { buildReceiptHtml, type ReceiptData } from './receipt';

export interface ReceiptPdfResult {
  /** Raw base64 of the PDF (no data: prefix) */
  base64: string;
  /** data URI including the application/pdf prefix */
  dataUri: string;
  filename: string;
}

/**
 * Renders the SAME printable HTML template used for the on-screen / print
 * receipt into a PDF (via html2canvas + jsPDF), so there is exactly one
 * template to maintain. Image-based A4 output, JPEG compressed.
 */
export async function generateReceiptPdf(data: ReceiptData): Promise<ReceiptPdfResult> {
  const html = buildReceiptHtml(data);

  // Render into an off-screen iframe so the receipt gets its own full
  // document, <style> block, @media rules and inline SVG — isolated from the
  // app's CSS.
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText =
    'position:fixed;left:-10000px;top:0;width:800px;height:1400px;opacity:0;pointer-events:none;visibility:hidden;';
  document.body.appendChild(iframe);

  try {
    const docEl = iframe.contentDocument;
    if (!docEl) throw new Error('Could not create receipt render frame');

    await new Promise<void>((resolve) => {
      const done = () => resolve();
      iframe.addEventListener('load', done, { once: true });
      docEl.open();
      docEl.write(html);
      docEl.close();
      // If 'load' already fired for a synchronous write, resolve anyway.
      window.setTimeout(done, 1500);
    });

    // Hide the on-screen-only print button so it doesn't appear in the PDF.
    docEl.querySelectorAll('.no-print').forEach((el) => el.remove());

    // Give the SVG + fonts a moment to settle before rasterizing.
    await new Promise<void>((resolve) => window.setTimeout(resolve, 250));

    const target = (docEl.body || docEl.documentElement) as HTMLElement;
    const canvas = await html2canvas(target, {
      scale: 1.6,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#f5efe4',
      logging: false,
      windowWidth: 800,
      windowHeight: Math.max(target.scrollHeight, 900),
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.72);

    const pdf = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
    const pageW = 210;
    const margin = 8;
    const imgW = pageW - margin * 2;
    const pageH = 297 - margin * 2;
    const imgH = (canvas.height * imgW) / canvas.width;

    // Slice the tall receipt image across A4 pages.
    let remaining = imgH;
    let offset = 0;
    let page = 0;
    while (remaining > 0.5) {
      if (page > 0) pdf.addPage();
      pdf.addImage(imgData, 'JPEG', margin, margin - offset, imgW, imgH);
      remaining -= pageH;
      offset += pageH;
      page++;
    }

    const arrayBuffer = pdf.output('arraybuffer') as ArrayBuffer;
    const bytes = new Uint8Array(arrayBuffer);
    let bin = '';
    const CHUNK = 0x8000;
    for (let i = 0; i < bytes.length; i += CHUNK) {
      bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
    }
    const base64 = btoa(bin);

    return {
      base64,
      dataUri: `data:application/pdf;base64,${base64}`,
      filename: `Shyam-Creations-Receipt-${data.ref}.pdf`,
    };
  } finally {
    document.body.removeChild(iframe);
  }
}
