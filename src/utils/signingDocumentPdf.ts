/**
 * PDF export for signing documents.
 *
 * Walks the (server-sanitised) rich-text HTML into jsPDF text — headings,
 * bold/italic/underline, lists, quotes, links — then draws the two-party
 * signature block with the drawn signature images.
 */

import type { jsPDF } from 'jspdf';
import type { SigningDocumentView } from '../types/signingDocument';
import { logger } from './logger';

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 20;
const CONTENT_W = PAGE_W - MARGIN * 2;
const PT_TO_MM = 0.3528;
const SIGNATURE_BLOCK_H = 50;

interface Run {
  text: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  href?: string;
}

interface Block {
  runs: Run[];
  fontSize: number;
  indent: number;
  /** "•" or "1." etc. drawn in the indent */
  marker?: string;
  spaceBefore: number;
  quote?: boolean;
}

interface ImageData {
  dataUrl: string;
  width: number;
  height: number;
}

// ─── HTML → blocks ───────────────────────────────────────────────────────────

function collectRuns(node: Node, style: Omit<Run, 'text'>, out: Run[]): void {
  node.childNodes.forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = (child.textContent ?? '').replace(/\s+/g, ' ');
      if (text) out.push({ ...style, text });
      return;
    }
    if (!(child instanceof HTMLElement)) return;
    const tag = child.tagName.toLowerCase();
    if (tag === 'br') {
      out.push({ ...style, text: '\n' });
      return;
    }
    // Nested lists are handled as their own blocks.
    if (tag === 'ul' || tag === 'ol') return;
    collectRuns(child, {
      bold: style.bold || tag === 'strong' || tag === 'b',
      italic: style.italic || tag === 'em' || tag === 'i',
      underline: style.underline || tag === 'u' || tag === 'a',
      href: tag === 'a' ? child.getAttribute('href') ?? undefined : style.href,
    }, out);
  });
}

const PLAIN: Omit<Run, 'text'> = { bold: false, italic: false, underline: false };
const HEADING_SIZES: Record<string, number> = { h1: 18, h2: 15, h3: 13 };

function htmlToBlocks(html: string): Block[] {
  const root = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html').body.firstElementChild;
  const blocks: Block[] = [];
  if (!root) return blocks;

  const walk = (elements: Element[], indent: number, quote: boolean) => {
    elements.forEach((child) => {
      const tag = child.tagName.toLowerCase();
      if (tag in HEADING_SIZES) {
        const runs: Run[] = [];
        collectRuns(child, { ...PLAIN, bold: true }, runs);
        blocks.push({ runs, fontSize: HEADING_SIZES[tag], indent, spaceBefore: 5, quote });
      } else if (tag === 'p') {
        const runs: Run[] = [];
        collectRuns(child, PLAIN, runs);
        blocks.push({ runs, fontSize: 10.5, indent, spaceBefore: 2.5, quote });
      } else if (tag === 'blockquote') {
        walk(Array.from(child.children), indent + 4, true);
      } else if (tag === 'ul' || tag === 'ol') {
        Array.from(child.children).forEach((li, index) => {
          const runs: Run[] = [];
          collectRuns(li, PLAIN, runs);
          blocks.push({
            runs,
            fontSize: 10.5,
            indent: indent + 6,
            marker: tag === 'ol' ? `${index + 1}.` : '•',
            spaceBefore: 1,
            quote,
          });
          // Nested lists inside this item.
          walk(
            Array.from(li.children).filter((c) => ['ul', 'ol'].includes(c.tagName.toLowerCase())),
            indent + 6,
            quote,
          );
        });
      } else {
        const runs: Run[] = [];
        collectRuns(child, PLAIN, runs);
        if (runs.length) blocks.push({ runs, fontSize: 10.5, indent, spaceBefore: 2.5, quote });
      }
    });
  };
  walk(Array.from(root.children), 0, false);
  return blocks;
}

// ─── Rendering ───────────────────────────────────────────────────────────────

function fontStyle(run: Pick<Run, 'bold' | 'italic'>): string {
  if (run.bold && run.italic) return 'bolditalic';
  if (run.bold) return 'bold';
  if (run.italic) return 'italic';
  return 'normal';
}

class Cursor {
  y = MARGIN;
  constructor(private readonly doc: jsPDF) {}

  ensure(height: number): void {
    if (this.y + height > PAGE_H - MARGIN) {
      this.doc.addPage();
      this.y = MARGIN;
    }
  }
}

function renderBlock(doc: jsPDF, cursor: Cursor, block: Block): void {
  const lineH = block.fontSize * PT_TO_MM * 1.45;
  const left = MARGIN + block.indent;
  const maxW = CONTENT_W - block.indent;
  cursor.y += block.spaceBefore;
  cursor.ensure(lineH);
  doc.setFontSize(block.fontSize);

  const startY = cursor.y;
  let x = left;
  let baseline = cursor.y + block.fontSize * PT_TO_MM;

  if (block.marker) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);
    doc.text(block.marker, left - 5, baseline);
  }

  const newLine = () => {
    cursor.y += lineH;
    cursor.ensure(lineH);
    x = left;
    baseline = cursor.y + block.fontSize * PT_TO_MM;
  };

  for (const run of block.runs) {
    if (run.text === '\n') {
      newLine();
      continue;
    }
    doc.setFont('helvetica', fontStyle(run));
    if (run.href) doc.setTextColor(79, 70, 229);
    else doc.setTextColor(30, 41, 59);

    // Split keeping whitespace tokens so spacing between runs survives.
    for (const token of run.text.split(/(\s+)/)) {
      if (!token) continue;
      const isSpace = /^\s+$/.test(token);
      if (isSpace && x === left) continue;
      const w = doc.getTextWidth(isSpace ? ' ' : token);
      if (!isSpace && x + w > left + maxW && x > left) newLine();
      if (isSpace) {
        x += w;
        continue;
      }
      doc.text(token, x, baseline);
      if (run.underline) {
        doc.setDrawColor(run.href ? 79 : 30, run.href ? 70 : 41, run.href ? 229 : 59);
        doc.setLineWidth(0.2);
        doc.line(x, baseline + 0.6, x + w, baseline + 0.6);
      }
      if (run.href) doc.link(x, baseline - block.fontSize * PT_TO_MM, w, block.fontSize * PT_TO_MM, { url: run.href });
      x += w;
    }
  }
  cursor.y += lineH;

  if (block.quote) {
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.8);
    doc.line(MARGIN + block.indent - 3, startY, MARGIN + block.indent - 3, cursor.y - 1);
  }
}

async function loadImage(url: string | null | undefined): Promise<ImageData | null> {
  if (!url) return null;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    if (blob.type.includes('svg')) return null;
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
    const { width, height } = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = reject;
      img.src = dataUrl;
    });
    return { dataUrl, width, height };
  } catch (err) {
    logger.warn('Failed to load image for signing PDF:', err);
    return null;
  }
}

function fitImage(img: ImageData, maxW: number, maxH: number): { w: number; h: number } {
  const ratio = Math.min(maxW / img.width, maxH / img.height);
  return { w: img.width * ratio, h: img.height * ratio };
}

function formatDate(value: string | null): string {
  if (!value) return '';
  return new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function renderSignatureColumn(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  heading: string,
  image: ImageData | null,
  name: string | null,
  date: string | null,
): void {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(heading.toUpperCase(), x, y, { maxWidth: width });

  const lineY = y + 26;
  if (image) {
    const { w, h } = fitImage(image, width, 20);
    doc.addImage(image.dataUrl, 'PNG', x, lineY - h - 1, w, h);
  }
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.3);
  doc.line(x, lineY, x + width, lineY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text(`Name: ${name ?? ''}`, x, lineY + 5);
  doc.text(`Date: ${formatDate(date)}`, x, lineY + 10);
}

export async function generateSigningDocumentPdf(view: SigningDocumentView): Promise<jsPDF> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const cursor = new Cursor(doc);

  const [logo, senderSig, recipientSig] = await Promise.all([
    loadImage(view.business.logo_download_url),
    loadImage(view.sender_signature_url),
    loadImage(view.recipient_signature_url),
  ]);

  // Header: business details left, logo right.
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(view.business.name, MARGIN, cursor.y + 4);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  const details = [
    ...(view.business.address ? view.business.address.split('\n') : []),
    view.business.phone,
    view.business.vat_number ? `VAT: ${view.business.vat_number}` : undefined,
    view.business.registration_number ? `Reg: ${view.business.registration_number}` : undefined,
  ].filter((line): line is string => !!line);
  details.forEach((line, i) => doc.text(line, MARGIN, cursor.y + 9 + i * 4));
  let headerH = 9 + details.length * 4;
  if (logo) {
    const { w, h } = fitImage(logo, 45, 18);
    doc.addImage(logo.dataUrl, PAGE_W - MARGIN - w, cursor.y, w, h);
    headerH = Math.max(headerH, h + 2);
  }
  cursor.y += headerH + 2;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, cursor.y, PAGE_W - MARGIN, cursor.y);
  cursor.y += 8;

  // Title.
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42);
  const titleLines = doc.splitTextToSize(view.title, CONTENT_W) as string[];
  titleLines.forEach((line) => {
    cursor.ensure(8);
    doc.text(line, MARGIN, cursor.y + 6);
    cursor.y += 8;
  });
  cursor.y += 2;

  for (const block of htmlToBlocks(view.body_html)) renderBlock(doc, cursor, block);

  // Signature block, kept together on one page.
  cursor.y += 10;
  cursor.ensure(SIGNATURE_BLOCK_H);
  doc.setDrawColor(226, 232, 240);
  doc.line(MARGIN, cursor.y, PAGE_W - MARGIN, cursor.y);
  const colW = (CONTENT_W - 12) / 2;
  const top = cursor.y + 8;
  renderSignatureColumn(
    doc, MARGIN, top, colW,
    `For ${view.business.name || 'the business'}`,
    senderSig, view.sender_signed_name, view.sender_signature_date,
  );
  renderSignatureColumn(
    doc, MARGIN + colW + 12, top, colW,
    `For ${view.company_name || 'the client'}`,
    recipientSig, view.recipient_signed_name ?? view.recipient_name, view.recipient_signature_date,
  );

  return doc;
}

export async function downloadSigningDocumentPdf(view: SigningDocumentView): Promise<void> {
  const doc = await generateSigningDocumentPdf(view);
  const safeTitle = view.title.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-') || 'document';
  doc.save(`${safeTitle}${view.status === 'signed' ? '-signed' : ''}.pdf`);
}
