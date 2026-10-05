export type Emp501Status = 'draft' | 'submitted';
export type Emp501PeriodType = 'interim' | 'annual';

export const EMP501_STATUS_OPTIONS: { value: Emp501Status | ''; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
];

export const EMP501_STATUS_LABELS: Record<Emp501Status, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
};

export const EMP501_PERIOD_OPTIONS: { value: Emp501PeriodType; label: string }[] = [
  { value: 'interim', label: 'Interim (Mar–Aug)' },
  { value: 'annual', label: 'Annual (full tax year)' },
];

export const EMP501_PERIOD_LABELS: Record<Emp501PeriodType, string> = {
  interim: 'Interim',
  annual: 'Annual',
};

export interface Emp501Bucket {
  paye: number;
  uif_employee: number;
  uif_employer: number;
  sdl: number;
  due: number;
}

export interface Emp501IncludedReturn {
  id: number;
  period_year: number;
  period_month: number;
  status: string;
  total_paye: string;
  total_uif_employee: string;
  total_uif_employer: string;
  total_sdl: string;
  total_due: string;
}

export interface Emp501Return {
  id: number;
  business_id: number;
  tax_year_id: number;
  tax_year_code: string;
  period_type: Emp501PeriodType;
  starts_on: string;
  ends_on: string;
  status: Emp501Status;
  payroll_paye: string;
  payroll_uif_employee: string;
  payroll_uif_employer: string;
  payroll_sdl: string;
  payroll_due: string;
  emp201_paye: string;
  emp201_uif_employee: string;
  emp201_uif_employer: string;
  emp201_sdl: string;
  emp201_due: string;
  certificate_paye: string;
  certificate_uif_employee: string;
  certificate_count: number;
  year_end_batch_id?: number | null;
  run_count: number;
  employee_count: number;
  emp201_count: number;
  emp201_submitted_count: number;
  due_date: string;
  notes?: string | null;
  submitted_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface Emp501Detail extends Emp501Return {
  variance_payroll_vs_emp201: Emp501Bucket;
  variance_payroll_vs_certificates: Emp501Bucket;
  emp201s: Emp501IncludedReturn[];
}

export interface CreateEmp501Dto {
  business_id: number;
  tax_year_id: number;
  period_type: Emp501PeriodType;
  notes?: string;
}

export interface PayrollDashboardUnpaidRun {
  id: number;
  run_number: string;
  status: string;
  pay_date: string;
  period_end: string;
  total_net: string;
}

export interface PayrollDashboardEmp201 {
  period_year: number;
  period_month: number;
  due_date: string;
  overdue: boolean;
  status: 'missing' | 'draft' | 'submitted';
  id: number | null;
}

export interface PayrollDashboardEmp501 {
  tax_year_id: number;
  tax_year_code: string;
  period_type: Emp501PeriodType;
  due_date: string;
  overdue: boolean;
  status: 'missing' | 'draft' | 'submitted';
  id: number | null;
}

export interface PayrollDashboard {
  business_id: number;
  next_pay_date: string | null;
  default_pay_day: number | null;
  unpaid_run_count: number;
  unpaid_runs: PayrollDashboardUnpaidRun[];
  emp201_due: PayrollDashboardEmp201;
  emp501_due: PayrollDashboardEmp501 | null;
}
