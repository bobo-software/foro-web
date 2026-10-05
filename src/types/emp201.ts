export type Emp201Status = 'draft' | 'submitted';

export const EMP201_STATUS_OPTIONS: { value: Emp201Status | ''; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
];

export const EMP201_STATUS_LABELS: Record<Emp201Status, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
};

export const EMP201_MONTH_OPTIONS: { value: string; label: string }[] = [
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

export function emp201YearOptions(from = new Date()): { value: string; label: string }[] {
  const year = from.getFullYear();
  return [year - 2, year - 1, year, year + 1].map((value) => ({
    value: String(value),
    label: String(value),
  }));
}

export interface Emp201IncludedRun {
  id: number;
  run_number: string;
  pay_date: string;
  pay_frequency: string;
  total_paye: string;
  total_uif_employee: string;
  total_uif_employer: string;
  total_sdl: string;
}

export interface Emp201Return {
  id: number;
  business_id: number;
  period_year: number;
  period_month: number;
  status: Emp201Status;
  total_paye: string;
  total_uif_employee: string;
  total_uif_employer: string;
  total_sdl: string;
  total_due: string;
  run_count: number;
  employee_count: number;
  due_date: string;
  notes?: string | null;
  submitted_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface Emp201Detail extends Emp201Return {
  pay_runs: Emp201IncludedRun[];
}

export interface CreateEmp201Dto {
  business_id: number;
  period_year: number;
  period_month: number;
  notes?: string;
}
