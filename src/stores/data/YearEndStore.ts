import { create } from 'zustand';
import YearEndService from '../../services/yearEndService';
import { useBusinessStore } from './BusinessStore';
import { usePayrollEmployerSettingsStore } from './PayrollEmployerSettingsStore';
import { generateYearEndPdf } from '../../utils/yearEndPdf';
import type { CreateYearEndBatchDto, PayrollTaxYear, YearEndBatch, YearEndBatchDetail } from '../../types/yearEnd';

interface YearEndState {
  batches: YearEndBatch[];
  current: YearEndBatchDetail | null;
  taxYears: PayrollTaxYear[];
  loading: boolean;
  error: string | null;
  fetchBatches: () => Promise<void>;
  fetchTaxYears: () => Promise<void>;
  fetchBatch: (id: number) => Promise<YearEndBatchDetail | null>;
  createBatch: (data: Omit<CreateYearEndBatchDto, 'business_id'>) => Promise<YearEndBatch>;
  recalculateBatch: (id: number) => Promise<YearEndBatchDetail>;
  issueBatch: (id: number) => Promise<YearEndBatchDetail>;
  downloadCertificate: (certificateId: number) => Promise<void>;
  downloadAll: () => Promise<void>;
}

function replaceCurrent(set: (partial: Partial<YearEndState>) => void, get: () => YearEndState, detail: YearEndBatchDetail) {
  const existing = get().batches;
  const has = existing.some((row) => row.id === detail.id);
  set({
    current: detail,
    batches: has
      ? existing.map((row) => (row.id === detail.id ? detail : row))
      : [detail, ...existing],
  });
}

export const useYearEndStore = create<YearEndState>((set, get) => ({
  batches: [],
  current: null,
  taxYears: [],
  loading: false,
  error: null,

  fetchBatches: async () => {
    const businessId = useBusinessStore.getState().currentBusiness?.id;
    set({ loading: true, error: null });
    try {
      const batches = await YearEndService.findAll({ businessId });
      set({ batches, loading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load year-end batches';
      set({ error: message, loading: false });
    }
  },

  fetchTaxYears: async () => {
    try {
      const taxYears = await YearEndService.findTaxYears();
      set({ taxYears });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load tax years';
      set({ error: message });
    }
  },

  fetchBatch: async (id) => {
    set({ loading: true, error: null });
    try {
      const current = await YearEndService.findById(id);
      set({ current, loading: false });
      return current;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load year-end batch';
      set({ error: message, loading: false, current: null });
      throw err;
    }
  },

  createBatch: async (data) => {
    const businessId = useBusinessStore.getState().currentBusiness?.id;
    if (businessId == null) throw new Error('Select a business first');
    const created = await YearEndService.create({ ...data, business_id: businessId });
    set({ batches: [created, ...get().batches] });
    return created;
  },

  recalculateBatch: async (id) => {
    const detail = await YearEndService.recalculate(id);
    replaceCurrent(set, get, detail);
    return detail;
  },

  issueBatch: async (id) => {
    const detail = await YearEndService.issue(id);
    replaceCurrent(set, get, detail);
    return detail;
  },

  downloadCertificate: async (certificateId) => {
    const batch = get().current;
    if (!batch) throw new Error('Load the year-end batch first');
    const certificate = batch.certificates.find((row) => row.id === certificateId);
    if (!certificate) throw new Error('Certificate not found');
    const settingsStore = usePayrollEmployerSettingsStore.getState();
    if (!settingsStore.settings) await settingsStore.fetchSettings();
    const settings = usePayrollEmployerSettingsStore.getState().settings;
    const business = useBusinessStore.getState().currentBusiness;
    await generateYearEndPdf(batch, certificate, settings, business);
  },

  downloadAll: async () => {
    const batch = get().current;
    if (!batch) throw new Error('Load the year-end batch first');
    for (const certificate of batch.certificates) {
      await get().downloadCertificate(certificate.id);
    }
  },
}));
