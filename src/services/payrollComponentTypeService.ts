import { foroApiClient } from '../backend';
import type { CreatePayrollComponentTypeDto, PayrollComponentType } from '../types/payrollPackage';

const BASE = '/api/v1/payroll-component-types';

interface ApiRow {
  id: number;
  businessId: number | null;
  code: string;
  name: string;
  direction: string;
  irp5SourceCode: string | null;
  taxable: boolean;
  uifable: boolean;
  sdlLiable: boolean;
  reducesTaxable: boolean;
  isSystem: boolean;
  packageEligible: boolean;
  sortOrder: number;
  createdAt: string | null;
  updatedAt: string | null;
}

function fromApi(row: ApiRow): PayrollComponentType {
  return {
    id: row.id,
    business_id: row.businessId,
    code: row.code,
    name: row.name,
    direction: row.direction as PayrollComponentType['direction'],
    irp5_source_code: row.irp5SourceCode,
    taxable: Boolean(row.taxable),
    uifable: Boolean(row.uifable),
    sdl_liable: Boolean(row.sdlLiable),
    reduces_taxable: Boolean(row.reducesTaxable),
    is_system: Boolean(row.isSystem),
    package_eligible: Boolean(row.packageEligible),
    sort_order: row.sortOrder ?? 0,
    created_at: row.createdAt ?? undefined,
    updated_at: row.updatedAt ?? undefined,
  };
}

export class PayrollComponentTypeService {
  static async findAll(params?: {
    businessId?: number;
    packageEligible?: boolean;
  }): Promise<PayrollComponentType[]> {
    const response = await foroApiClient.get<ApiRow[]>(BASE, {
      limit: 200,
      ...(params?.businessId != null && { businessId: params.businessId }),
      ...(params?.packageEligible ? { packageEligible: true } : {}),
    });
    return (response.data ?? []).map(fromApi);
  }

  static async create(data: CreatePayrollComponentTypeDto): Promise<PayrollComponentType> {
    const response = await foroApiClient.post<ApiRow>(BASE, {
      businessId: data.business_id,
      code: data.code,
      name: data.name,
      direction: data.direction,
      irp5SourceCode: data.irp5_source_code ?? '',
      taxable: data.taxable,
      uifable: data.uifable,
      sdlLiable: data.sdl_liable,
      reducesTaxable: data.reduces_taxable ?? false,
      packageEligible: data.package_eligible,
      sortOrder: data.sort_order,
    });
    return fromApi(response.data);
  }
}

export default PayrollComponentTypeService;
