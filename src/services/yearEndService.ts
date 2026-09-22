import { foroApiClient } from '../backend';
import { toCalendarDate } from '../utils/recurrence';
import type {
  CreateYearEndBatchDto,
  PayrollTaxYear,
  YearEndBatch,
  YearEndBatchDetail,
  YearEndCertificate,
  YearEndCertificateItem,
  YearEndCertificateType,
  YearEndStatus,
} from '../types/yearEnd';

const BASE = '/api/v1/year-end-batches';

interface ApiItemRow {
  id: number;
  sourceCode: string;
  name: string;
  direction: string;
  amount: string | number;
  sortOrder: number;
}

interface ApiCertificateRow {
  id: number;
  batchId: number;
  employeeId: number;
  certificateType: string;
  firstName: string;
  lastName: string;
  idNumber: string | null;
  passportNumber: string | null;
  taxNumber: string | null;
  employmentType: string | null;
  periodStart: string;
  periodEnd: string;
  gross: string | number;
  taxable: string | number;
  paye: string | number;
  uifEmployee: string | number;
  items?: ApiItemRow[];
}

interface ApiBatchRow {
  id: number;
  businessId: number;
  taxYearId: number;
  taxYearCode: string;
  startsOn: string;
  endsOn: string;
  status: string;
  certificateCount: number;
  irp5Count: number;
  it3Count: number;
  notes: string | null;
  issuedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  certificates?: ApiCertificateRow[];
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

function fromItem(row: ApiItemRow): YearEndCertificateItem {
  return {
    id: row.id,
    source_code: row.sourceCode,
    name: row.name,
    direction: row.direction,
    amount: money(row.amount),
    sort_order: row.sortOrder,
  };
}

function fromCertificate(row: ApiCertificateRow): YearEndCertificate {
  return {
    id: row.id,
    batch_id: row.batchId,
    employee_id: row.employeeId,
    certificate_type: row.certificateType as YearEndCertificateType,
    first_name: row.firstName,
    last_name: row.lastName,
    id_number: row.idNumber,
    passport_number: row.passportNumber,
    tax_number: row.taxNumber,
    employment_type: row.employmentType,
    period_start: toCalendarDate(row.periodStart) ?? String(row.periodStart).slice(0, 10),
    period_end: toCalendarDate(row.periodEnd) ?? String(row.periodEnd).slice(0, 10),
    gross: money(row.gross),
    taxable: money(row.taxable),
    paye: money(row.paye),
    uif_employee: money(row.uifEmployee),
    items: (row.items ?? []).map(fromItem),
  };
}

function fromBatch(row: ApiBatchRow): YearEndBatch {
  return {
    id: row.id,
    business_id: row.businessId,
    tax_year_id: row.taxYearId,
    tax_year_code: row.taxYearCode,
    starts_on: toCalendarDate(row.startsOn) ?? String(row.startsOn).slice(0, 10),
    ends_on: toCalendarDate(row.endsOn) ?? String(row.endsOn).slice(0, 10),
    status: row.status as YearEndStatus,
    certificate_count: row.certificateCount ?? 0,
    irp5_count: row.irp5Count ?? 0,
    it3_count: row.it3Count ?? 0,
    notes: row.notes,
    issued_at: row.issuedAt,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}

function fromDetail(row: ApiBatchRow): YearEndBatchDetail {
  return {
    ...fromBatch(row),
    certificates: (row.certificates ?? []).map(fromCertificate),
  };
}

export class YearEndService {
  static async findTaxYears(): Promise<PayrollTaxYear[]> {
    const response = await foroApiClient.get<ApiTaxYearRow[]>('/api/v1/payroll-tax-years', { limit: 50 });
    return (response.data ?? []).map((row) => ({
      id: row.id,
      code: row.code,
      starts_on: toCalendarDate(row.startsOn) ?? String(row.startsOn).slice(0, 10),
      ends_on: toCalendarDate(row.endsOn) ?? String(row.endsOn).slice(0, 10),
    }));
  }

  static async findAll(params?: { businessId?: number; status?: string }): Promise<YearEndBatch[]> {
    const response = await foroApiClient.get<ApiBatchRow[]>(BASE, {
      limit: 200,
      ...(params?.businessId != null && { businessId: params.businessId }),
      ...(params?.status ? { status: params.status } : {}),
    });
    return (response.data ?? []).map(fromBatch);
  }

  static async findById(id: number): Promise<YearEndBatchDetail | null> {
    try {
      const response = await foroApiClient.get<ApiBatchRow>(`${BASE}/${id}`);
      return response.data ? fromDetail(response.data) : null;
    } catch (err: unknown) {
      if ((err as { status?: number }).status === 404) return null;
      throw err;
    }
  }

  static async create(data: CreateYearEndBatchDto): Promise<YearEndBatch> {
    const response = await foroApiClient.post<ApiBatchRow>(BASE, {
      businessId: data.business_id,
      taxYearId: data.tax_year_id,
      notes: data.notes ?? '',
    });
    return fromBatch(response.data);
  }

  static async recalculate(id: number): Promise<YearEndBatchDetail> {
    const response = await foroApiClient.post<ApiBatchRow>(`${BASE}/${id}/recalculate`, {});
    return fromDetail(response.data);
  }

  static async issue(id: number): Promise<YearEndBatchDetail> {
    const response = await foroApiClient.post<ApiBatchRow>(`${BASE}/${id}/issue`, {});
    return fromDetail(response.data);
  }
}

export default YearEndService;
