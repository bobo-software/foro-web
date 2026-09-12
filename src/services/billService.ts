import { foroApiClient } from '../backend';
import type { Bill, BillPayment, CreateBillPaymentDto } from '../types/purchase';

const BILLS = '/api/v1/bills';
const PAYMENTS = '/api/v1/bill-payments';

interface ApiBillRow {
  id: number;
  companyId: number | null;
  businessId: number | null;
  purchaseOrderId: number | null;
  billNumber: string;
  status: string;
  issueDate: string;
  dueDate: string | null;
  subtotal: string;
  taxRate: string | null;
  taxAmount: string | null;
  total: string;
  currency: string | null;
  notes: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

interface ApiBillPaymentRow {
  id: number;
  billId: number;
  businessId: number | null;
  amount: string;
  currency: string | null;
  date: string;
  reference: string | null;
  paymentMethod: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

function normalizeBill(row: ApiBillRow): Bill {
  return {
    id: row.id,
    company_id: row.companyId,
    business_id: row.businessId,
    purchase_order_id: row.purchaseOrderId,
    bill_number: row.billNumber,
    status: (row.status as Bill['status']) ?? 'unpaid',
    issue_date: row.issueDate,
    due_date: row.dueDate ?? undefined,
    subtotal: Number(row.subtotal) || 0,
    tax_rate: row.taxRate != null ? Number(row.taxRate) : undefined,
    tax_amount: row.taxAmount != null ? Number(row.taxAmount) : undefined,
    total: Number(row.total) || 0,
    currency: row.currency ?? undefined,
    notes: row.notes ?? undefined,
    created_at: row.createdAt ?? undefined,
    updated_at: row.updatedAt ?? undefined,
  };
}

function normalizePayment(row: ApiBillPaymentRow): BillPayment {
  return {
    id: row.id,
    bill_id: row.billId,
    business_id: row.businessId,
    amount: Number(row.amount) || 0,
    currency: row.currency ?? undefined,
    date: row.date,
    reference: row.reference ?? undefined,
    payment_method: row.paymentMethod ?? undefined,
    created_at: row.createdAt ?? undefined,
    updated_at: row.updatedAt ?? undefined,
  };
}

export class BillService {
  static async findAll(params?: {
    where?: Record<string, unknown>;
    limit?: number;
    offset?: number;
  }): Promise<Bill[]> {
    const where = (params?.where ?? {}) as Record<string, unknown>;
    const response = await foroApiClient.get<ApiBillRow[]>(BILLS, {
      limit: params?.limit ?? 200,
      offset: params?.offset ?? 0,
      ...((where.company_id ?? where.companyId) !== undefined && { companyId: where.company_id ?? where.companyId }),
      ...((where.business_id ?? where.businessId) !== undefined && { businessId: where.business_id ?? where.businessId }),
      ...((where.purchase_order_id ?? where.purchaseOrderId) !== undefined && {
        purchaseOrderId: where.purchase_order_id ?? where.purchaseOrderId,
      }),
      ...(where.status !== undefined && { status: where.status }),
    });
    return (response.data ?? []).map(normalizeBill);
  }

  static async findById(id: number): Promise<Bill | null> {
    try {
      const response = await foroApiClient.get<ApiBillRow>(`${BILLS}/${id}`);
      return response.data ? normalizeBill(response.data) : null;
    } catch (err: unknown) {
      if ((err as { status?: number }).status === 404) return null;
      throw err;
    }
  }
}

export class BillPaymentService {
  static async findAll(params?: {
    where?: Record<string, unknown>;
    limit?: number;
  }): Promise<BillPayment[]> {
    const where = (params?.where ?? {}) as Record<string, unknown>;
    const response = await foroApiClient.get<ApiBillPaymentRow[]>(PAYMENTS, {
      limit: params?.limit ?? 200,
      ...((where.bill_id ?? where.billId) !== undefined && { billId: where.bill_id ?? where.billId }),
      ...((where.business_id ?? where.businessId) !== undefined && { businessId: where.business_id ?? where.businessId }),
    });
    return (response.data ?? []).map(normalizePayment);
  }

  static async create(data: CreateBillPaymentDto): Promise<BillPayment> {
    const response = await foroApiClient.post<ApiBillPaymentRow>(PAYMENTS, {
      billId: data.bill_id,
      businessId: data.business_id,
      amount: data.amount,
      currency: data.currency,
      date: data.date,
      reference: data.reference,
      paymentMethod: data.payment_method,
    });
    return normalizePayment(response.data);
  }

  static async delete(id: number): Promise<void> {
    await foroApiClient.delete(`${PAYMENTS}/${id}`);
  }
}
