import { create } from 'zustand';
import Emp201Service from '../../services/emp201Service';
import { useBusinessStore } from './BusinessStore';
import { usePayrollEmployerSettingsStore } from './PayrollEmployerSettingsStore';
import { buildEmp201Csv, downloadEmp201Csv, emp201Filename, generateEmp201Pdf } from '../../utils/emp201';
import type { CreateEmp201Dto, Emp201Detail, Emp201Return } from '../../types/emp201';

interface Emp201State {
  returns: Emp201Return[];
  current: Emp201Detail | null;
  loading: boolean;
  error: string | null;
  fetchReturns: () => Promise<void>;
  fetchReturn: (id: number) => Promise<Emp201Detail | null>;
  createReturn: (data: Omit<CreateEmp201Dto, 'business_id'>) => Promise<Emp201Return>;
  recalculateReturn: (id: number) => Promise<Emp201Detail>;
  submitReturn: (id: number) => Promise<Emp201Detail>;
  downloadPdf: (id?: number) => Promise<void>;
  downloadCsv: (id?: number) => Promise<void>;
}

function replaceCurrent(set: (partial: Partial<Emp201State>) => void, get: () => Emp201State, detail: Emp201Detail) {
  const existing = get().returns;
  const has = existing.some((row) => row.id === detail.id);
  set({
    current: detail,
    returns: has
      ? existing.map((row) => (row.id === detail.id ? detail : row))
      : [detail, ...existing],
  });
}

async function loadDetail(get: () => Emp201State, id?: number): Promise<Emp201Detail> {
  if (id == null || get().current?.id === id) {
    const current = get().current;
    if (current) return current;
  }
  if (id == null) throw new Error('Load the EMP201 first');
  const detail = await Emp201Service.findById(id);
  if (!detail) throw new Error('EMP201 not found');
  return detail;
}

export const useEmp201Store = create<Emp201State>((set, get) => ({
  returns: [],
  current: null,
  loading: false,
  error: null,

  fetchReturns: async () => {
    const businessId = useBusinessStore.getState().currentBusiness?.id;
    set({ loading: true, error: null });
    try {
      const returns = await Emp201Service.findAll({ businessId });
      set({ returns, loading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load EMP201 returns';
      set({ error: message, loading: false });
    }
  },

  fetchReturn: async (id) => {
    set({ loading: true, error: null });
    try {
      const current = await Emp201Service.findById(id);
      set({ current, loading: false });
      return current;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load EMP201';
      set({ error: message, loading: false, current: null });
      throw err;
    }
  },

  createReturn: async (data) => {
    const businessId = useBusinessStore.getState().currentBusiness?.id;
    if (businessId == null) throw new Error('Select a business first');
    const created = await Emp201Service.create({ ...data, business_id: businessId });
    set({ returns: [created, ...get().returns] });
    return created;
  },

  recalculateReturn: async (id) => {
    const detail = await Emp201Service.recalculate(id);
    replaceCurrent(set, get, detail);
    return detail;
  },

  submitReturn: async (id) => {
    const detail = await Emp201Service.submit(id);
    replaceCurrent(set, get, detail);
    return detail;
  },

  downloadPdf: async (id) => {
    const detail = await loadDetail(get, id ?? get().current?.id);
    const settingsStore = usePayrollEmployerSettingsStore.getState();
    if (!settingsStore.settings) await settingsStore.fetchSettings();
    const settings = usePayrollEmployerSettingsStore.getState().settings;
    const business = useBusinessStore.getState().currentBusiness;
    await generateEmp201Pdf(detail, settings, business);
  },

  downloadCsv: async (id) => {
    const detail = await loadDetail(get, id ?? get().current?.id);
    const settingsStore = usePayrollEmployerSettingsStore.getState();
    if (!settingsStore.settings) await settingsStore.fetchSettings();
    const settings = usePayrollEmployerSettingsStore.getState().settings;
    const business = useBusinessStore.getState().currentBusiness;
    downloadEmp201Csv(
      buildEmp201Csv(detail, settings, business),
      emp201Filename(detail.period_year, detail.period_month, 'csv'),
    );
  },
}));
