export interface Supplier {
  id?: number;
  business_id: number;
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  vat_number?: string;
  registration_number?: string;
  payment_terms_days?: number;
  currency?: string;
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
