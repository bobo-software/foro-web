import { foroApiClient } from '../backend';
import type { Supplier, CreateSupplierDto } from '../types/supplier';

const BASE = '/api/v1/suppliers';

interface ApiSupplierRow {
  id: number;
  businessId: number;
  name: string;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  vatNumber: string | null;
  registrationNumber: string | null;
  paymentTermsDays: number | null;
  currency: string | null;
  notes: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

function fromApi(row: ApiSupplierRow): Supplier {
  return {
    id: row.id,
    business_id: row.businessId,
    name: row.name,
    contact_person: row.contactPerson ?? undefined,
    email: row.email ?? undefined,
    phone: row.phone ?? undefined,
    address: row.address ?? undefined,
    vat_number: row.vatNumber ?? undefined,
    registration_number: row.registrationNumber ?? undefined,
    payment_terms_days: row.paymentTermsDays ?? undefined,
    currency: row.currency ?? undefined,
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
  if (data.address !== undefined) body.address = data.address;
  if (data.vat_number !== undefined) body.vatNumber = data.vat_number;
  if (data.registration_number !== undefined) body.registrationNumber = data.registration_number;
  if (data.payment_terms_days !== undefined) body.paymentTermsDays = data.payment_terms_days;
  if (data.currency !== undefined) body.currency = data.currency;
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
