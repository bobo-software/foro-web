import { foroApiClient } from '../backend';
import type {
  CreateEmployeeDto,
  Employee,
  EmployeeEmploymentType,
  EmployeePayFrequency,
  EmployeeStatus,
} from '../types/employee';
import { toCalendarDate } from '../utils/recurrence';

const BASE = '/api/v1/employees';

interface ApiEmployeeRow {
  id: number;
  businessId: number;
  firstName: string;
  lastName: string;
  knownAs: string | null;
  idNumber: string | null;
  passportNumber: string | null;
  nationality: string | null;
  dateOfBirth: string | null;
  taxNumber: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  jobTitle: string | null;
  employmentType: string;
  startDate: string;
  endDate: string | null;
  payFrequency: string;
  status: string;
  uifEligible: boolean;
  payeRegistered: boolean;
  medicalAidMembers: number;
  userId: number | null;
  notes: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

function fromApi(row: ApiEmployeeRow): Employee {
  return {
    id: row.id,
    business_id: row.businessId,
    first_name: row.firstName,
    last_name: row.lastName,
    known_as: row.knownAs,
    id_number: row.idNumber,
    passport_number: row.passportNumber,
    nationality: row.nationality,
    date_of_birth: toCalendarDate(row.dateOfBirth),
    tax_number: row.taxNumber,
    email: row.email ?? undefined,
    phone: row.phone ?? undefined,
    address: row.address ?? undefined,
    job_title: row.jobTitle,
    employment_type: row.employmentType as EmployeeEmploymentType,
    start_date: toCalendarDate(row.startDate) ?? row.startDate,
    end_date: toCalendarDate(row.endDate),
    pay_frequency: row.payFrequency as EmployeePayFrequency,
    status: row.status as EmployeeStatus,
    uif_eligible: Boolean(row.uifEligible),
    paye_registered: Boolean(row.payeRegistered),
    medical_aid_members: row.medicalAidMembers ?? 0,
    user_id: row.userId,
    notes: row.notes ?? undefined,
    created_at: row.createdAt ?? undefined,
    updated_at: row.updatedAt ?? undefined,
  };
}

function toApiBody(data: Partial<CreateEmployeeDto>): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (data.business_id !== undefined) body.businessId = data.business_id;
  if (data.first_name !== undefined) body.firstName = data.first_name;
  if (data.last_name !== undefined) body.lastName = data.last_name;
  if (data.known_as !== undefined) body.knownAs = data.known_as ?? '';
  if (data.id_number !== undefined) body.idNumber = data.id_number ?? '';
  if (data.passport_number !== undefined) body.passportNumber = data.passport_number ?? '';
  if (data.nationality !== undefined) body.nationality = data.nationality ?? '';
  if (data.date_of_birth !== undefined) body.dateOfBirth = data.date_of_birth ?? '';
  if (data.tax_number !== undefined) body.taxNumber = data.tax_number ?? '';
  if (data.email !== undefined) body.email = data.email ?? '';
  if (data.phone !== undefined) body.phone = data.phone ?? '';
  if (data.address !== undefined) body.address = data.address;
  if (data.job_title !== undefined) body.jobTitle = data.job_title ?? '';
  if (data.employment_type !== undefined) body.employmentType = data.employment_type;
  if (data.start_date !== undefined) body.startDate = data.start_date;
  if (data.end_date !== undefined) body.endDate = data.end_date ?? '';
  if (data.pay_frequency !== undefined) body.payFrequency = data.pay_frequency;
  if (data.status !== undefined) body.status = data.status;
  if (data.uif_eligible !== undefined) body.uifEligible = data.uif_eligible;
  if (data.paye_registered !== undefined) body.payeRegistered = data.paye_registered;
  if (data.medical_aid_members !== undefined) body.medicalAidMembers = data.medical_aid_members;
  if (data.user_id !== undefined) body.userId = data.user_id == null ? '' : data.user_id;
  if (data.notes !== undefined) body.notes = data.notes;
  return body;
}

export class EmployeeService {
  static async findAll(params?: {
    where?: Record<string, unknown>;
    limit?: number;
    offset?: number;
  }): Promise<Employee[]> {
    const where = (params?.where ?? {}) as Record<string, unknown>;
    const response = await foroApiClient.get<ApiEmployeeRow[]>(BASE, {
      limit: params?.limit ?? 500,
      offset: params?.offset ?? 0,
      ...((where.business_id ?? where.businessId) !== undefined && {
        businessId: where.business_id ?? where.businessId,
      }),
      ...((where.status) !== undefined && { status: where.status }),
      ...((where.employment_type ?? where.employmentType) !== undefined && {
        employmentType: where.employment_type ?? where.employmentType,
      }),
    });
    return (response.data ?? []).map(fromApi);
  }

  static async findById(id: number): Promise<Employee | null> {
    try {
      const response = await foroApiClient.get<ApiEmployeeRow>(`${BASE}/${id}`);
      return response.data ? fromApi(response.data) : null;
    } catch (err: unknown) {
      if ((err as { status?: number }).status === 404) return null;
      throw err;
    }
  }

  static async create(data: CreateEmployeeDto): Promise<Employee> {
    const response = await foroApiClient.post<ApiEmployeeRow>(BASE, toApiBody(data));
    return fromApi(response.data);
  }

  static async update(id: number, data: Partial<CreateEmployeeDto>): Promise<Employee> {
    const response = await foroApiClient.put<ApiEmployeeRow>(`${BASE}/${id}`, toApiBody(data));
    return fromApi(response.data);
  }

  static async delete(id: number): Promise<void> {
    await foroApiClient.delete(`${BASE}/${id}`);
  }
}

export default EmployeeService;
