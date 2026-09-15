import { foroApiClient } from '../backend';
import type { SupplierItem, CreateSupplierItemDto } from '../types/supplier';

const BASE = '/api/v1/supplier-items';

interface ApiSupplierItemRow {
  id: number;
  supplierId: number;
  sku: string | null;
  name: string;
  description: string | null;
  costPrice: string;
  currency: string | null;
  taxRate: string | null;
  moq: number | null;
  leadTimeDays: number | null;
  unitType: string | null;
  notes: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

function fromApi(row: ApiSupplierItemRow): SupplierItem {
  return {
    id: row.id,
    supplier_id: row.supplierId,
    sku: row.sku ?? undefined,
    name: row.name,
    description: row.description ?? undefined,
    cost_price: Number(row.costPrice) || 0,
    currency: row.currency ?? undefined,
    tax_rate: row.taxRate != null ? Number(row.taxRate) : undefined,
    moq: row.moq ?? undefined,
    lead_time_days: row.leadTimeDays ?? undefined,
    unit_type: (row.unitType as SupplierItem['unit_type']) ?? 'qty',
    notes: row.notes ?? undefined,
    created_at: row.createdAt ?? undefined,
    updated_at: row.updatedAt ?? undefined,
  };
}

function toApiBody(data: Partial<CreateSupplierItemDto>): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (data.supplier_id !== undefined) body.supplierId = data.supplier_id;
  if (data.sku !== undefined) body.sku = data.sku;
  if (data.name !== undefined) body.name = data.name;
  if (data.description !== undefined) body.description = data.description;
  if (data.cost_price !== undefined) body.costPrice = data.cost_price;
  if (data.currency !== undefined) body.currency = data.currency;
  if (data.tax_rate !== undefined) body.taxRate = data.tax_rate;
  if (data.moq !== undefined) body.moq = data.moq;
  if (data.lead_time_days !== undefined) body.leadTimeDays = data.lead_time_days;
  if (data.unit_type !== undefined) body.unitType = data.unit_type;
  if (data.notes !== undefined) body.notes = data.notes;
  return body;
}

export class SupplierItemService {
  static async findAll(params?: {
    where?: Record<string, unknown>;
    limit?: number;
    offset?: number;
  }): Promise<SupplierItem[]> {
    const where = (params?.where ?? {}) as Record<string, unknown>;
    const response = await foroApiClient.get<ApiSupplierItemRow[]>(BASE, {
      limit: params?.limit ?? 500,
      offset: params?.offset ?? 0,
      ...((where.supplier_id ?? where.supplierId) !== undefined && {
        supplierId: where.supplier_id ?? where.supplierId,
      }),
    });
    return (response.data ?? []).map(fromApi);
  }

  static async create(data: CreateSupplierItemDto): Promise<SupplierItem> {
    const response = await foroApiClient.post<ApiSupplierItemRow>(BASE, toApiBody(data));
    return fromApi(response.data);
  }

  static async update(id: number, data: Partial<CreateSupplierItemDto>): Promise<SupplierItem> {
    const response = await foroApiClient.put<ApiSupplierItemRow>(`${BASE}/${id}`, toApiBody(data));
    return fromApi(response.data);
  }

  static async delete(id: number): Promise<void> {
    await foroApiClient.delete(`${BASE}/${id}`);
  }
}

export default SupplierItemService;
