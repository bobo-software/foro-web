import { parseMoney } from './payrollPackage';
import { formatCurrency } from './currency';
import { formatCalendarDate } from './recurrence';
import type { Business } from '../types/business';
import type { PayrollEmployerSettings } from '../types/employee';
import type { Emp201Detail } from '../types/emp201';
import { fetchLogoAsBase64 } from './pdfLogoHelper';
import { PDF, addLogo, drawHLine } from './pdfTemplates/types';

export function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

export function emp201PeriodLabel(year: number, month: number): string {
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function emp201Filename(year: number, month: number, ext: 'pdf' | 'csv'): string {
  return `emp201-${year}-${pad2(month)}.${ext}`;
}

export function emp201DueDate(year: number, month: number): string {
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  return `${nextYear}-${pad2(nextMonth)}-07`;
}

function csvCell(value: string | number): string {
  const text = String(value);
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function buildEmp201Csv(
  detail: Emp201Detail,
  settings?: PayrollEmployerSettings | null,
  business?: Business | null,
): string {
  const period = emp201PeriodLabel(detail.period_year, detail.period_month);
  const rows: string[][] = [
    ['EMP201 monthly return'],
    ['Employer', business?.name?.trim() || 'Employer'],
    ['Period', period],
    ['Due date', formatCalendarDate(detail.due_date || emp201DueDate(detail.period_year, detail.period_month))],
    ['Status', detail.status],
    ['PAYE reference', settings?.paye_reference?.trim() || ''],
    ['UIF reference', settings?.uif_reference?.trim() || ''],
    ['SDL reference', settings?.sdl_reference?.trim() || ''],
    ['Employees on included runs', String(detail.employee_count)],
    [],
    ['Liability', 'Amount'],
    ['PAYE', parseMoney(detail.total_paye).toFixed(2)],
    ['UIF (employee)', parseMoney(detail.total_uif_employee).toFixed(2)],
    ['UIF (employer)', parseMoney(detail.total_uif_employer).toFixed(2)],
    ['SDL', parseMoney(detail.total_sdl).toFixed(2)],
    ['Total due', parseMoney(detail.total_due).toFixed(2)],
    [],
    ['Included pay runs'],
    ['Run', 'Pay date', 'PAYE', 'UIF employee', 'UIF employer', 'SDL'],
  ];
  for (const run of detail.pay_runs) {
    rows.push([
      run.run_number,
      run.pay_date,
      parseMoney(run.total_paye).toFixed(2),
      parseMoney(run.total_uif_employee).toFixed(2),
      parseMoney(run.total_uif_employer).toFixed(2),
      parseMoney(run.total_sdl).toFixed(2),
    ]);
  }
  rows.push([]);
  rows.push(['Figures are operational. An accountant still files with SARS.']);
  return rows.map((row) => row.map(csvCell).join(',')).join('\n');
}

export function downloadEmp201Csv(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

const TEXT: [number, number, number] = [15, 23, 42];
const MUTED: [number, number, number] = [71, 85, 105];
const ACCENT: [number, number, number] = [79, 70, 229];
const RULE: [number, number, number] = [203, 213, 225];

export async function generateEmp201Pdf(
  detail: Emp201Detail,
  settings?: PayrollEmployerSettings | null,
  business?: Business | null,
): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  const { margin, rightEdge, pageHeight } = PDF;
  let y = margin;
  let rightY = margin;
  const period = emp201PeriodLabel(detail.period_year, detail.period_month);
  const due = formatCalendarDate(detail.due_date || emp201DueDate(detail.period_year, detail.period_month));

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
  doc.text('EMP201', rightEdge, rightY, { align: 'right' });
  rightY += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(period, rightEdge, rightY, { align: 'right' });
  rightY += 4;
  doc.text(`Due ${due}`, rightEdge, rightY, { align: 'right' });
  rightY += 4;
  const refs = [
    settings?.paye_reference ? `PAYE ${settings.paye_reference}` : null,
    settings?.uif_reference ? `UIF ${settings.uif_reference}` : null,
    settings?.sdl_reference ? `SDL ${settings.sdl_reference}` : null,
  ].filter((value): value is string => Boolean(value));
  for (const ref of refs) {
    doc.text(ref, rightEdge, rightY, { align: 'right' });
    rightY += 4;
  }
  y = Math.max(y, rightY) + 3;
  drawHLine(doc, y, RULE, true);
  y += 8;

  const liabilities: Array<[string, string]> = [
    ['PAYE', formatCurrency(parseMoney(detail.total_paye))],
    ['UIF (employee)', formatCurrency(parseMoney(detail.total_uif_employee))],
    ['UIF (employer)', formatCurrency(parseMoney(detail.total_uif_employer))],
    ['SDL', formatCurrency(parseMoney(detail.total_sdl))],
  ];
  liabilities.forEach((entry, index) => {
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
  y += 24;

  doc.setFillColor(238, 242, 255);
  doc.rect(margin, y - 5, PDF.contentWidth, 10, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...ACCENT);
  doc.text('Total due to SARS', margin + 2, y + 2);
  doc.text(formatCurrency(parseMoney(detail.total_due)), rightEdge - 2, y + 2, { align: 'right' });
  y += 14;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...MUTED);
  doc.text(
    `${detail.employee_count} employee${detail.employee_count === 1 ? '' : 's'} across ${detail.run_count} paid pay run${detail.run_count === 1 ? '' : 's'}`,
    margin,
    y,
  );
  y += 8;
  drawHLine(doc, y, RULE);
  y += 7;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...TEXT);
  doc.text('Included pay runs', margin, y);
  y += 6;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...MUTED);
  doc.text('Run', margin, y);
  doc.text('Pay date', margin + 32, y);
  doc.text('PAYE', margin + 70, y);
  doc.text('UIF ee', margin + 100, y);
  doc.text('UIF er', margin + 128, y);
  doc.text('SDL', rightEdge, y, { align: 'right' });
  y += 5;
  doc.setTextColor(...TEXT);
  if (detail.pay_runs.length === 0) {
    doc.setTextColor(...MUTED);
    doc.text('No paid pay runs in this calendar month.', margin, y);
    y += 5;
  }
  for (const run of detail.pay_runs) {
    if (y > pageHeight - 20) {
      doc.addPage();
      y = margin;
    }
    doc.text(run.run_number, margin, y);
    doc.text(formatCalendarDate(run.pay_date), margin + 32, y);
    doc.text(formatCurrency(parseMoney(run.total_paye)), margin + 70, y);
    doc.text(formatCurrency(parseMoney(run.total_uif_employee)), margin + 100, y);
    doc.text(formatCurrency(parseMoney(run.total_uif_employer)), margin + 128, y);
    doc.text(formatCurrency(parseMoney(run.total_sdl)), rightEdge, y, { align: 'right' });
    y += 5;
  }
  y += 8;
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(
    'Figures are operational for this month. An accountant still files with SARS. This is not an eFiling upload.',
    margin,
    Math.min(y, pageHeight - 12),
  );

  doc.save(emp201Filename(detail.period_year, detail.period_month, 'pdf'));
}
