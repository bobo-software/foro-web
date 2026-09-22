import { create } from 'zustand';
import Emp501Service from '../../services/emp501Service';
import { useBusinessStore } from './BusinessStore';
import { usePayrollEmployerSettingsStore } from './PayrollEmployerSettingsStore';
import {
  buildEmp501Csv,
  downloadEmp501Csv,
  emp501Filename,
  generateEmp501Pdf,
} from '../../utils/emp501';
import type {
  CreateEmp501Dto,
  Emp501Detail,
  Emp501Return,
  PayrollDashboard,
} from '../../types/emp501';
import type { PayrollTaxYear } from '../../types/yearEnd';

interface Emp501State {
  returns: Emp501Return[];
  current: Emp501Detail | null;
  taxYears: PayrollTaxYear[];
  dashboard: PayrollDashboard | null;
  loading: boolean;
  error: string | null;
  fetchReturns: () => Promise<void>;
  fetchTaxYears: () => Promise<void>;
  fetchDashboard: () => Promise<void>;
  fetchReturn: (id: number) => Promise<Emp501Detail | null>;
  createReturn: (data: Omit<CreateEmp501Dto, 'business_id'>) => Promise<Emp501Return>;
  recalculateReturn: (id: number) => Promise<Emp501Detail>;
  submitReturn: (id: number) => Promise<Emp501Detail>;
  downloadPdf: (id?: number) => Promise<void>;
  downloadCsv: (id?: number) => Promise<void>;
}

function replaceCurrent(set: (partial: Partial<Emp501State>) => void, get: () => Emp501State, detail: Emp501Detail) {
  const existing = get().returns;
  const has = existing.some((row) => row.id === detail.id);
  set({
    current: detail,
    returns: has
      ? existing.map((row) => (row.id === detail.id ? detail : row))
      : [detail, ...existing],
  });
}

async function loadDetail(get: () => Emp501State, id?: number): Promise<Emp501Detail> {
  if (id == null || get().current?.id === id) {
    const current = get().current;
    if (current) return current;
  }
  if (id == null) throw new Error('Load the EMP501 first');
  const detail = await Emp501Service.findById(id);
  if (!detail) throw new Error('EMP501 not found');
  return detail;
}

export const useEmp501Store = create<Emp501State>((set, get) => ({
  returns: [],
  current: null,
  taxYears: [],
  dashboard: null,
  loading: false,
  error: null,

  fetchReturns: async () => {
    const businessId = useBusinessStore.getState().currentBusiness?.id;
    set({ loading: true, error: null });
    try {
      const returns = await Emp501Service.findAll({ businessId });
      set({ returns, loading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load EMP501 returns';
      set({ error: message, loading: false });
    }
  },

  fetchTaxYears: async () => {
    try {
      const taxYears = await Emp501Service.findTaxYears();
      set({ taxYears });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load tax years';
      set({ error: message });
    }
  },

  fetchDashboard: async () => {
    const businessId = useBusinessStore.getState().currentBusiness?.id;
    if (businessId == null) {
      set({ dashboard: null });
      return;
    }
    set({ loading: true, error: null });
    try {
      const dashboard = await Emp501Service.fetchDashboard(businessId);
      set({ dashboard, loading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load payroll overview';
      set({ error: message, loading: false });
    }
  },

  fetchReturn: async (id) => {
    set({ loading: true, error: null });
    try {
      const current = await Emp501Service.findById(id);
      set({ current, loading: false });
      return current;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load EMP501';
      set({ error: message, loading: false, current: null });
      throw err;
    }
  },

  createReturn: async (data) => {
    const businessId = useBusinessStore.getState().currentBusiness?.id;
    if (businessId == null) throw new Error('Select a business first');
    const created = await Emp501Service.create({ ...data, business_id: businessId });
    set({ returns: [created, ...get().returns] });
    return created;
  },

  recalculateReturn: async (id) => {
    const detail = await Emp501Service.recalculate(id);
    replaceCurrent(set, get, detail);
    return detail;
  },

  submitReturn: async (id) => {
    const detail = await Emp501Service.submit(id);
    replaceCurrent(set, get, detail);
    return detail;
  },

  downloadPdf: async (id) => {
    const detail = await loadDetail(get, id ?? get().current?.id);
    const settingsStore = usePayrollEmployerSettingsStore.getState();
    if (!settingsStore.settings) await settingsStore.fetchSettings();
    const settings = usePayrollEmployerSettingsStore.getState().settings;
    const business = useBusinessStore.getState().currentBusiness;
    await generateEmp501Pdf(detail, settings, business);
  },

  downloadCsv: async (id) => {
    const detail = await loadDetail(get, id ?? get().current?.id);
    const settingsStore = usePayrollEmployerSettingsStore.getState();
    if (!settingsStore.settings) await settingsStore.fetchSettings();
    const settings = usePayrollEmployerSettingsStore.getState().settings;
    const business = useBusinessStore.getState().currentBusiness;
    downloadEmp501Csv(
      buildEmp501Csv(detail, settings, business),
      emp501Filename(detail.tax_year_code, detail.period_type, 'csv'),
    );
  },
}));
