import type { Business } from '../types/business';
import {
  BUSINESS_TAX_ENTITY_LABELS,
  MONTH_LABELS,
  TAX_RETURN_KIND_LABELS,
  type TaxMonthFigures,
  type TaxReturn,
  type TaxReturnMonthlyTotals,
} from '../types/businessTax';
import {
  amountDueLabel,
  formatSignedAmount,
  formatSummaryAmount,
  isProvisionalReturn,
  settledLabel,
  taxReturnSummaryRows,
  taxYearLabel,
} from './businessTax';
import { escapeCsvField } from './csvDownload';
import { formatCalendarDate } from './recurrence';
import { fetchLogoAsBase64 } from './pdfLogoHelper';
import { PDF, addLogo, drawHLine } from './pdfTemplates/types';

export const TAX_EXPORT_DISCLAIMER =
  'Estimates from the documents in Foro, not tax advice. An accountant still files with SARS; this is not an eFiling upload.';

export interface TaxExportContext {
  business?: Business | null;
  taxReference?: string | null;
}

export function taxReturnFilename(taxReturn: TaxReturn, ext: 'pdf' | 'csv'): string {
  const kind = taxReturn.kind === 'annual' ? 'income-tax' : taxReturn.kind.replace('_', '-');
  return `${kind}-${taxReturn.tax_year_code}.${ext}`;
}

/** `2026-09` → "Sep 2026". */
export function shortMonthLabel(month: string): string {
  const [year, monthNumber] = month.split('-').map(Number);
  const label = MONTH_LABELS[monthNumber - 1];
  return label ? `${label.slice(0, 3)} ${year}` : month;
}

export const MONTHLY_COLUMNS: { key: keyof TaxMonthFigures; label: string }[] = [
  { key: 'gross_income', label: 'Income' },
  { key: 'credit_notes', label: 'Credit notes' },
  { key: 'bill_costs', label: 'Bills' },
  { key: 'expense_costs', label: 'Expenses' },
  { key: 'non_deductible', label: 'Non-deductible' },
  { key: 'payroll_costs', label: 'Payroll' },
  { key: 'net', label: 'Net' },
];

function returnTitle(taxReturn: TaxReturn): string {
  return isProvisionalReturn(taxReturn) ? TAX_RETURN_KIND_LABELS[taxReturn.kind] : 'Annual income tax return';
}

function periodLabel(taxReturn: TaxReturn): string {
  return `${formatCalendarDate(taxReturn.period_start)} – ${formatCalendarDate(taxReturn.period_end)}`;
}

const money = (value: number) => value.toFixed(2);

/** Totals are read live from documents, so the label names the dates covered rather than the snapshot. */
export function monthlyRangeLabel(monthly: TaxReturnMonthlyTotals): string {
  return `Documents dated ${formatCalendarDate(monthly.period_start)} – ${formatCalendarDate(monthly.data_through)}, as they stand today`;
}

export function buildTaxReturnCsv(
  taxReturn: TaxReturn,
  monthly: TaxReturnMonthlyTotals,
  context: TaxExportContext = {},
): string {
  const rows: (string | number)[][] = [
    [returnTitle(taxReturn)],
    ['Business', context.business?.name?.trim() || 'Business'],
    ['Income tax reference', context.taxReference?.trim() || ''],
    ['Taxpayer type', BUSINESS_TAX_ENTITY_LABELS[taxReturn.entity_type]],
    ['Year of assessment', taxYearLabel(taxReturn.tax_year_code)],
    ['Period', periodLabel(taxReturn)],
  ];
  if (taxReturn.due_date) rows.push(['Due date', formatCalendarDate(taxReturn.due_date)]);
  rows.push(
    ['Status', taxReturn.status === 'submitted' ? 'Submitted' : 'Draft'],
    ['Amounts', monthly.vat_registered ? 'Excluding VAT (VAT registered)' : 'Including VAT (not VAT registered)'],
    ['Rate tables', taxReturn.rate_table_code ?? ''],
    [],
    ['Calculation', 'Amount'],
    ...taxReturnSummaryRows(taxReturn).map((row) => [row.label, money(row.amount)]),
  );
  if (taxReturn.adjustments.length > 0) {
    rows.push([], ['Adjustments', 'Direction', 'Amount']);
    for (const adjustment of taxReturn.adjustments) {
      rows.push([
        adjustment.label,
        adjustment.direction === 'add' ? 'Add back' : 'Deduct',
        money(adjustment.direction === 'add' ? adjustment.amount : -adjustment.amount),
      ]);
    }
  }
  rows.push(
    [],
    [`Source totals by month (${monthlyRangeLabel(monthly)}, before adjustments)`],
    ['Month', ...MONTHLY_COLUMNS.map((column) => column.label)],
    ...monthly.months.map((month) => [month.month, ...MONTHLY_COLUMNS.map((column) => money(month[column.key]))]),
    ['Total', ...MONTHLY_COLUMNS.map((column) => money(monthly.totals[column.key]))],
  );
  if (taxReturn.warnings.length > 0) {
    rows.push([], ['Warnings'], ...taxReturn.warnings.map((warning) => [warning]));
  }
  if (taxReturn.notes?.trim()) rows.push([], ['Notes', taxReturn.notes.trim()]);
  rows.push([], [TAX_EXPORT_DISCLAIMER]);
  return rows.map((row) => row.map(escapeCsvField).join(',')).join('\r\n');
}

const TEXT: [number, number, number] = [15, 23, 42];
const MUTED: [number, number, number] = [71, 85, 105];
const ACCENT: [number, number, number] = [79, 70, 229];
const RULE: [number, number, number] = [203, 213, 225];
const WARN: [number, number, number] = [146, 64, 14];

export async function generateTaxReturnPdf(
  taxReturn: TaxReturn,
  monthly: TaxReturnMonthlyTotals,
  context: TaxExportContext = {},
): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  const { margin, rightEdge, pageHeight, contentWidth } = PDF;
  const bottom = pageHeight - 18;
  let y = margin;
  let rightY = margin;
  const ensureSpace = (height: number) => {
    if (y + height > bottom) {
      doc.addPage();
      y = margin;
    }
  };
  const sectionTitle = (title: string) => {
    ensureSpace(14);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...TEXT);
    doc.text(title, margin, y);
    y += 6;
  };

  const business = context.business;
  const showLogo = business?.show_logo_on_documents && business?.logo_url;
  const logo = showLogo ? await fetchLogoAsBase64(business!.logo_url!) : null;
  if (logo) {
    const dims = addLogo(doc, logo, margin, y - 2, 28, 14);
    y = Math.max(y, y - 2 + dims.h + 3);
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...TEXT);
  doc.text(business?.name?.trim() || 'Business', margin, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(BUSINESS_TAX_ENTITY_LABELS[taxReturn.entity_type], margin, y);
  y += 4;
  if (context.taxReference?.trim()) {
    doc.text(`Income tax ref ${context.taxReference.trim()}`, margin, y);
    y += 4;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...ACCENT);
  doc.text(returnTitle(taxReturn), rightEdge, rightY, { align: 'right' });
  rightY += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  const headerLines = [
    taxYearLabel(taxReturn.tax_year_code),
    taxReturn.due_date ? `Due ${formatCalendarDate(taxReturn.due_date)}` : periodLabel(taxReturn),
    taxReturn.status === 'submitted'
      ? `Submitted${taxReturn.submitted_at ? ` ${formatCalendarDate(taxReturn.submitted_at.slice(0, 10))}` : ''}`
      : 'Draft — figures may still change',
    monthly.vat_registered ? 'Amounts exclude VAT' : 'Amounts include VAT',
  ];
  for (const line of headerLines) {
    doc.text(line, rightEdge, rightY, { align: 'right' });
    rightY += 4;
  }
  y = Math.max(y, rightY) + 3;
  drawHLine(doc, y, RULE, true);
  y += 8;

  doc.setFillColor(238, 242, 255);
  doc.rect(margin, y - 5, contentWidth, 10, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...ACCENT);
  doc.text(settledLabel(taxReturn), margin + 2, y + 2);
  doc.text(amountDueLabel(taxReturn.amount_due), rightEdge - 2, y + 2, { align: 'right' });
  y += 14;

  sectionTitle('Calculation');
  doc.setFontSize(9);
  for (const row of taxReturnSummaryRows(taxReturn)) {
    ensureSpace(6);
    doc.setFont('helvetica', row.emphasis ? 'bold' : 'normal');
    doc.setTextColor(...(row.emphasis ? TEXT : MUTED));
    doc.text(row.label, margin, y);
    doc.text(formatSummaryAmount(row), rightEdge, y, { align: 'right' });
    y += 5;
  }
  if (taxReturn.rate_table_code) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(`SARS ${taxReturn.rate_table_code} rate tables`, margin, y);
    y += 4;
  }
  y += 4;

  if (taxReturn.adjustments.length > 0) {
    sectionTitle('Adjustments');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...TEXT);
    for (const adjustment of taxReturn.adjustments) {
      ensureSpace(6);
      doc.text(adjustment.label, margin, y);
      doc.text(
        formatSignedAmount(adjustment.direction === 'add' ? adjustment.amount : -adjustment.amount),
        rightEdge,
        y,
        { align: 'right' },
      );
      y += 5;
    }
    y += 4;
  }

  sectionTitle('Source totals by month');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.text(
    `${monthlyRangeLabel(monthly)}, before adjustments. Brackets are deductions.`,
    margin,
    y,
  );
  y += 5;
  const monthColumn = 20;
  const columnWidth = (contentWidth - monthColumn) / MONTHLY_COLUMNS.length;
  const columnRight = (index: number) => margin + monthColumn + columnWidth * (index + 1);
  const drawMonthRow = (label: string, values: TaxMonthFigures, bold = false) => {
    ensureSpace(5);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setTextColor(...TEXT);
    doc.text(label, margin, y);
    MONTHLY_COLUMNS.forEach((column, index) => {
      const value = values[column.key];
      const signed = ['credit_notes', 'bill_costs', 'expense_costs', 'payroll_costs'].includes(column.key)
        ? -value
        : value;
      doc.text(value === 0 ? '–' : formatSignedAmount(signed), columnRight(index), y, { align: 'right' });
    });
    y += 4.5;
  };
  ensureSpace(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...MUTED);
  doc.text('Month', margin, y);
  MONTHLY_COLUMNS.forEach((column, index) => doc.text(column.label, columnRight(index), y, { align: 'right' }));
  y += 2;
  drawHLine(doc, y, RULE);
  y += 4;
  for (const month of monthly.months) drawMonthRow(shortMonthLabel(month.month), month);
  drawHLine(doc, y - 2.5, RULE);
  y += 1;
  drawMonthRow('Total', monthly.totals, true);
  y += 6;

  if (taxReturn.warnings.length > 0) {
    sectionTitle('Warnings');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...WARN);
    for (const warning of taxReturn.warnings) {
      const lines: string[] = doc.splitTextToSize(`• ${warning}`, contentWidth);
      ensureSpace(lines.length * 4 + 1);
      doc.text(lines, margin, y);
      y += lines.length * 4 + 1;
    }
    y += 4;
  }

  if (taxReturn.notes?.trim()) {
    sectionTitle('Notes');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...TEXT);
    const lines: string[] = doc.splitTextToSize(taxReturn.notes.trim(), contentWidth);
    ensureSpace(lines.length * 4);
    doc.text(lines, margin, y);
    y += lines.length * 4 + 4;
  }

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(doc.splitTextToSize(TAX_EXPORT_DISCLAIMER, contentWidth - 30), margin, pageHeight - 12);
    doc.text(`Page ${page} of ${pageCount}`, rightEdge, pageHeight - 12, { align: 'right' });
  }

  doc.save(taxReturnFilename(taxReturn, 'pdf'));
}
