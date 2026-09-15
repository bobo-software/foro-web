import { foroApiClient } from '../backend';
import type { PurchaseApprovalSetting } from '../types/purchase';

const BASE = '/api/v1/purchase-approval-settings';

interface ApiSettingRow {
  id: number;
  businessId: number;
  autoApproveThreshold: string | null;
  currency: string | null;
}

function fromApi(row: ApiSettingRow): PurchaseApprovalSetting {
  return {
    id: row.id,
    business_id: row.businessId,
    auto_approve_threshold: row.autoApproveThreshold != null ? Number(row.autoApproveThreshold) : null,
    currency: row.currency ?? undefined,
  };
}

export class PurchaseApprovalSettingService {
  static async findAll(params?: { where?: Record<string, unknown> }): Promise<PurchaseApprovalSetting[]> {
    const where = (params?.where ?? {}) as Record<string, unknown>;
    const response = await foroApiClient.get<ApiSettingRow[]>(BASE, {
      limit: 1,
      ...((where.business_id ?? where.businessId) !== undefined && {
        businessId: where.business_id ?? where.businessId,
      }),
    });
    return (response.data ?? []).map(fromApi);
  }

  static async create(data: PurchaseApprovalSetting): Promise<PurchaseApprovalSetting> {
    const response = await foroApiClient.post<ApiSettingRow>(BASE, {
      businessId: data.business_id,
      autoApproveThreshold: data.auto_approve_threshold,
      currency: data.currency,
    });
    return fromApi(response.data);
  }

  static async update(id: number, data: Partial<PurchaseApprovalSetting>): Promise<PurchaseApprovalSetting> {
    const response = await foroApiClient.put<ApiSettingRow>(`${BASE}/${id}`, {
      autoApproveThreshold: data.auto_approve_threshold,
      currency: data.currency,
    });
    return fromApi(response.data);
  }
}

export default PurchaseApprovalSettingService;
