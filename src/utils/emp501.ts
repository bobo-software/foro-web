import { parseMoney } from './payrollPackage';
import { formatCurrency } from './currency';
import { formatCalendarDate } from './recurrence';
import { emp201PeriodLabel } from './emp201';
import type { Business } from '../types/business';
import type { PayrollEmployerSettings } from '../types/employee';
import type { Emp501Bucket, Emp501Detail, Emp501PeriodType } from '../types/emp501';
import { EMP501_PERIOD_LABELS } from '../types/emp501';
import { fetchLogoAsBase64 } from './pdfLogoHelper';
import { PDF, addLogo, drawHLine } from './pdfTemplates/types';

export function emp501PeriodLabel(taxYearCode: string, periodType: Emp501PeriodType): string {
  return `${EMP501_PERIOD_LABELS[periodType]} ${taxYearCode}`;
}

export function emp501DueDate(startsOn: string, endsOn: string, periodType: Emp501PeriodType): string {
  if (periodType === 'interim') return `${startsOn.slice(0, 4)}-10-31`;
  return `${endsOn.slice(0, 4)}-05-31`;
}

export function emp501Filename(
  taxYearCode: string,
  periodType: Emp501PeriodType,
  ext: 'pdf' | 'csv',
): string {
  const slug = taxYearCode.trim().replace(/[^\w]+/g, '-').replace(/^-+|-+$/g, '') || 'tax-year';
  return `emp501-${slug}-${periodType}.${ext}`;
}

function csvCell(value: string | number): string {
  const text = String(value);
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function money(value: string | number): string {
  return parseMoney(value).toFixed(2);
}

export function buildEmp501Csv(
  detail: Emp501Detail,
  settings?: PayrollEmployerSettings | null,
  business?: Business | null,
): string {
  const period = emp501PeriodLabel(detail.tax_year_code, detail.period_type);
  const rows: string[][] = [
    ['EMP501 reconciliation'],
    ['Employer', business?.name?.trim() || 'Employer'],
    ['Period', period],
    ['Dates', `${detail.starts_on} – ${detail.ends_on}`],
    ['Due date', formatCalendarDate(detail.due_date)],
    ['Status', detail.status],
    ['PAYE reference', settings?.paye_reference?.trim() || ''],
    ['UIF reference', settings?.uif_reference?.trim() || ''],
    ['SDL reference', settings?.sdl_reference?.trim() || ''],
    [],
    ['Source', 'PAYE', 'UIF employee', 'UIF employer', 'SDL', 'Total'],
    [
      'Payroll (paid runs)',
      money(detail.payroll_paye),
      money(detail.payroll_uif_employee),
      money(detail.payroll_uif_employer),
      money(detail.payroll_sdl),
      money(detail.payroll_due),
    ],
    [
      'EMP201 submitted',
      money(detail.emp201_paye),
      money(detail.emp201_uif_employee),
      money(detail.emp201_uif_employer),
      money(detail.emp201_sdl),
      money(detail.emp201_due),
    ],
    [
      'Variance payroll − EMP201',
      money(detail.variance_payroll_vs_emp201.paye),
      money(detail.variance_payroll_vs_emp201.uif_employee),
      money(detail.variance_payroll_vs_emp201.uif_employer),
      money(detail.variance_payroll_vs_emp201.sdl),
      money(detail.variance_payroll_vs_emp201.due),
    ],
  ];
  if (detail.period_type === 'annual') {
    rows.push([
      'IRP5 / IT3(a)',
      money(detail.certificate_paye),
      money(detail.certificate_uif_employee),
      '',
      '',
      '',
    ]);
    rows.push([
      'Variance payroll − certificates (PAYE / UIF ee)',
      money(detail.variance_payroll_vs_certificates.paye),
      money(detail.variance_payroll_vs_certificates.uif_employee),
      '',
      '',
      '',
    ]);
  }
  rows.push([]);
  rows.push(['EMP201 months']);
  rows.push(['Period', 'Status', 'PAYE', 'UIF employee', 'UIF employer', 'SDL', 'Total']);
  for (const item of detail.emp201s) {
    rows.push([
      emp201PeriodLabel(item.period_year, item.period_month),
      item.status,
      money(item.total_paye),
      money(item.total_uif_employee),
      money(item.total_uif_employer),
      money(item.total_sdl),
      money(item.total_due),
    ]);
  }
  rows.push([]);
  rows.push(['Figures are operational. An accountant still files with SARS. This is not an e@syFile export.']);
  return rows.map((row) => row.map(csvCell).join(',')).join('\n');
}

export function downloadEmp501Csv(csv: string, filename: string): void {
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

function drawAmount(
  doc: { text: (text: string, x: number, y: number, opts?: { align?: string }) => void },
  value: string | number,
  x: number,
  y: number,
) {
  doc.text(formatCurrency(parseMoney(value)), x, y, { align: 'right' });
}

export async function generateEmp501Pdf(
  detail: Emp501Detail,
  settings?: PayrollEmployerSettings | null,
  business?: Business | null,
): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  const { margin, rightEdge, pageHeight } = PDF;
  let y = margin;
  let rightY = margin;
  const period = emp501PeriodLabel(detail.tax_year_code, detail.period_type);
  const due = formatCalendarDate(detail.due_date);

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
  doc.text('EMP501', rightEdge, rightY, { align: 'right' });
  rightY += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(period, rightEdge, rightY, { align: 'right' });
  rightY += 4;
  doc.text(`${formatCalendarDate(detail.starts_on)} – ${formatCalendarDate(detail.ends_on)}`, rightEdge, rightY, {
    align: 'right',
  });
  rightY += 4;
  doc.text(`Due ${due}`, rightEdge, rightY, { align: 'right' });
  y = Math.max(y, rightY) + 3;
  drawHLine(doc, y, RULE, true);
  y += 8;

  const colPaye = margin + 70;
  const colUifEe = margin + 100;
  const colUifEr = margin + 128;
  const colSdl = rightEdge;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...TEXT);
  doc.text('Reconciliation', margin, y);
  y += 6;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...MUTED);
  doc.text('Source', margin, y);
  doc.text('PAYE', colPaye, y, { align: 'right' });
  doc.text('UIF ee', colUifEe, y, { align: 'right' });
  doc.text('UIF er', colUifEr, y, { align: 'right' });
  doc.text('SDL', colSdl, y, { align: 'right' });
  y += 5;
  doc.setTextColor(...TEXT);

  const lines: Array<[string, string | number, string | number, string | number, string | number]> = [
    ['Payroll', detail.payroll_paye, detail.payroll_uif_employee, detail.payroll_uif_employer, detail.payroll_sdl],
    ['EMP201 submitted', detail.emp201_paye, detail.emp201_uif_employee, detail.emp201_uif_employer, detail.emp201_sdl],
    [
      'Variance',
      detail.variance_payroll_vs_emp201.paye,
      detail.variance_payroll_vs_emp201.uif_employee,
      detail.variance_payroll_vs_emp201.uif_employer,
      detail.variance_payroll_vs_emp201.sdl,
    ],
  ];
  if (detail.period_type === 'annual') {
    lines.push(['IRP5 / IT3(a)', detail.certificate_paye, detail.certificate_uif_employee, '', '']);
  }
  for (const line of lines) {
    doc.text(line[0], margin, y);
    drawAmount(doc, line[1], colPaye, y);
    drawAmount(doc, line[2], colUifEe, y);
    if (line[3] !== '') drawAmount(doc, line[3], colUifEr, y);
    if (line[4] !== '') drawAmount(doc, line[4], colSdl, y);
    y += 5;
  }
  y += 4;
  doc.setFillColor(238, 242, 255);
  doc.rect(margin, y - 5, PDF.contentWidth, 10, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...ACCENT);
  doc.text('Payroll total due', margin + 2, y + 2);
  doc.text(formatCurrency(parseMoney(detail.payroll_due)), rightEdge - 2, y + 2, { align: 'right' });
  y += 14;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(
    `${detail.employee_count} employee${detail.employee_count === 1 ? '' : 's'} · ${detail.run_count} paid run${detail.run_count === 1 ? '' : 's'} · ${detail.emp201_submitted_count}/${detail.emp201_count} EMP201 submitted`,
    margin,
    y,
  );
  y += 8;
  drawHLine(doc, y, RULE);
  y += 7;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...TEXT);
  doc.text('EMP201 months', margin, y);
  y += 6;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...MUTED);
  doc.text('Period', margin, y);
  doc.text('Status', margin + 42, y);
  doc.text('Total due', rightEdge, y, { align: 'right' });
  y += 5;
  doc.setTextColor(...TEXT);
  if (detail.emp201s.length === 0) {
    doc.setTextColor(...MUTED);
    doc.text('No EMP201 returns in this period.', margin, y);
    y += 5;
  }
  for (const item of detail.emp201s) {
    if (y > pageHeight - 20) {
      doc.addPage();
      y = margin;
    }
    doc.text(emp201PeriodLabel(item.period_year, item.period_month), margin, y);
    doc.text(item.status, margin + 42, y);
    drawAmount(doc, item.total_due, rightEdge, y);
    y += 5;
  }
  y += 8;
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(
    'Figures are operational. An accountant still files with SARS. This is not an e@syFile export.',
    margin,
    Math.min(y, pageHeight - 12),
  );

  doc.save(emp501Filename(detail.tax_year_code, detail.period_type, 'pdf'));
}
