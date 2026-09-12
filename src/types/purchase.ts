export type PurchaseOrderStatus = 'draft' | 'sent' | 'received' | 'cancelled';
export type BillStatus = 'unpaid' | 'partially_paid' | 'paid' | 'cancelled';

export interface PurchaseOrder {
  id?: number;
  company_id?: number | null;
  business_id?: number | null;
  project_id?: number | null;
  po_number: string;
  status: PurchaseOrderStatus;
  issue_date: string;
  expected_delivery_date?: string;
  subtotal: number;
  tax_rate?: number;
  tax_amount?: number;
  total: number;
  currency?: string;
  discount_percent?: number;
  notes?: string;
  received_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface PurchaseOrderItem {
  id?: number;
  purchase_order_id: number;
  item_id?: number | null;
  description: string;
  quantity: number;
  unit_cost: number;
  total: number;
  sku?: string;
  unit_type?: 'qty' | 'hrs';
  discount_percent?: number;
}

export interface CreatePurchaseOrderDto {
  company_id?: number;
  business_id: number;
  project_id?: number;
  po_number: string;
  status: PurchaseOrderStatus;
  issue_date: string;
  expected_delivery_date?: string;
  subtotal: number;
  tax_rate?: number;
  tax_amount?: number;
  total: number;
  currency?: string;
  discount_percent?: number;
  notes?: string;
}

export interface Bill {
  id?: number;
  company_id?: number | null;
  business_id?: number | null;
  purchase_order_id?: number | null;
  bill_number: string;
  status: BillStatus;
  issue_date: string;
  due_date?: string;
  subtotal: number;
  tax_rate?: number;
  tax_amount?: number;
  total: number;
  currency?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface BillPayment {
  id?: number;
  bill_id: number;
  business_id?: number | null;
  amount: number;
  currency?: string;
  date: string;
  reference?: string;
  payment_method?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateBillPaymentDto {
  bill_id: number;
  business_id: number;
  amount: number;
  currency?: string;
  date: string;
  reference?: string;
  payment_method?: string;
}
