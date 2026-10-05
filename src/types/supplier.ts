import type { RecurrenceInterval } from '@/utils/recurrence';

export type SupplierCostType = 'subscription' | 'bill' | 'company_cost';
export type SupplierRecurrenceInterval = RecurrenceInterval;

export const SUPPLIER_COST_TYPE_OPTIONS: { value: SupplierCostType; label: string }[] = [
  { value: 'subscription', label: 'Subscription service' },
  { value: 'bill', label: 'Bill' },
  { value: 'company_cost', label: 'Company cost' },
];

export interface Supplier {
  id?: number;
  business_id: number;
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  vat_number?: string;
  registration_number?: string;
  cost_type?: SupplierCostType | null;
  payment_terms_days?: number;
  currency?: string;
  recurrence_interval?: SupplierRecurrenceInterval | null;
  next_expected_payment_date?: string | null;
  expected_amount?: number | null;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export type CreateSupplierDto = Omit<Supplier, 'id' | 'created_at' | 'updated_at'>;

export interface SupplierItem {
  id?: number;
  supplier_id: number;
  sku?: string;
  name: string;
  description?: string;
  cost_price: number;
  currency?: string;
  tax_rate?: number;
  moq?: number;
  lead_time_days?: number;
  unit_type?: 'qty' | 'hrs';
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export type CreateSupplierItemDto = Omit<SupplierItem, 'id' | 'created_at' | 'updated_at'>;
