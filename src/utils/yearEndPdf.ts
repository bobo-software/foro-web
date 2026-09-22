import type { Business } from '../types/business';
import type { PayrollEmployerSettings } from '../types/employee';
import type { YearEndBatchDetail, YearEndCertificate } from '../types/yearEnd';
import { YEAR_END_TYPE_LABELS, yearEndEmployeeName } from '../types/yearEnd';
import { parseMoney } from './payrollPackage';
import { formatCurrency } from './currency';
import { formatCalendarDate } from './recurrence';
import { slugForFilename } from './payslipPdf';
import { fetchLogoAsBase64 } from './pdfLogoHelper';
import { PDF, addLogo, drawHLine } from './pdfTemplates/types';

export function taxYearCodeSlug(code: string): string {
  return code.trim().replace(/[^\w]+/g, '-').replace(/^-+|-+$/g, '') || 'tax-year';
}

export function yearEndFilename(type: string, taxYearCode: string, legalName: string): string {
  return `${type}-${taxYearCodeSlug(taxYearCode)}-${slugForFilename(legalName)}.pdf`;
}

const TEXT: [number, number, number] = [15, 23, 42];
const MUTED: [number, number, number] = [71, 85, 105];
const ACCENT: [number, number, number] = [79, 70, 229];
const RULE: [number, number, number] = [203, 213, 225];

export async function generateYearEndPdf(
  batch: Pick<YearEndBatchDetail, 'tax_year_code' | 'starts_on' | 'ends_on'>,
  certificate: YearEndCertificate,
  settings?: PayrollEmployerSettings | null,
  business?: Business | null,
): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  const { margin, rightEdge, pageHeight } = PDF;
  let y = margin;
  let rightY = margin;
  const typeLabel =
    YEAR_END_TYPE_LABELS[certificate.certificate_type] ?? certificate.certificate_type.toUpperCase();
  const legalName = yearEndEmployeeName(certificate);

  const showLogo = business?.show_logo_on_documents && business?.logo_url;
  const logo = showLogo ? await fetchLogoAsBase64(business!.logo_url!) : null;
  if (logo) {
    const dims = addLogo(doc, logo, margin, y - 2, 28, 14);
    y = Math.max(y, y - 2 + dims.h + 3);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...TEXT);
  doc.text(business?.name?.trim() || 'Employer', margin, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  if (business?.address) {
    const lines = doc.splitTextToSize(business.address, 90);
    doc.text(lines, margin, y);
    y += lines.length * 4;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...ACCENT);
  doc.text(typeLabel, rightEdge, rightY, { align: 'right' });
  rightY += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(`Tax year ${batch.tax_year_code}`, rightEdge, rightY, { align: 'right' });
  rightY += 4;
  const refs = [
    settings?.paye_reference ? `PAYE ${settings.paye_reference}` : null,
    settings?.uif_reference ? `UIF ${settings.uif_reference}` : null,
  ].filter((value): value is string => Boolean(value));
  for (const ref of refs) {
    doc.text(ref, rightEdge, rightY, { align: 'right' });
    rightY += 4;
  }
  y = Math.max(y, rightY) + 3;
  drawHLine(doc, y, RULE, true);
  y += 8;

  const identity: Array<[string, string]> = [
    ['Employee', legalName],
    ['Tax number', certificate.tax_number?.trim() || '—'],
    ['ID / passport', certificate.id_number?.trim() || certificate.passport_number?.trim() || '—'],
    ['Period of employment', `${formatCalendarDate(certificate.period_start)} – ${formatCalendarDate(certificate.period_end)}`],
  ];
  identity.forEach((entry, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const x = margin + col * (PDF.contentWidth / 2);
    const rowY = y + row * 10;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...MUTED);
    doc.text(entry[0].toUpperCase(), x, rowY);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...TEXT);
    doc.text(entry[1], x, rowY + 4);
  });
  y += 24;
  drawHLine(doc, y, RULE);
  y += 7;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('SARS source codes', margin, y);
  y += 6;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...MUTED);
  doc.text('Code', margin, y);
  doc.text('Description', margin + 22, y);
  doc.text('Amount', rightEdge, y, { align: 'right' });
  y += 5;
  doc.setTextColor(...TEXT);
  if (certificate.items.length === 0) {
    doc.setTextColor(...MUTED);
    doc.text('No source-coded amounts in paid runs for this tax year.', margin, y);
    y += 5;
  }
  for (const item of certificate.items) {
    if (y > pageHeight - 28) {
      doc.addPage();
      y = margin;
    }
    doc.text(item.source_code, margin, y);
    doc.text(item.name, margin + 22, y);
    doc.text(formatCurrency(parseMoney(item.amount)), rightEdge, y, { align: 'right' });
    y += 5;
  }
  y += 6;

  const totals: Array<[string, string]> = [
    ['Gross', formatCurrency(parseMoney(certificate.gross))],
    ['Taxable', formatCurrency(parseMoney(certificate.taxable))],
    ['PAYE (4102)', formatCurrency(parseMoney(certificate.paye))],
    ['UIF employee (4141)', formatCurrency(parseMoney(certificate.uif_employee))],
  ];
  totals.forEach((entry, index) => {
    const x = margin + (index % 2) * (PDF.contentWidth / 2);
    const rowY = y + Math.floor(index / 2) * 10;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...MUTED);
    doc.text(entry[0].toUpperCase(), x, rowY);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...TEXT);
    doc.text(entry[1], x, rowY + 4);
  });
  y += 28;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(
    'Figures are operational from paid pay runs. An accountant still files with SARS. This is not an e@syFile export.',
    margin,
    Math.min(y, pageHeight - 12),
  );

  doc.save(yearEndFilename(certificate.certificate_type, batch.tax_year_code, legalName));
}
