export type BusinessTaxEntityType = 'company' | 'sbc' | 'sole_prop';

export const BUSINESS_TAX_ENTITY_LABELS: Record<BusinessTaxEntityType, string> = {
  company: '(Pty) Ltd company — 27%',
  sbc: 'Small business corporation (SBC)',
  sole_prop: 'Sole proprietor',
};

export const MONTH_LABELS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

export interface BusinessTaxProfile {
  id: number;
  business_id: number;
  entity_type: BusinessTaxEntityType;
  tax_reference: string | null;
  financial_year_end_month: number;
  vat_registered: boolean;
  owner_date_of_birth: string | null;
  basic_amount: string | null;
  notes?: string;
}

export interface SaveBusinessTaxProfileDto {
  entity_type: BusinessTaxEntityType;
  tax_reference: string | null;
  financial_year_end_month: number;
  vat_registered: boolean;
  owner_date_of_birth: string | null;
  basic_amount: string | null;
  notes?: string;
}

export interface TaxFigures {
  gross_income: number;
  credit_notes: number;
  bill_costs: number;
  expense_costs: number;
  non_deductible: number;
  payroll_costs: number;
  adjustments_total: number;
  taxable_income: number;
}

export interface IncomeTaxResult {
  taxable_income: number;
  gross_tax: number;
  rebates: number;
  tax_liability: number;
  rate_table_code: string;
  rates_exact: boolean;
}

export interface TaxEstimatePart {
  figures: TaxFigures;
  tax: IncomeTaxResult;
}

export type TaxReturnStatus = 'draft' | 'submitted';

export type TaxReturnKind = 'annual' | 'irp6_p1' | 'irp6_p2' | 'irp6_p3';

export const TAX_RETURN_KIND_LABELS: Record<TaxReturnKind, string> = {
  annual: 'Annual income tax',
  irp6_p1: 'IRP6 — 1st provisional payment',
  irp6_p2: 'IRP6 — 2nd provisional payment',
  irp6_p3: 'IRP6 — 3rd (top-up) payment',
};

export const TAX_RETURN_KIND_ORDER: TaxReturnKind[] = ['irp6_p1', 'irp6_p2', 'irp6_p3', 'annual'];

export interface ProvisionalPlanRow {
  kind: Exclude<TaxReturnKind, 'annual'>;
  label: string;
  due_date: string;
  /** The 2nd period deducts the submitted 1st payment when there is one. */
  suggested_payment: number | null;
  /** The saved IRP6 return for this period, if any. */
  return_id: number | null;
  return_status: TaxReturnStatus | null;
}

export interface TaxReturnAdjustment {
  id: number;
  label: string;
  direction: 'add' | 'deduct';
  amount: number;
}

/** Saved annual return; money is a snapshot that only changes while the return is a draft. */
export interface TaxReturn {
  id: number;
  business_id: number;
  kind: TaxReturnKind;
  tax_year_code: string;
  period_start: string;
  period_end: string;
  entity_type: BusinessTaxEntityType;
  status: TaxReturnStatus;
  figures: TaxFigures;
  /** IRP6 only: owner's estimate of taxable income; null uses the projection in `figures`. */
  estimate_override: number | null;
  gross_tax: number;
  rebates: number;
  /** Annual: tax for the year. IRP6: tax this period covers (half the year for the 1st period). */
  tax_liability: number;
  rate_table_code: string | null;
  /** IRP6 only. */
  due_date: string | null;
  other_credits: number;
  prior_payments: number;
  amount_due: number;
  warnings: string[];
  notes: string | null;
  submitted_at: string | null;
  updated_at: string | null;
  adjustments: TaxReturnAdjustment[];
}

export interface SaveTaxReturnAdjustmentDto {
  label: string;
  direction: 'add' | 'deduct';
  amount: string;
}

/** Common year-end adjustments; picking one pre-fills the label and direction. */
export const TAX_ADJUSTMENT_PRESETS: { label: string; direction: 'add' | 'deduct'; hint?: string }[] = [
  {
    label: 'Wear-and-tear allowance (s11(e))',
    direction: 'deduct',
    hint: 'Your accountant works this out from the asset register; Foro has no fixed assets yet.',
  },
  {
    label: 'Section 18A donations',
    direction: 'deduct',
    hint: 'Deductible up to 10% of taxable income, and only with an 18A receipt.',
  },
  {
    label: 'Assessed loss brought forward',
    direction: 'deduct',
    hint: 'Companies can set off the greater of R1 million or 80% of taxable income; check with your accountant.',
  },
  { label: 'Private use add-back', direction: 'add' },
  { label: 'Fines and penalties add-back', direction: 'add', hint: 'Fines and SARS penalties are never deductible.' },
  { label: 'Other deduction', direction: 'deduct' },
  { label: 'Other add-back', direction: 'add' },
];

export interface UpdateTaxReturnDto {
  other_credits: string;
  notes: string;
  /** IRP6 only; empty string clears the estimate. */
  estimate_override?: string;
}

export interface TaxMonthFigures {
  gross_income: number;
  credit_notes: number;
  bill_costs: number;
  expense_costs: number;
  non_deductible: number;
  payroll_costs: number;
  /** Income less deductions, before manual adjustments. */
  net: number;
}

/** Source totals by month, read live from documents rather than the return snapshot. */
export interface TaxReturnMonthlyTotals {
  return_id: number;
  vat_registered: boolean;
  period_start: string;
  data_through: string;
  months: (TaxMonthFigures & { month: string })[];
  totals: TaxMonthFigures;
}

export interface BusinessTaxEstimate {
  business_id: number;
  profile_missing: boolean;
  entity_type: BusinessTaxEntityType;
  vat_registered: boolean;
  year_of_assessment: { code: string; starts_on: string; ends_on: string };
  days_elapsed: number;
  days_in_year: number;
  actual: TaxEstimatePart;
  projected: TaxEstimatePart | null;
  warnings: string[];
  provisional: ProvisionalPlanRow[];
}
