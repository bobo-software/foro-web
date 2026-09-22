import type { EmployeePayFrequency } from './employee';

export type PayRunStatus = 'draft' | 'calculated' | 'approved' | 'paid' | 'cancelled';

export const PAY_RUN_STATUS_OPTIONS: { value: PayRunStatus | ''; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'calculated', label: 'Calculated' },
  { value: 'approved', label: 'Approved' },
  { value: 'paid', label: 'Paid' },
  { value: 'cancelled', label: 'Cancelled' },
];

export const PAY_RUN_STATUS_LABELS: Record<PayRunStatus, string> = {
  draft: 'Draft',
  calculated: 'Calculated',
  approved: 'Approved',
  paid: 'Paid',
  cancelled: 'Cancelled',
};

export interface PayRunLineItem {
  id: number;
  pay_run_line_id: number;
  component_type_id: number;
  code: string;
  name: string;
  direction: string;
  amount: string;
  taxable: boolean;
  uifable: boolean;
  sdl_liable: boolean;
  reduces_taxable: boolean;
  irp5_source_code?: string | null;
  is_once_off: boolean;
  sort_order: number;
}

export interface PayRunLine {
  id: number;
  pay_run_id: number;
  employee_id: number;
  first_name: string;
  last_name: string;
  known_as?: string | null;
  gross: string;
  taxable: string;
  paye: string;
  uif_employee: string;
  uif_employer: string;
  sdl: string;
  net: string;
  ytd_gross: string;
  ytd_taxable: string;
  ytd_paye: string;
  ytd_uif_employee: string;
  periods_elapsed: number;
  periods_in_year: number;
  items: PayRunLineItem[];
}

export interface PayRun {
  id: number;
  business_id: number;
  run_number: string;
  period_start: string;
  period_end: string;
  pay_date: string;
  pay_frequency: EmployeePayFrequency;
  status: PayRunStatus;
  tax_year_id?: number | null;
  total_gross: string;
  total_paye: string;
  total_uif_employee: string;
  total_uif_employer: string;
  total_sdl: string;
  total_net: string;
  notes?: string | null;
  calculated_at?: string | null;
  approved_at?: string | null;
  paid_at?: string | null;
  cancelled_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface PayRunDetail extends PayRun {
  lines: PayRunLine[];
}

export interface CreatePayRunDto {
  business_id: number;
  period_start: string;
  period_end: string;
  pay_date: string;
  pay_frequency: EmployeePayFrequency;
  notes?: string;
}

export function payRunEmployeeName(line: Pick<PayRunLine, 'first_name' | 'last_name' | 'known_as'>): string {
  const known = line.known_as?.trim();
  if (known) return known;
  return `${line.first_name} ${line.last_name}`.trim();
}
