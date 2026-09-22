import { foroApiClient } from '../backend';
import type { CreatePayrollEmployerSettingsDto, PayrollEmployerSettings } from '../types/employee';

const BASE = '/api/v1/payroll-employer-settings';

interface ApiRow {
  id: number;
  businessId: number;
  payeReference: string | null;
  uifReference: string | null;
  sdlReference: string | null;
  sdlLiable: boolean;
  defaultPayDay: number | null;
  notes: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

function fromApi(row: ApiRow): PayrollEmployerSettings {
  return {
    id: row.id,
    business_id: row.businessId,
    paye_reference: row.payeReference,
    uif_reference: row.uifReference,
    sdl_reference: row.sdlReference,
    sdl_liable: Boolean(row.sdlLiable),
    default_pay_day: row.defaultPayDay,
    notes: row.notes ?? undefined,
    created_at: row.createdAt ?? undefined,
    updated_at: row.updatedAt ?? undefined,
  };
}

function toApiBody(data: Partial<CreatePayrollEmployerSettingsDto>): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (data.business_id !== undefined) body.businessId = data.business_id;
  if (data.paye_reference !== undefined) body.payeReference = data.paye_reference ?? '';
  if (data.uif_reference !== undefined) body.uifReference = data.uif_reference ?? '';
  if (data.sdl_reference !== undefined) body.sdlReference = data.sdl_reference ?? '';
  if (data.sdl_liable !== undefined) body.sdlLiable = data.sdl_liable;
  if (data.default_pay_day !== undefined) {
    body.defaultPayDay = data.default_pay_day == null ? '' : data.default_pay_day;
  }
  if (data.notes !== undefined) body.notes = data.notes;
  return body;
}

export class PayrollEmployerSettingsService {
  static async findForBusiness(businessId: number): Promise<PayrollEmployerSettings | null> {
    const response = await foroApiClient.get<ApiRow[]>(BASE, {
      businessId,
      limit: 1,
    });
    const row = response.data?.[0];
    return row ? fromApi(row) : null;
  }

  static async create(data: CreatePayrollEmployerSettingsDto): Promise<PayrollEmployerSettings> {
    const response = await foroApiClient.post<ApiRow>(BASE, toApiBody(data));
    return fromApi(response.data);
  }

  static async update(
    id: number,
    data: Partial<CreatePayrollEmployerSettingsDto>,
  ): Promise<PayrollEmployerSettings> {
    const response = await foroApiClient.put<ApiRow>(`${BASE}/${id}`, toApiBody(data));
    return fromApi(response.data);
  }

  static async upsert(data: CreatePayrollEmployerSettingsDto): Promise<PayrollEmployerSettings> {
    const existing = await this.findForBusiness(data.business_id);
    if (existing?.id != null) {
      return this.update(existing.id, data);
    }
    return this.create(data);
  }
}

export default PayrollEmployerSettingsService;
