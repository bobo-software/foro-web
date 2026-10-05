import { foroApiClient } from '../backend';
import { toCalendarDate } from '../utils/recurrence';
import { emp501DueDate } from '../utils/emp501';
import type { PayrollTaxYear } from '../types/yearEnd';
import type {
  CreateEmp501Dto,
  Emp501Bucket,
  Emp501Detail,
  Emp501IncludedReturn,
  Emp501PeriodType,
  Emp501Return,
  Emp501Status,
  PayrollDashboard,
  PayrollDashboardEmp201,
  PayrollDashboardEmp501,
} from '../types/emp501';

const BASE = '/api/v1/emp501-returns';

interface ApiBucket {
  paye: number;
  uifEmployee: number;
  uifEmployer: number;
  sdl: number;
  due: number;
}

interface ApiEmp201Row {
  id: number;
  periodYear: number;
  periodMonth: number;
  status: string;
  totalPaye: string | number;
  totalUifEmployee: string | number;
  totalUifEmployer: string | number;
  totalSdl: string | number;
  totalDue: string | number;
}

interface ApiEmp501Row {
  id: number;
  businessId: number;
  taxYearId: number;
  taxYearCode: string;
  periodType: string;
  startsOn: string;
  endsOn: string;
  status: string;
  payrollPaye: string | number;
  payrollUifEmployee: string | number;
  payrollUifEmployer: string | number;
  payrollSdl: string | number;
  payrollDue: string | number;
  emp201Paye: string | number;
  emp201UifEmployee: string | number;
  emp201UifEmployer: string | number;
  emp201Sdl: string | number;
  emp201Due: string | number;
  certificatePaye: string | number;
  certificateUifEmployee: string | number;
  certificateCount: number;
  yearEndBatchId: number | null;
  runCount: number;
  employeeCount: number;
  emp201Count: number;
  emp201SubmittedCount: number;
  dueDate?: string;
  notes: string | null;
  submittedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  variancePayrollVsEmp201?: ApiBucket;
  variancePayrollVsCertificates?: ApiBucket;
  emp201s?: ApiEmp201Row[];
}

interface ApiDashboard {
  businessId: number;
  nextPayDate: string | null;
  defaultPayDay: number | null;
  unpaidRunCount: number;
  unpaidRuns: Array<{
    id: number;
    runNumber: string;
    status: string;
    payDate: string;
    periodEnd: string;
    totalNet: string | number;
  }>;
  emp201Due: {
    periodYear: number;
    periodMonth: number;
    dueDate: string;
    overdue: boolean;
    status: 'missing' | 'draft' | 'submitted';
    id: number | null;
  };
  emp501Due: {
    taxYearId: number;
    taxYearCode: string;
    periodType: string;
    dueDate: string;
    overdue: boolean;
    status: 'missing' | 'draft' | 'submitted';
    id: number | null;
  } | null;
}

interface ApiTaxYearRow {
  id: number;
  code: string;
  startsOn: string;
  endsOn: string;
}

function money(value: string | number | null | undefined): string {
  if (value == null || value === '') return '0.00';
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed.toFixed(2) : '0.00';
}

function fromBucket(row?: ApiBucket): Emp501Bucket {
  return {
    paye: row?.paye ?? 0,
    uif_employee: row?.uifEmployee ?? 0,
    uif_employer: row?.uifEmployer ?? 0,
    sdl: row?.sdl ?? 0,
    due: row?.due ?? 0,
  };
}

function fromEmp201(row: ApiEmp201Row): Emp501IncludedReturn {
  return {
    id: row.id,
    period_year: row.periodYear,
    period_month: row.periodMonth,
    status: row.status,
    total_paye: money(row.totalPaye),
    total_uif_employee: money(row.totalUifEmployee),
    total_uif_employer: money(row.totalUifEmployer),
    total_sdl: money(row.totalSdl),
    total_due: money(row.totalDue),
  };
}

function fromReturn(row: ApiEmp501Row): Emp501Return {
  return {
    id: row.id,
    business_id: row.businessId,
    tax_year_id: row.taxYearId,
    tax_year_code: row.taxYearCode,
    period_type: row.periodType as Emp501PeriodType,
    starts_on: toCalendarDate(row.startsOn) ?? String(row.startsOn).slice(0, 10),
    ends_on: toCalendarDate(row.endsOn) ?? String(row.endsOn).slice(0, 10),
    status: row.status as Emp501Status,
    payroll_paye: money(row.payrollPaye),
    payroll_uif_employee: money(row.payrollUifEmployee),
    payroll_uif_employer: money(row.payrollUifEmployer),
    payroll_sdl: money(row.payrollSdl),
    payroll_due: money(row.payrollDue),
    emp201_paye: money(row.emp201Paye),
    emp201_uif_employee: money(row.emp201UifEmployee),
    emp201_uif_employer: money(row.emp201UifEmployer),
    emp201_sdl: money(row.emp201Sdl),
    emp201_due: money(row.emp201Due),
    certificate_paye: money(row.certificatePaye),
    certificate_uif_employee: money(row.certificateUifEmployee),
    certificate_count: row.certificateCount ?? 0,
    year_end_batch_id: row.yearEndBatchId,
    run_count: row.runCount ?? 0,
    employee_count: row.employeeCount ?? 0,
    emp201_count: row.emp201Count ?? 0,
    emp201_submitted_count: row.emp201SubmittedCount ?? 0,
    due_date: row.dueDate || emp501DueDate(toCalendarDate(row.startsOn) ?? String(row.startsOn).slice(0, 10), toCalendarDate(row.endsOn) ?? String(row.endsOn).slice(0, 10), row.periodType as Emp501PeriodType),
    notes: row.notes,
    submitted_at: row.submittedAt,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}

function fromDetail(row: ApiEmp501Row): Emp501Detail {
  return {
    ...fromReturn(row),
    variance_payroll_vs_emp201: fromBucket(row.variancePayrollVsEmp201),
    variance_payroll_vs_certificates: fromBucket(row.variancePayrollVsCertificates),
    emp201s: (row.emp201s ?? []).map(fromEmp201),
  };
}

export class Emp501Service {
  static async findTaxYears(): Promise<PayrollTaxYear[]> {
    const response = await foroApiClient.get<ApiTaxYearRow[]>('/api/v1/payroll-tax-years', { limit: 50 });
    return (response.data ?? []).map((row) => ({
      id: row.id,
      code: row.code,
      starts_on: toCalendarDate(row.startsOn) ?? String(row.startsOn).slice(0, 10),
      ends_on: toCalendarDate(row.endsOn) ?? String(row.endsOn).slice(0, 10),
    }));
  }

  static async findAll(params?: { businessId?: number; status?: string }): Promise<Emp501Return[]> {
    const response = await foroApiClient.get<ApiEmp501Row[]>(BASE, {
      limit: 200,
      ...(params?.businessId != null && { businessId: params.businessId }),
      ...(params?.status ? { status: params.status } : {}),
    });
    return (response.data ?? []).map(fromReturn);
  }

  static async findById(id: number): Promise<Emp501Detail | null> {
    try {
      const response = await foroApiClient.get<ApiEmp501Row>(`${BASE}/${id}`);
      return response.data ? fromDetail(response.data) : null;
    } catch (err: unknown) {
      if ((err as { status?: number }).status === 404) return null;
      throw err;
    }
  }

  static async create(data: CreateEmp501Dto): Promise<Emp501Return> {
    const response = await foroApiClient.post<ApiEmp501Row>(BASE, {
      businessId: data.business_id,
      taxYearId: data.tax_year_id,
      periodType: data.period_type,
      notes: data.notes ?? '',
    });
    return fromReturn(response.data);
  }

  static async recalculate(id: number): Promise<Emp501Detail> {
    const response = await foroApiClient.post<ApiEmp501Row>(`${BASE}/${id}/recalculate`, {});
    return fromDetail(response.data);
  }

  static async submit(id: number): Promise<Emp501Detail> {
    const response = await foroApiClient.post<ApiEmp501Row>(`${BASE}/${id}/submit`, {});
    return fromDetail(response.data);
  }

  static async fetchDashboard(businessId: number): Promise<PayrollDashboard> {
    const response = await foroApiClient.get<ApiDashboard>('/api/v1/payroll-dashboard', { businessId });
    const row = response.data;
    const emp201: PayrollDashboardEmp201 = {
      period_year: row.emp201Due.periodYear,
      period_month: row.emp201Due.periodMonth,
      due_date: row.emp201Due.dueDate,
      overdue: row.emp201Due.overdue,
      status: row.emp201Due.status,
      id: row.emp201Due.id,
    };
    const emp501: PayrollDashboardEmp501 | null = row.emp501Due
      ? {
          tax_year_id: row.emp501Due.taxYearId,
          tax_year_code: row.emp501Due.taxYearCode,
          period_type: row.emp501Due.periodType as Emp501PeriodType,
          due_date: row.emp501Due.dueDate,
          overdue: row.emp501Due.overdue,
          status: row.emp501Due.status,
          id: row.emp501Due.id,
        }
      : null;
    return {
      business_id: row.businessId,
      next_pay_date: row.nextPayDate,
      default_pay_day: row.defaultPayDay,
      unpaid_run_count: row.unpaidRunCount,
      unpaid_runs: (row.unpaidRuns ?? []).map((run) => ({
        id: run.id,
        run_number: run.runNumber,
        status: run.status,
        pay_date: toCalendarDate(run.payDate) ?? String(run.payDate).slice(0, 10),
        period_end: toCalendarDate(run.periodEnd) ?? String(run.periodEnd).slice(0, 10),
        total_net: money(run.totalNet),
      })),
      emp201_due: emp201,
      emp501_due: emp501,
    };
  }
}

export default Emp501Service;
