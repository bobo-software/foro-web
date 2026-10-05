import { foroApiClient } from '../backend';
import type { CreateKnownCompanyDto, KnownCompany } from '../types/knownCompany';

const BASE = '/api/v1/known-companies';
const SUPERADMIN_BASE = '/api/v1/superadmin/known-companies';

interface ApiKnownCompanyRow {
  id: number;
  name: string;
  website: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  vatNumber: string | null;
  registrationNumber: string | null;
  country: string;
  active: boolean;
  notes: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

function fromApi(row: ApiKnownCompanyRow): KnownCompany {
  return {
    id: row.id,
    name: row.name,
    website: row.website ?? undefined,
    phone: row.phone ?? undefined,
    email: row.email ?? undefined,
    address: row.address ?? undefined,
    vat_number: row.vatNumber ?? undefined,
    registration_number: row.registrationNumber ?? undefined,
    country: row.country,
    active: row.active,
    notes: row.notes ?? undefined,
    created_at: row.createdAt ?? undefined,
    updated_at: row.updatedAt ?? undefined,
  };
}

function toApiBody(data: Partial<CreateKnownCompanyDto>): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (data.name !== undefined) body.name = data.name;
  if (data.website !== undefined) body.website = data.website;
  if (data.phone !== undefined) body.phone = data.phone;
  if (data.email !== undefined) body.email = data.email;
  if (data.address !== undefined) body.address = data.address;
  if (data.vat_number !== undefined) body.vatNumber = data.vat_number;
  if (data.registration_number !== undefined) body.registrationNumber = data.registration_number;
  if (data.country !== undefined) body.country = data.country;
  if (data.active !== undefined) body.active = data.active;
  if (data.notes !== undefined) body.notes = data.notes;
  return body;
}

export class KnownCompanyService {
  /** Authenticated read of the shared catalog (any user). */
  static async findAll(params?: {
    active?: boolean;
    country?: string;
    limit?: number;
  }): Promise<KnownCompany[]> {
    const response = await foroApiClient.get<ApiKnownCompanyRow[]>(BASE, {
      limit: params?.limit ?? 500,
      ...(params?.active !== undefined && { active: params.active }),
      ...(params?.country !== undefined && { country: params.country }),
    });
    return (response.data ?? []).map(fromApi).sort((a, b) => a.name.localeCompare(b.name));
  }

  static async findActive(): Promise<KnownCompany[]> {
    return this.findAll({ active: true });
  }

  /** Superadmin: list including inactive. */
  static async findAllAdmin(params?: { active?: boolean; limit?: number }): Promise<KnownCompany[]> {
    const response = await foroApiClient.get<ApiKnownCompanyRow[]>(SUPERADMIN_BASE, {
      limit: params?.limit ?? 500,
      ...(params?.active !== undefined && { active: params.active }),
    });
    return (response.data ?? []).map(fromApi).sort((a, b) => a.name.localeCompare(b.name));
  }

  static async create(data: CreateKnownCompanyDto): Promise<KnownCompany> {
    const response = await foroApiClient.post<ApiKnownCompanyRow>(SUPERADMIN_BASE, toApiBody(data));
    return fromApi(response.data);
  }

  static async update(id: number, data: Partial<CreateKnownCompanyDto>): Promise<KnownCompany> {
    const response = await foroApiClient.put<ApiKnownCompanyRow>(
      `${SUPERADMIN_BASE}/${id}`,
      toApiBody(data),
    );
    return fromApi(response.data);
  }

  static async deactivate(id: number): Promise<KnownCompany> {
    return this.update(id, { active: false });
  }

  static async activate(id: number): Promise<KnownCompany> {
    return this.update(id, { active: true });
  }
}

export default KnownCompanyService;
