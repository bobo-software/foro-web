import { foroApiClient } from '../backend';
import type {
  CreateEmployeeRecurringComponentDto,
  EmployeeRecurringComponent,
  PayrollCalculationMethod,
} from '../types/payrollPackage';

const BASE = '/api/v1/employee-recurring-components';

interface ApiRow {
  id: number;
  employeeId: number;
  componentTypeId: number;
  calculationMethod: string;
  amount: string | null;
  percent: string | null;
  sortOrder: number;
  notes: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

function fromApi(row: ApiRow): EmployeeRecurringComponent {
  return {
    id: row.id,
    employee_id: row.employeeId,
    component_type_id: row.componentTypeId,
    calculation_method: row.calculationMethod as PayrollCalculationMethod,
    amount: row.amount,
    percent: row.percent,
    sort_order: row.sortOrder ?? 0,
    notes: row.notes ?? undefined,
    created_at: row.createdAt ?? undefined,
    updated_at: row.updatedAt ?? undefined,
  };
}

function toApiBody(data: Partial<CreateEmployeeRecurringComponentDto>): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (data.employee_id !== undefined) body.employeeId = data.employee_id;
  if (data.component_type_id !== undefined) body.componentTypeId = data.component_type_id;
  if (data.calculation_method !== undefined) body.calculationMethod = data.calculation_method;
  if (data.amount !== undefined) body.amount = data.amount ?? '';
  if (data.percent !== undefined) body.percent = data.percent ?? '';
  if (data.sort_order !== undefined) body.sortOrder = data.sort_order;
  if (data.notes !== undefined) body.notes = data.notes;
  return body;
}

export class EmployeeRecurringComponentService {
  static async findByEmployeeId(employeeId: number): Promise<EmployeeRecurringComponent[]> {
    const response = await foroApiClient.get<ApiRow[]>(BASE, {
      employeeId,
      limit: 200,
    });
    return (response.data ?? []).map(fromApi);
  }

  static async create(data: CreateEmployeeRecurringComponentDto): Promise<EmployeeRecurringComponent> {
    const response = await foroApiClient.post<ApiRow>(BASE, toApiBody(data));
    return fromApi(response.data);
  }

  static async update(
    id: number,
    data: Partial<CreateEmployeeRecurringComponentDto>,
  ): Promise<EmployeeRecurringComponent> {
    const response = await foroApiClient.put<ApiRow>(`${BASE}/${id}`, toApiBody(data));
    return fromApi(response.data);
  }

  static async delete(id: number): Promise<void> {
    await foroApiClient.delete(`${BASE}/${id}`);
  }
}

export default EmployeeRecurringComponentService;
