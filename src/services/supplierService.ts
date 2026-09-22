import { foroApiClient } from '../backend';
import type { Supplier, CreateSupplierDto, SupplierCostType, SupplierRecurrenceInterval } from '../types/supplier';
import { isRecurrenceInterval, toCalendarDate } from '../utils/recurrence';

const BASE = '/api/v1/suppliers';

interface ApiSupplierRow {
  id: number;
  businessId: number;
  name: string;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  vatNumber: string | null;
  registrationNumber: string | null;
  costType: string | null;
  paymentTermsDays: number | null;
  currency: string | null;
  recurrenceInterval: string | null;
  nextExpectedPaymentDate: string | null;
  expectedAmount: string | number | null;
  notes: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

function fromApiAmount(value: string | number | null | undefined): number | null {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function fromApi(row: ApiSupplierRow): Supplier {
  return {
    id: row.id,
    business_id: row.businessId,
    name: row.name,
    contact_person: row.contactPerson ?? undefined,
    email: row.email ?? undefined,
    phone: row.phone ?? undefined,
    website: row.website ?? undefined,
    address: row.address ?? undefined,
    vat_number: row.vatNumber ?? undefined,
    registration_number: row.registrationNumber ?? undefined,
    cost_type: (row.costType as SupplierCostType | null) ?? null,
    payment_terms_days: row.paymentTermsDays ?? undefined,
    currency: row.currency ?? undefined,
    recurrence_interval: isRecurrenceInterval(row.recurrenceInterval) ? row.recurrenceInterval : null,
    next_expected_payment_date: toCalendarDate(row.nextExpectedPaymentDate),
    expected_amount: fromApiAmount(row.expectedAmount),
    notes: row.notes ?? undefined,
    created_at: row.createdAt ?? undefined,
    updated_at: row.updatedAt ?? undefined,
  };
}

function toApiBody(data: Partial<CreateSupplierDto>): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (data.business_id !== undefined) body.businessId = data.business_id;
  if (data.name !== undefined) body.name = data.name;
  if (data.contact_person !== undefined) body.contactPerson = data.contact_person;
  if (data.email !== undefined) body.email = data.email;
  if (data.phone !== undefined) body.phone = data.phone;
  if (data.website !== undefined) body.website = data.website;
  if (data.address !== undefined) body.address = data.address;
  if (data.vat_number !== undefined) body.vatNumber = data.vat_number;
  if (data.registration_number !== undefined) body.registrationNumber = data.registration_number;
  if (data.cost_type !== undefined) body.costType = data.cost_type;
  if (data.payment_terms_days !== undefined) body.paymentTermsDays = data.payment_terms_days;
  if (data.currency !== undefined) body.currency = data.currency;
  if (data.recurrence_interval !== undefined) {
    body.recurrenceInterval = (data.recurrence_interval as SupplierRecurrenceInterval | null) ?? '';
  }
  if (data.next_expected_payment_date !== undefined) {
    body.nextExpectedPaymentDate = data.next_expected_payment_date ?? '';
  }
  if (data.expected_amount !== undefined) {
    body.expectedAmount = data.expected_amount == null ? '' : data.expected_amount;
  }
  if (data.notes !== undefined) body.notes = data.notes;
  return body;
}

export class SupplierService {
  static async findAll(params?: {
    where?: Record<string, unknown>;
    limit?: number;
    offset?: number;
  }): Promise<Supplier[]> {
    const where = (params?.where ?? {}) as Record<string, unknown>;
    const response = await foroApiClient.get<ApiSupplierRow[]>(BASE, {
      limit: params?.limit ?? 500,
      offset: params?.offset ?? 0,
      ...((where.business_id ?? where.businessId) !== undefined && {
        businessId: where.business_id ?? where.businessId,
      }),
      ...((where.cost_type ?? where.costType) !== undefined && {
        costType: where.cost_type ?? where.costType,
      }),
    });
    return (response.data ?? []).map(fromApi);
  }

  static async findById(id: number): Promise<Supplier | null> {
    try {
      const response = await foroApiClient.get<ApiSupplierRow>(`${BASE}/${id}`);
      return response.data ? fromApi(response.data) : null;
    } catch (err: unknown) {
      if ((err as { status?: number }).status === 404) return null;
      throw err;
    }
  }

  static async create(data: CreateSupplierDto): Promise<Supplier> {
    const response = await foroApiClient.post<ApiSupplierRow>(BASE, toApiBody(data));
    return fromApi(response.data);
  }

  static async update(id: number, data: Partial<CreateSupplierDto>): Promise<Supplier> {
    const response = await foroApiClient.put<ApiSupplierRow>(`${BASE}/${id}`, toApiBody(data));
    return fromApi(response.data);
  }

  static async delete(id: number): Promise<void> {
    await foroApiClient.delete(`${BASE}/${id}`);
  }
}

export default SupplierService;
