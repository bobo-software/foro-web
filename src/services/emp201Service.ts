import { foroApiClient } from '../backend';
import { toCalendarDate } from '../utils/recurrence';
import { emp201DueDate } from '../utils/emp201';
import type { CreateEmp201Dto, Emp201Detail, Emp201IncludedRun, Emp201Return, Emp201Status } from '../types/emp201';

const BASE = '/api/v1/emp201-returns';

interface ApiRunRow {
  id: number;
  runNumber: string;
  payDate: string;
  payFrequency: string;
  totalPaye: string | number;
  totalUifEmployee: string | number;
  totalUifEmployer: string | number;
  totalSdl: string | number;
}

interface ApiEmp201Row {
  id: number;
  businessId: number;
  periodYear: number;
  periodMonth: number;
  status: string;
  totalPaye: string | number;
  totalUifEmployee: string | number;
  totalUifEmployer: string | number;
  totalSdl: string | number;
  totalDue: string | number;
  runCount: number;
  employeeCount: number;
  dueDate?: string;
  notes: string | null;
  submittedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  payRuns?: ApiRunRow[];
}

function money(value: string | number | null | undefined): string {
  if (value == null || value === '') return '0.00';
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed.toFixed(2) : '0.00';
}

function fromRun(row: ApiRunRow): Emp201IncludedRun {
  return {
    id: row.id,
    run_number: row.runNumber,
    pay_date: toCalendarDate(row.payDate) ?? String(row.payDate).slice(0, 10),
    pay_frequency: row.payFrequency,
    total_paye: money(row.totalPaye),
    total_uif_employee: money(row.totalUifEmployee),
    total_uif_employer: money(row.totalUifEmployer),
    total_sdl: money(row.totalSdl),
  };
}

function fromApi(row: ApiEmp201Row): Emp201Return {
  return {
    id: row.id,
    business_id: row.businessId,
    period_year: row.periodYear,
    period_month: row.periodMonth,
    status: row.status as Emp201Status,
    total_paye: money(row.totalPaye),
    total_uif_employee: money(row.totalUifEmployee),
    total_uif_employer: money(row.totalUifEmployer),
    total_sdl: money(row.totalSdl),
    total_due: money(row.totalDue),
    run_count: row.runCount ?? 0,
    employee_count: row.employeeCount ?? 0,
    due_date: row.dueDate ?? emp201DueDate(row.periodYear, row.periodMonth),
    notes: row.notes,
    submitted_at: row.submittedAt,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}

function fromDetail(row: ApiEmp201Row): Emp201Detail {
  return {
    ...fromApi(row),
    pay_runs: (row.payRuns ?? []).map(fromRun),
  };
}

export class Emp201Service {
  static async findAll(params?: { businessId?: number; status?: string }): Promise<Emp201Return[]> {
    const response = await foroApiClient.get<ApiEmp201Row[]>(BASE, {
      limit: 200,
      ...(params?.businessId != null && { businessId: params.businessId }),
      ...(params?.status ? { status: params.status } : {}),
    });
    return (response.data ?? []).map(fromApi);
  }

  static async findById(id: number): Promise<Emp201Detail | null> {
    try {
      const response = await foroApiClient.get<ApiEmp201Row>(`${BASE}/${id}`);
      return response.data ? fromDetail(response.data) : null;
    } catch (err: unknown) {
      if ((err as { status?: number }).status === 404) return null;
      throw err;
    }
  }

  static async create(data: CreateEmp201Dto): Promise<Emp201Return> {
    const response = await foroApiClient.post<ApiEmp201Row>(BASE, {
      businessId: data.business_id,
      periodYear: data.period_year,
      periodMonth: data.period_month,
      notes: data.notes ?? '',
    });
    return fromApi(response.data);
  }

  static async recalculate(id: number): Promise<Emp201Detail> {
    const response = await foroApiClient.post<ApiEmp201Row>(`${BASE}/${id}/recalculate`, {});
    return fromDetail(response.data);
  }

  static async submit(id: number): Promise<Emp201Detail> {
    const response = await foroApiClient.post<ApiEmp201Row>(`${BASE}/${id}/submit`, {});
    return fromDetail(response.data);
  }
}

export default Emp201Service;
