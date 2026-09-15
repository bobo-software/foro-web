import { foroApiClient } from '../backend';
import type { CreatePurchaseOrderDto, PurchaseOrder, PurchaseOrderItem } from '../types/purchase';

const BASE = '/api/v1/purchase-orders';
const ITEMS = '/api/v1/purchase-order-items';

interface ApiPoRow {
  id: number;
  companyId: number | null;
  supplierId: number | null;
  businessId: number | null;
  poNumber: string;
  status: string;
  quoteReference: string | null;
  approvalStatus: string | null;
  issueDate: string;
  expectedDeliveryDate: string | null;
  subtotal: string;
  taxRate: string | null;
  taxAmount: string | null;
  total: string;
  currency: string | null;
  discountPercent: string | null;
  notes: string | null;
  projectId: number | null;
  receivedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

interface ApiPoItemRow {
  id: number;
  purchaseOrderId: number;
  itemId: number | null;
  supplierItemId: number | null;
  description: string;
  quantity: number;
  unitCost: string;
  total: string;
  sku: string | null;
  unitType: string | null;
  discountPercent: string | null;
}

export function normalizePurchaseOrder(row: ApiPoRow): PurchaseOrder {
  return {
    id: row.id,
    company_id: row.companyId,
    supplier_id: row.supplierId,
    business_id: row.businessId,
    project_id: row.projectId,
    po_number: row.poNumber,
    status: (row.status as PurchaseOrder['status']) ?? 'draft',
    quote_reference: row.quoteReference ?? undefined,
    approval_status: (row.approvalStatus as PurchaseOrder['approval_status']) ?? 'not_required',
    issue_date: row.issueDate,
    expected_delivery_date: row.expectedDeliveryDate ?? undefined,
    subtotal: Number(row.subtotal) || 0,
    tax_rate: row.taxRate != null ? Number(row.taxRate) : undefined,
    tax_amount: row.taxAmount != null ? Number(row.taxAmount) : undefined,
    total: Number(row.total) || 0,
    currency: row.currency ?? undefined,
    discount_percent: row.discountPercent != null ? Number(row.discountPercent) : undefined,
    notes: row.notes ?? undefined,
    received_at: row.receivedAt,
    created_at: row.createdAt ?? undefined,
    updated_at: row.updatedAt ?? undefined,
  };
}

function normalizeItem(row: ApiPoItemRow): PurchaseOrderItem {
  return {
    id: row.id,
    purchase_order_id: row.purchaseOrderId,
    item_id: row.itemId,
    supplier_item_id: row.supplierItemId,
    description: row.description,
    quantity: Number(row.quantity) || 0,
    unit_cost: Number(row.unitCost) || 0,
    total: Number(row.total) || 0,
    sku: row.sku ?? undefined,
    unit_type: (row.unitType as PurchaseOrderItem['unit_type']) ?? 'qty',
    discount_percent: row.discountPercent != null ? Number(row.discountPercent) : undefined,
  };
}

function toHeaderBody(data: Partial<CreatePurchaseOrderDto>): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (data.company_id !== undefined) body.companyId = data.company_id;
  if (data.supplier_id !== undefined) body.supplierId = data.supplier_id;
  if (data.business_id !== undefined) body.businessId = data.business_id;
  if (data.project_id !== undefined) body.projectId = data.project_id;
  if (data.status !== undefined) body.status = data.status;
  if (data.quote_reference !== undefined) body.quoteReference = data.quote_reference;
  if (data.approval_status !== undefined) body.approvalStatus = data.approval_status;
  if (data.issue_date !== undefined) body.issueDate = data.issue_date;
  if (data.expected_delivery_date !== undefined) body.expectedDeliveryDate = data.expected_delivery_date;
  if (data.subtotal !== undefined) body.subtotal = data.subtotal;
  if (data.tax_rate !== undefined) body.taxRate = data.tax_rate;
  if (data.tax_amount !== undefined) body.taxAmount = data.tax_amount;
  if (data.total !== undefined) body.total = data.total;
  if (data.currency !== undefined) body.currency = data.currency;
  if (data.discount_percent !== undefined) body.discountPercent = data.discount_percent;
  if (data.notes !== undefined) body.notes = data.notes;
  return body;
}

export class PurchaseOrderService {
  static async findAll(params?: {
    where?: Record<string, unknown>;
    limit?: number;
    offset?: number;
  }): Promise<PurchaseOrder[]> {
    const where = (params?.where ?? {}) as Record<string, unknown>;
    const response = await foroApiClient.get<ApiPoRow[]>(BASE, {
      limit: params?.limit ?? 200,
      offset: params?.offset ?? 0,
      ...((where.company_id ?? where.companyId) !== undefined && { companyId: where.company_id ?? where.companyId }),
      ...((where.supplier_id ?? where.supplierId) !== undefined && { supplierId: where.supplier_id ?? where.supplierId }),
      ...((where.business_id ?? where.businessId) !== undefined && { businessId: where.business_id ?? where.businessId }),
      ...((where.status) !== undefined && { status: where.status }),
    });
    return (response.data ?? []).map(normalizePurchaseOrder);
  }

  static async findById(id: number): Promise<PurchaseOrder | null> {
    try {
      const response = await foroApiClient.get<ApiPoRow>(`${BASE}/${id}`);
      return response.data ? normalizePurchaseOrder(response.data) : null;
    } catch (err: unknown) {
      if ((err as { status?: number }).status === 404) return null;
      throw err;
    }
  }

  static async findItems(purchaseOrderId: number): Promise<PurchaseOrderItem[]> {
    const response = await foroApiClient.get<ApiPoItemRow[]>(ITEMS, {
      purchaseOrderId,
      limit: 200,
    });
    return (response.data ?? []).map(normalizeItem);
  }

  static async create(data: CreatePurchaseOrderDto): Promise<PurchaseOrder> {
    const response = await foroApiClient.post<ApiPoRow>(BASE, toHeaderBody(data));
    return normalizePurchaseOrder(response.data);
  }

  static async update(id: number, data: Partial<CreatePurchaseOrderDto>): Promise<PurchaseOrder> {
    const response = await foroApiClient.put<ApiPoRow>(`${BASE}/${id}`, toHeaderBody(data));
    return normalizePurchaseOrder(response.data);
  }

  static async updateFull(
    id: number,
    purchaseOrder: Partial<CreatePurchaseOrderDto>,
    lines: Array<{
      item_id?: number;
      supplier_item_id?: number;
      description: string;
      quantity: number;
      unit_cost: number;
      total: number;
      sku?: string;
      unit_type?: 'qty' | 'hrs';
    }>,
  ): Promise<{ purchaseOrder: PurchaseOrder; lines: PurchaseOrderItem[] }> {
    const response = await foroApiClient.put<{ purchaseOrder: ApiPoRow; lines: ApiPoItemRow[] }>(
      `${BASE}/${id}/full`,
      {
        purchaseOrder: toHeaderBody(purchaseOrder),
        lines: lines.map((line) => ({
          itemId: line.item_id,
          supplierItemId: line.supplier_item_id,
          description: line.description,
          quantity: line.quantity,
          unitCost: line.unit_cost,
          total: line.total,
          sku: line.sku,
          unitType: line.unit_type ?? 'qty',
        })),
      },
    );
    return {
      purchaseOrder: normalizePurchaseOrder(response.data.purchaseOrder),
      lines: (response.data.lines ?? []).map(normalizeItem),
    };
  }

  static async receive(id: number, dueDate?: string): Promise<{ purchaseOrder: PurchaseOrder; bill: unknown }> {
    const response = await foroApiClient.post<{ purchaseOrder: ApiPoRow; bill: unknown }>(
      `${BASE}/${id}/receive`,
      dueDate ? { dueDate } : {},
    );
    return {
      purchaseOrder: normalizePurchaseOrder(response.data.purchaseOrder),
      bill: response.data.bill,
    };
  }

  static async delete(id: number): Promise<void> {
    await foroApiClient.delete(`${BASE}/${id}`);
  }
}

export default PurchaseOrderService;
