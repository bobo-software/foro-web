import type { Employee, PayrollEmployerSettings } from '../types/employee';
import type { Business } from '../types/business';
import type { PayRunDetail, PayRunLine, PayRunLineItem } from '../types/payRun';
import { parseMoney } from './payrollPackage';
import { formatCurrency } from './currency';
import { toCalendarDate, formatCalendarDate } from './recurrence';
import { fetchLogoAsBase64 } from './pdfLogoHelper';
import { PDF, addLogo, drawHLine } from './pdfTemplates/types';

export const PAYSLIP_READY_STATUSES = ['approved', 'paid'] as const;

export function isPayslipReady(status: string): boolean {
  return (PAYSLIP_READY_STATUSES as readonly string[]).includes(status);
}

export function assertPayslipReady(status: string): void {
  if (!isPayslipReady(status)) {
    throw new Error('Payslips are available after the run is approved');
  }
}

export function slugForFilename(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return slug || 'employee';
}

export function payslipFilename(periodEnd: string, legalName: string): string {
  const period = toCalendarDate(periodEnd) ?? 'period';
  return `payslip-${period}-${slugForFilename(legalName)}.pdf`;
}

export function payRunLegalName(line: Pick<PayRunLine, 'first_name' | 'last_name'>): string {
  return `${line.first_name} ${line.last_name}`.trim();
}

export interface PayslipRow {
  name: string;
  amount: number;
  onceOff: boolean;
}

export interface PayslipModel {
  filename: string;
  employerName: string;
  employerAddress?: string;
  employerPhone?: string;
  payeReference?: string | null;
  uifReference?: string | null;
  sdlReference?: string | null;
  runNumber: string;
  employeeName: string;
  taxNumber?: string | null;
  jobTitle?: string | null;
  periodLabel: string;
  payDateLabel: string;
  frequencyLabel: string;
  earnings: PayslipRow[];
  deductions: PayslipRow[];
  employerContributions: PayslipRow[];
  gross: number;
  deductionTotal: number;
  employerTotal: number;
  net: number;
  ytdGross: number;
  ytdTaxable: number;
  ytdPaye: number;
  ytdUifEmployee: number;
}

export function groupPayslipItems(items: PayRunLineItem[]): {
  earnings: PayslipRow[];
  deductions: PayslipRow[];
  employerContributions: PayslipRow[];
} {
  const earnings: PayslipRow[] = [];
  const deductions: PayslipRow[] = [];
  const employerContributions: PayslipRow[] = [];
  const sorted = [...items].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
  for (const item of sorted) {
    const row: PayslipRow = {
      name: item.is_once_off ? `${item.name} (once-off)` : item.name,
      amount: parseMoney(item.amount),
      onceOff: item.is_once_off,
    };
    if (item.direction === 'earning') earnings.push(row);
    else if (item.direction === 'deduction') deductions.push(row);
    else if (item.direction === 'employer') employerContributions.push(row);
  }
  return { earnings, deductions, employerContributions };
}

function sumRows(rows: PayslipRow[]): number {
  return rows.reduce((total, row) => total + row.amount, 0);
}

const FREQUENCY_LABELS: Record<string, string> = {
  weekly: 'Weekly',
  fortnightly: 'Fortnightly',
  monthly: 'Monthly',
};

export function buildPayslipModel(input: {
  run: PayRunDetail;
  line: PayRunLine;
  employee?: Employee | null;
  settings?: PayrollEmployerSettings | null;
  business?: Business | null;
}): PayslipModel {
  assertPayslipReady(input.run.status);
  const grouped = groupPayslipItems(input.line.items);
  const legalName = payRunLegalName(input.line);
  const periodStart = formatCalendarDate(input.run.period_start);
  const periodEnd = formatCalendarDate(input.run.period_end);
  return {
    filename: payslipFilename(input.run.period_end, legalName),
    employerName: input.business?.name?.trim() || 'Employer',
    employerAddress: input.business?.address,
    employerPhone: input.business?.phone,
    payeReference: input.settings?.paye_reference,
    uifReference: input.settings?.uif_reference,
    sdlReference: input.settings?.sdl_reference,
    runNumber: input.run.run_number,
    employeeName: legalName,
    taxNumber: input.employee?.tax_number,
    jobTitle: input.employee?.job_title,
    periodLabel: `${periodStart} – ${periodEnd}`,
    payDateLabel: formatCalendarDate(input.run.pay_date),
    frequencyLabel: FREQUENCY_LABELS[input.run.pay_frequency] ?? input.run.pay_frequency,
    earnings: grouped.earnings,
    deductions: grouped.deductions,
    employerContributions: grouped.employerContributions,
    gross: parseMoney(input.line.gross),
    deductionTotal: sumRows(grouped.deductions),
    employerTotal: sumRows(grouped.employerContributions),
    net: parseMoney(input.line.net),
    ytdGross: parseMoney(input.line.ytd_gross),
    ytdTaxable: parseMoney(input.line.ytd_taxable),
    ytdPaye: parseMoney(input.line.ytd_paye),
    ytdUifEmployee: parseMoney(input.line.ytd_uif_employee),
  };
}

const TEXT: [number, number, number] = [15, 23, 42];
const MUTED: [number, number, number] = [71, 85, 105];
const ACCENT: [number, number, number] = [79, 70, 229];
const RULE: [number, number, number] = [203, 213, 225];

function money(value: number): string {
  return formatCurrency(value);
}

export async function generatePayslipPdf(model: PayslipModel, business?: Business | null): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  const { margin, rightEdge, middleX, pageHeight } = PDF;
  let y = margin;
  let rightY = margin;

  const showLogo = business?.show_logo_on_documents && business?.logo_url;
  const logo = showLogo ? await fetchLogoAsBase64(business!.logo_url!) : null;
  if (logo) {
    const dims = addLogo(doc, logo, margin, y - 2, 28, 14);
    y = Math.max(y, y - 2 + dims.h + 3);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...TEXT);
  doc.text(model.employerName, margin, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  if (model.employerAddress) {
    const lines = doc.splitTextToSize(model.employerAddress, 90);
    doc.text(lines, margin, y);
    y += lines.length * 4;
  }
  if (model.employerPhone) {
    doc.text(`Tel: ${model.employerPhone}`, margin, y);
    y += 4;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...ACCENT);
  doc.text('Payslip', rightEdge, rightY, { align: 'right' });
  rightY += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(model.runNumber, rightEdge, rightY, { align: 'right' });
  rightY += 4;
  const refs = [
    model.payeReference ? `PAYE ${model.payeReference}` : null,
    model.uifReference ? `UIF ${model.uifReference}` : null,
    model.sdlReference ? `SDL ${model.sdlReference}` : null,
  ].filter((value): value is string => Boolean(value));
  for (const ref of refs) {
    doc.text(ref, rightEdge, rightY, { align: 'right' });
    rightY += 4;
  }
  y = Math.max(y, rightY) + 3;
  drawHLine(doc, y, RULE, true);
  y += 8;

  const meta: Array<[string, string]> = [
    ['Employee', model.employeeName],
    ['Tax number', model.taxNumber?.trim() || '—'],
    ['Job title', model.jobTitle?.trim() || '—'],
    ['Period', model.periodLabel],
    ['Pay date', model.payDateLabel],
    ['Frequency', model.frequencyLabel],
  ];
  const colW = PDF.contentWidth / 3;
  meta.forEach((entry, index) => {
    const col = index % 3;
    const row = Math.floor(index / 3);
    const x = margin + col * colW;
    const rowY = y + row * 10;
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.setFont('helvetica', 'normal');
    doc.text(entry[0].toUpperCase(), x, rowY);
    doc.setFontSize(9);
    doc.setTextColor(...TEXT);
    doc.setFont('helvetica', 'bold');
    doc.text(entry[1], x, rowY + 4);
  });
  y += 24;
  drawHLine(doc, y, RULE);
  y += 8;

  const ensureSpace = (needed: number) => {
    if (y + needed < pageHeight - 18) return;
    doc.addPage();
    y = margin;
  };

  const drawColumn = (title: string, rows: PayslipRow[], x: number, width: number, startY: number, total: number) => {
    let cursor = startY;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...TEXT);
    doc.text(title, x, cursor);
    cursor += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    for (const row of rows) {
      doc.setTextColor(...TEXT);
      doc.text(row.name, x, cursor);
      doc.text(money(row.amount), x + width, cursor, { align: 'right' });
      cursor += 5;
    }
    if (rows.length === 0) {
      doc.setTextColor(...MUTED);
      doc.text('None', x, cursor);
      cursor += 5;
    }
    cursor += 1;
    doc.setDrawColor(...RULE);
    doc.line(x, cursor, x + width, cursor);
    cursor += 5;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...TEXT);
    doc.text(`Total ${title.toLowerCase()}`, x, cursor);
    doc.text(money(total), x + width, cursor, { align: 'right' });
    return cursor + 4;
  };

  const colWidth = (PDF.contentWidth - 8) / 2;
  const leftEnd = drawColumn('Earnings', model.earnings, margin, colWidth, y, model.gross);
  const rightEnd = drawColumn('Deductions', model.deductions, middleX + 4, colWidth, y, model.deductionTotal);
  y = Math.max(leftEnd, rightEnd) + 4;

  ensureSpace(16);
  doc.setFillColor(238, 242, 255);
  doc.rect(margin, y - 5, PDF.contentWidth, 10, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...ACCENT);
  doc.text('Net pay', margin + 2, y + 2);
  doc.text(money(model.net), rightEdge - 2, y + 2, { align: 'right' });
  y += 14;

  ensureSpace(20 + model.employerContributions.length * 5);
  y = drawColumn(
    'Employer contributions',
    model.employerContributions,
    margin,
    PDF.contentWidth,
    y,
    model.employerTotal,
  );
  y += 4;

  ensureSpace(22);
  drawHLine(doc, y, RULE);
  y += 7;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...TEXT);
  doc.text('Year to date (this tax year, including this period)', margin, y);
  y += 6;
  const ytd: Array<[string, number]> = [
    ['Gross', model.ytdGross],
    ['Taxable', model.ytdTaxable],
    ['PAYE', model.ytdPaye],
    ['UIF (employee)', model.ytdUifEmployee],
  ];
  ytd.forEach((entry, index) => {
    const x = margin + index * (PDF.contentWidth / 4);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...MUTED);
    doc.text(entry[0].toUpperCase(), x, y);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...TEXT);
    doc.text(money(entry[1]), x, y + 4);
  });
  y += 14;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(
    'Figures are operational for this pay run. An accountant still files with SARS.',
    margin,
    Math.min(y, pageHeight - 12),
  );

  doc.save(model.filename);
}
