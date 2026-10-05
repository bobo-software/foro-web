import { foroApiClient } from '../backend';
import { toCalendarDate } from '../utils/recurrence';
import type { EmployeePayFrequency } from '../types/employee';
import type { CreatePayRunDto, PayRun, PayRunDetail, PayRunLine, PayRunLineItem, PayRunStatus } from '../types/payRun';

const BASE = '/api/v1/pay-runs';

interface ApiItemRow {
  id: number;
  payRunLineId: number;
  componentTypeId: number;
  code: string;
  name: string;
  direction: string;
  amount: string | number;
  taxable: boolean;
  uifable: boolean;
  sdlLiable: boolean;
  reducesTaxable: boolean;
  irp5SourceCode: string | null;
  isOnceOff: boolean;
  sortOrder: number;
}

interface ApiLineRow {
  id: number;
  payRunId: number;
  employeeId: number;
  firstName: string;
  lastName: string;
  knownAs: string | null;
  gross: string | number;
  taxable: string | number;
  paye: string | number;
  uifEmployee: string | number;
  uifEmployer: string | number;
  sdl: string | number;
  net: string | number;
  ytdGross: string | number;
  ytdTaxable: string | number;
  ytdPaye: string | number;
  ytdUifEmployee: string | number;
  periodsElapsed: number;
  periodsInYear: number;
  items?: ApiItemRow[];
}

interface ApiPayRunRow {
  id: number;
  businessId: number;
  runNumber: string;
  periodStart: string;
  periodEnd: string;
  payDate: string;
  payFrequency: string;
  status: string;
  taxYearId: number | null;
  totalGross: string | number;
  totalPaye: string | number;
  totalUifEmployee: string | number;
  totalUifEmployer: string | number;
  totalSdl: string | number;
  totalNet: string | number;
  notes: string | null;
  calculatedAt: string | null;
  approvedAt: string | null;
  paidAt: string | null;
  cancelledAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  lines?: ApiLineRow[];
}

function money(value: string | number | null | undefined): string {
  if (value == null || value === '') return '0.00';
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed.toFixed(2) : '0.00';
}

function fromItem(row: ApiItemRow): PayRunLineItem {
  return {
    id: row.id,
    pay_run_line_id: row.payRunLineId,
    component_type_id: row.componentTypeId,
    code: row.code,
    name: row.name,
    direction: row.direction,
    amount: money(row.amount),
    taxable: Boolean(row.taxable),
    uifable: Boolean(row.uifable),
    sdl_liable: Boolean(row.sdlLiable),
    reduces_taxable: Boolean(row.reducesTaxable),
    irp5_source_code: row.irp5SourceCode,
    is_once_off: Boolean(row.isOnceOff),
    sort_order: row.sortOrder ?? 0,
  };
}

function fromLine(row: ApiLineRow): PayRunLine {
  return {
    id: row.id,
    pay_run_id: row.payRunId,
    employee_id: row.employeeId,
    first_name: row.firstName,
    last_name: row.lastName,
    known_as: row.knownAs,
    gross: money(row.gross),
    taxable: money(row.taxable),
    paye: money(row.paye),
    uif_employee: money(row.uifEmployee),
    uif_employer: money(row.uifEmployer),
    sdl: money(row.sdl),
    net: money(row.net),
    ytd_gross: money(row.ytdGross),
    ytd_taxable: money(row.ytdTaxable),
    ytd_paye: money(row.ytdPaye),
    ytd_uif_employee: money(row.ytdUifEmployee),
    periods_elapsed: row.periodsElapsed ?? 1,
    periods_in_year: row.periodsInYear ?? 12,
    items: (row.items ?? []).map(fromItem),
  };
}

function fromApi(row: ApiPayRunRow): PayRun {
  return {
    id: row.id,
    business_id: row.businessId,
    run_number: row.runNumber,
    period_start: toCalendarDate(row.periodStart) ?? String(row.periodStart).slice(0, 10),
    period_end: toCalendarDate(row.periodEnd) ?? String(row.periodEnd).slice(0, 10),
    pay_date: toCalendarDate(row.payDate) ?? String(row.payDate).slice(0, 10),
    pay_frequency: row.payFrequency as EmployeePayFrequency,
    status: row.status as PayRunStatus,
    tax_year_id: row.taxYearId,
    total_gross: money(row.totalGross),
    total_paye: money(row.totalPaye),
    total_uif_employee: money(row.totalUifEmployee),
    total_uif_employer: money(row.totalUifEmployer),
    total_sdl: money(row.totalSdl),
    total_net: money(row.totalNet),
    notes: row.notes,
    calculated_at: row.calculatedAt,
    approved_at: row.approvedAt,
    paid_at: row.paidAt,
    cancelled_at: row.cancelledAt,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}

function fromDetail(row: ApiPayRunRow): PayRunDetail {
  return {
    ...fromApi(row),
    lines: (row.lines ?? []).map(fromLine),
  };
}

export class PayRunService {
  static async findAll(params?: {
    businessId?: number;
    status?: string;
    payFrequency?: string;
  }): Promise<PayRun[]> {
    const response = await foroApiClient.get<ApiPayRunRow[]>(BASE, {
      limit: 200,
      ...(params?.businessId != null && { businessId: params.businessId }),
      ...(params?.status ? { status: params.status } : {}),
      ...(params?.payFrequency ? { payFrequency: params.payFrequency } : {}),
    });
    return (response.data ?? []).map(fromApi);
  }

  static async findById(id: number): Promise<PayRunDetail | null> {
    try {
      const response = await foroApiClient.get<ApiPayRunRow>(`${BASE}/${id}`);
      return response.data ? fromDetail(response.data) : null;
    } catch (err: unknown) {
      if ((err as { status?: number }).status === 404) return null;
      throw err;
    }
  }

  static async create(data: CreatePayRunDto): Promise<PayRun> {
    const response = await foroApiClient.post<ApiPayRunRow>(BASE, {
      businessId: data.business_id,
      periodStart: data.period_start,
      periodEnd: data.period_end,
      payDate: data.pay_date,
      payFrequency: data.pay_frequency,
      notes: data.notes ?? '',
    });
    return fromApi(response.data);
  }

  static async calculate(id: number): Promise<PayRunDetail> {
    const response = await foroApiClient.post<ApiPayRunRow>(`${BASE}/${id}/calculate`, {});
    return fromDetail(response.data);
  }

  static async sendBack(id: number): Promise<PayRunDetail> {
    const response = await foroApiClient.post<ApiPayRunRow>(`${BASE}/${id}/send-back`, {});
    return fromDetail(response.data);
  }

  static async approve(id: number): Promise<PayRunDetail> {
    const response = await foroApiClient.post<ApiPayRunRow>(`${BASE}/${id}/approve`, {});
    return fromDetail(response.data);
  }

  static async pay(id: number): Promise<PayRunDetail> {
    const response = await foroApiClient.post<ApiPayRunRow>(`${BASE}/${id}/pay`, {});
    return fromDetail(response.data);
  }

  static async cancel(id: number): Promise<PayRunDetail> {
    const response = await foroApiClient.post<ApiPayRunRow>(`${BASE}/${id}/cancel`, {});
    return fromDetail(response.data);
  }

  static async addOnceOff(
    id: number,
    data: { employeeId: number; componentTypeId: number; amount: number },
  ): Promise<void> {
    await foroApiClient.post(`${BASE}/${id}/once-off`, data);
  }

  static async removeOnceOff(id: number, itemId: number): Promise<void> {
    await foroApiClient.delete(`${BASE}/${id}/line-items/${itemId}`);
  }
}

export default PayRunService;
