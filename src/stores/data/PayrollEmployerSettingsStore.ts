import { create } from 'zustand';
import PayrollEmployerSettingsService from '../../services/payrollEmployerSettingsService';
import { useBusinessStore } from './BusinessStore';
import type { CreatePayrollEmployerSettingsDto, PayrollEmployerSettings } from '../../types/employee';

interface PayrollEmployerSettingsState {
  settings: PayrollEmployerSettings | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  fetchSettings: () => Promise<void>;
  saveSettings: (data: Omit<CreatePayrollEmployerSettingsDto, 'business_id'>) => Promise<PayrollEmployerSettings>;
}

export const usePayrollEmployerSettingsStore = create<PayrollEmployerSettingsState>((set) => ({
  settings: null,
  loading: false,
  saving: false,
  error: null,

  fetchSettings: async () => {
    const businessId = useBusinessStore.getState().currentBusiness?.id;
    if (businessId == null) {
      set({ settings: null, loading: false, error: null });
      return;
    }
    set({ loading: true, error: null });
    try {
      const settings = await PayrollEmployerSettingsService.findForBusiness(businessId);
      set({ settings, loading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load employer settings';
      set({ error: message, loading: false });
    }
  },

  saveSettings: async (data) => {
    const businessId = useBusinessStore.getState().currentBusiness?.id;
    if (businessId == null) {
      throw new Error('Select a business first');
    }
    set({ saving: true, error: null });
    try {
      const settings = await PayrollEmployerSettingsService.upsert({
        ...data,
        business_id: businessId,
      });
      set({ settings, saving: false });
      return settings;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save employer settings';
      set({ error: message, saving: false });
      throw err;
    }
  },
}));
