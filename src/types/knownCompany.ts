export interface KnownCompany {
  id: number;
  name: string;
  website?: string;
  phone?: string;
  email?: string;
  address?: string;
  vat_number?: string;
  registration_number?: string;
  country: string;
  active: boolean;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export type CreateKnownCompanyDto = Omit<KnownCompany, 'id' | 'created_at' | 'updated_at' | 'country' | 'active'> & {
  country?: string;
  active?: boolean;
};
