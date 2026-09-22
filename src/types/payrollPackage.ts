export type PayrollComponentDirection = 'earning' | 'deduction' | 'employer';
export type PayrollCalculationMethod = 'amount' | 'percent_of_basic';

export const PAYROLL_COMPONENT_DIRECTION_OPTIONS: { value: PayrollComponentDirection; label: string }[] = [
  { value: 'earning', label: 'Earning' },
  { value: 'deduction', label: 'Deduction' },
  { value: 'employer', label: 'Employer contribution' },
];

export const PAYROLL_CALCULATION_METHOD_OPTIONS: { value: PayrollCalculationMethod; label: string }[] = [
  { value: 'amount', label: 'Rand amount' },
  { value: 'percent_of_basic', label: '% of basic' },
];

export interface PayrollComponentType {
  id?: number;
  business_id?: number | null;
  code: string;
  name: string;
  direction: PayrollComponentDirection;
  irp5_source_code?: string | null;
  taxable: boolean;
  uifable: boolean;
  sdl_liable: boolean;
  reduces_taxable?: boolean;
  is_system: boolean;
  package_eligible: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export type CreatePayrollComponentTypeDto = Omit<
  PayrollComponentType,
  'id' | 'is_system' | 'created_at' | 'updated_at'
> & { business_id: number };

export interface EmployeeRecurringComponent {
  id?: number;
  employee_id: number;
  component_type_id: number;
  calculation_method: PayrollCalculationMethod;
  amount?: string | number | null;
  percent?: string | number | null;
  sort_order: number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export type CreateEmployeeRecurringComponentDto = Omit<
  EmployeeRecurringComponent,
  'id' | 'created_at' | 'updated_at'
>;
