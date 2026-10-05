export type YearEndStatus = 'draft' | 'issued';
export type YearEndCertificateType = 'irp5' | 'it3a';

export const YEAR_END_STATUS_OPTIONS: { value: YearEndStatus | ''; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'issued', label: 'Issued' },
];

export const YEAR_END_STATUS_LABELS: Record<YearEndStatus, string> = {
  draft: 'Draft',
  issued: 'Issued',
};

export const YEAR_END_TYPE_LABELS: Record<YearEndCertificateType, string> = {
  irp5: 'IRP5',
  it3a: 'IT3(a)',
};

export interface PayrollTaxYear {
  id: number;
  code: string;
  starts_on: string;
  ends_on: string;
}

export interface YearEndCertificateItem {
  id: number;
  source_code: string;
  name: string;
  direction: string;
  amount: string;
  sort_order: number;
}

export interface YearEndCertificate {
  id: number;
  batch_id: number;
  employee_id: number;
  certificate_type: YearEndCertificateType;
  first_name: string;
  last_name: string;
  id_number?: string | null;
  passport_number?: string | null;
  tax_number?: string | null;
  employment_type?: string | null;
  period_start: string;
  period_end: string;
  gross: string;
  taxable: string;
  paye: string;
  uif_employee: string;
  items: YearEndCertificateItem[];
}

export interface YearEndBatch {
  id: number;
  business_id: number;
  tax_year_id: number;
  tax_year_code: string;
  starts_on: string;
  ends_on: string;
  status: YearEndStatus;
  certificate_count: number;
  irp5_count: number;
  it3_count: number;
  notes?: string | null;
  issued_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface YearEndBatchDetail extends YearEndBatch {
  certificates: YearEndCertificate[];
}

export interface CreateYearEndBatchDto {
  business_id: number;
  tax_year_id: number;
  notes?: string;
}

export function yearEndEmployeeName(cert: Pick<YearEndCertificate, 'first_name' | 'last_name'>): string {
  return `${cert.first_name} ${cert.last_name}`.trim();
}
