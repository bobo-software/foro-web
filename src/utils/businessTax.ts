import { MONTH_LABELS, type ProvisionalPlanRow, type TaxFigures, type TaxReturn } from '@/types/businessTax';
import { formatCurrency } from '@/utils/currency';

export const BREAKDOWN_ROWS: { key: keyof TaxFigures; label: string; sign: 1 | -1 }[] = [
  { key: 'gross_income', label: 'Income (sent and paid invoices)', sign: 1 },
  { key: 'credit_notes', label: 'Less credit notes', sign: -1 },
  { key: 'bill_costs', label: 'Less supplier bills', sign: -1 },
  { key: 'expense_costs', label: 'Less expenses', sign: -1 },
  { key: 'non_deductible', label: 'Add back non-deductible expenses', sign: 1 },
  { key: 'payroll_costs', label: 'Less payroll (gross pay, employer UIF and SDL)', sign: -1 },
];

export function signedAmount(value: number, sign: 1 | -1): string {
  if (value === 0) return formatCurrency(0);
  return sign === -1 ? `(${formatCurrency(value)})` : formatCurrency(value);
}

export interface TaxSummaryRow {
  label: string;
  /** Signed: deductions and payments are negative. */
  amount: number;
  emphasis?: boolean;
  /** The final line: negative means a refund rather than a deduction. */
  isAmountDue?: boolean;
}

export function isProvisionalReturn(taxReturn: TaxReturn): boolean {
  return taxReturn.kind !== 'annual';
}

export function settledLabel(taxReturn: TaxReturn): string {
  if (isProvisionalReturn(taxReturn)) return 'Payment due';
  return taxReturn.amount_due < 0 ? 'Refund due' : 'Amount still due';
}

/** The return's calculation from income down to the amount due, in display order. */
export function taxReturnSummaryRows(taxReturn: TaxReturn): TaxSummaryRow[] {
  const provisional = isProvisionalReturn(taxReturn);
  const { figures } = taxReturn;
  const rows: TaxSummaryRow[] = BREAKDOWN_ROWS.map((row) => ({
    label: row.label,
    amount: figures[row.key] * row.sign,
  }));
  if (figures.adjustments_total !== 0) rows.push({ label: 'Adjustments', amount: figures.adjustments_total });
  rows.push({
    label: provisional ? 'Projected taxable income' : 'Taxable income',
    amount: figures.taxable_income,
    emphasis: true,
  });
  if (provisional && taxReturn.estimate_override != null) {
    rows.push({ label: 'Your estimate of taxable income (used)', amount: taxReturn.estimate_override, emphasis: true });
  }
  rows.push({ label: 'Tax before rebates', amount: taxReturn.gross_tax });
  if (taxReturn.entity_type === 'sole_prop') rows.push({ label: 'Less rebates', amount: -taxReturn.rebates });
  rows.push({
    label: 'Tax for the year',
    amount: provisional ? Math.max(0, taxReturn.gross_tax - taxReturn.rebates) : taxReturn.tax_liability,
    emphasis: true,
  });
  if (taxReturn.kind === 'irp6_p1') rows.push({ label: 'Half for the 1st period', amount: taxReturn.tax_liability });
  rows.push({
    label: provisional ? 'Less earlier provisional payments' : 'Less provisional tax already submitted',
    amount: -taxReturn.prior_payments,
  });
  rows.push({ label: 'Less other credits', amount: -taxReturn.other_credits });
  rows.push({ label: settledLabel(taxReturn), amount: taxReturn.amount_due, emphasis: true, isAmountDue: true });
  return rows;
}

/** A signed amount with negatives in brackets, e.g. `(R 275,00)`. */
export function formatSignedAmount(value: number): string {
  if (value === 0) return formatCurrency(0);
  return value < 0 ? signedAmount(-value, -1) : formatCurrency(value);
}

/** Deductions in brackets; the amount due reads as a refund when negative. */
export function formatSummaryAmount(row: TaxSummaryRow): string {
  return row.isAmountDue ? amountDueLabel(row.amount) : formatSignedAmount(row.amount);
}

/** A negative amount due is a refund from SARS. */
export function amountDueLabel(amountDue: number): string {
  return amountDue < 0 ? `${formatCurrency(-amountDue)} refund` : formatCurrency(amountDue);
}

/** `2027-02` → "Year ending February 2027". */
export function taxYearLabel(code: string): string {
  const [year, month] = code.split('-').map(Number);
  const monthLabel = MONTH_LABELS[month - 1];
  if (!year || !monthLabel) return code;
  return `Year ending ${monthLabel} ${year}`;
}

/** The given year of assessment plus the `previous` years before it, newest first. */
export function taxYearOptions(code: string, previous = 2): { value: string; label: string }[] {
  const [year, month] = code.split('-').map(Number);
  if (!year || !month) return [];
  return Array.from({ length: previous + 1 }, (_, index) => {
    const value = `${year - index}-${String(month).padStart(2, '0')}`;
    return { value, label: taxYearLabel(value) };
  });
}

/** Today as a local calendar date (`YYYY-MM-DD`). */
export function localIsoDate(date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** The earliest provisional payment due today or later and not yet submitted, or null when none is left this year. */
export function nextProvisionalPayment(plan: ProvisionalPlanRow[], today: string): ProvisionalPlanRow | null {
  return (
    [...plan]
      .filter((row) => row.due_date >= today && row.return_status !== 'submitted')
      .sort((a, b) => a.due_date.localeCompare(b.due_date))[0] ?? null
  );
}

/** Tax as a percentage of taxable income; 0 when there is no profit. */
export function effectiveRatePercent(taxLiability: number, taxableIncome: number): number {
  if (taxableIncome <= 0) return 0;
  return Math.round((taxLiability / taxableIncome) * 1000) / 10;
}
