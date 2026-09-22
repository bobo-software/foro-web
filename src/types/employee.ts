export type EmployeeEmploymentType = 'permanent' | 'fixed_term' | 'contractor';
export type EmployeePayFrequency = 'weekly' | 'fortnightly' | 'monthly';
export type EmployeeStatus = 'active' | 'terminated';

export const EMPLOYEE_EMPLOYMENT_TYPE_OPTIONS: { value: EmployeeEmploymentType; label: string }[] = [
  { value: 'permanent', label: 'Permanent' },
  { value: 'fixed_term', label: 'Fixed term' },
  { value: 'contractor', label: 'Contractor' },
];

export const EMPLOYEE_PAY_FREQUENCY_OPTIONS: { value: EmployeePayFrequency; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'fortnightly', label: 'Fortnightly' },
  { value: 'monthly', label: 'Monthly' },
];

export const EMPLOYEE_STATUS_OPTIONS: { value: EmployeeStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'terminated', label: 'Terminated' },
];

export interface Employee {
  id?: number;
  business_id: number;
  first_name: string;
  last_name: string;
  known_as?: string | null;
  id_number?: string | null;
  passport_number?: string | null;
  nationality?: string | null;
  date_of_birth?: string | null;
  tax_number?: string | null;
  email?: string;
  phone?: string;
  address?: string;
  job_title?: string | null;
  employment_type: EmployeeEmploymentType;
  start_date: string;
  end_date?: string | null;
  pay_frequency: EmployeePayFrequency;
  status: EmployeeStatus;
  uif_eligible: boolean;
  paye_registered: boolean;
  medical_aid_members: number;
  user_id?: number | null;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export type CreateEmployeeDto = Omit<Employee, 'id' | 'created_at' | 'updated_at'>;

export function employeeDisplayName(employee: Pick<Employee, 'first_name' | 'last_name' | 'known_as'>): string {
  const known = employee.known_as?.trim();
  if (known) return known;
  return `${employee.first_name} ${employee.last_name}`.trim();
}

export interface PayrollEmployerSettings {
  id?: number;
  business_id: number;
  paye_reference?: string | null;
  uif_reference?: string | null;
  sdl_reference?: string | null;
  sdl_liable: boolean;
  default_pay_day?: number | null;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export type CreatePayrollEmployerSettingsDto = Omit<
  PayrollEmployerSettings,
  'id' | 'created_at' | 'updated_at'
>;
