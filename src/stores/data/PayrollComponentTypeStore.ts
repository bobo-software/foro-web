import { create } from 'zustand';
import PayrollComponentTypeService from '../../services/payrollComponentTypeService';
import { useBusinessStore } from './BusinessStore';
import type { CreatePayrollComponentTypeDto, PayrollComponentType } from '../../types/payrollPackage';

interface PayrollComponentTypeState {
  types: PayrollComponentType[];
  loading: boolean;
  error: string | null;
  fetchTypes: (options?: { packageEligible?: boolean }) => Promise<void>;
  createType: (
    data: Omit<CreatePayrollComponentTypeDto, 'business_id'>,
  ) => Promise<PayrollComponentType>;
}

export const usePayrollComponentTypeStore = create<PayrollComponentTypeState>((set, get) => ({
  types: [],
  loading: false,
  error: null,

  fetchTypes: async (options) => {
    const businessId = useBusinessStore.getState().currentBusiness?.id;
    set({ loading: true, error: null });
    try {
      const types = await PayrollComponentTypeService.findAll({
        businessId,
        packageEligible: options?.packageEligible,
      });
      set({ types, loading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load pay components';
      set({ error: message, loading: false });
    }
  },

  createType: async (data) => {
    const businessId = useBusinessStore.getState().currentBusiness?.id;
    if (businessId == null) throw new Error('Select a business first');
    const created = await PayrollComponentTypeService.create({ ...data, business_id: businessId });
    set({ types: [...get().types, created] });
    return created;
  },
}));
