import { create } from 'zustand';
import PayRunService from '../../services/payRunService';
import EmployeeService from '../../services/employeeService';
import { useBusinessStore } from './BusinessStore';
import { usePayrollEmployerSettingsStore } from './PayrollEmployerSettingsStore';
import { buildPayslipModel, generatePayslipPdf } from '../../utils/payslipPdf';
import { downloadPayRunCsv } from '../../utils/payRunCsv';
import type { CreatePayRunDto, PayRun, PayRunDetail } from '../../types/payRun';

interface PayRunState {
  payRuns: PayRun[];
  current: PayRunDetail | null;
  loading: boolean;
  error: string | null;
  fetchPayRuns: () => Promise<void>;
  fetchPayRun: (id: number) => Promise<PayRunDetail | null>;
  createPayRun: (data: Omit<CreatePayRunDto, 'business_id'>) => Promise<PayRun>;
  calculatePayRun: (id: number) => Promise<PayRunDetail>;
  sendBackPayRun: (id: number) => Promise<PayRunDetail>;
  approvePayRun: (id: number) => Promise<PayRunDetail>;
  payPayRun: (id: number) => Promise<PayRunDetail>;
  cancelPayRun: (id: number) => Promise<PayRunDetail>;
  addOnceOff: (id: number, data: { employeeId: number; componentTypeId: number; amount: number }) => Promise<void>;
  removeOnceOff: (id: number, itemId: number) => Promise<void>;
  downloadPayslip: (lineId: number) => Promise<void>;
  downloadAllPayslips: () => Promise<void>;
  downloadCsv: () => Promise<void>;
}

function replaceCurrent(set: (partial: Partial<PayRunState>) => void, get: () => PayRunState, detail: PayRunDetail) {
  const existing = get().payRuns;
  const has = existing.some((row) => row.id === detail.id);
  set({
    current: detail,
    payRuns: has
      ? existing.map((row) => (row.id === detail.id ? detail : row))
      : [detail, ...existing],
  });
}

export const usePayRunStore = create<PayRunState>((set, get) => ({
  payRuns: [],
  current: null,
  loading: false,
  error: null,

  fetchPayRuns: async () => {
    const businessId = useBusinessStore.getState().currentBusiness?.id;
    set({ loading: true, error: null });
    try {
      const payRuns = await PayRunService.findAll({ businessId });
      set({ payRuns, loading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load pay runs';
      set({ error: message, loading: false });
    }
  },

  fetchPayRun: async (id) => {
    set({ loading: true, error: null });
    try {
      const current = await PayRunService.findById(id);
      set({ current, loading: false });
      return current;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load pay run';
      set({ error: message, loading: false, current: null });
      throw err;
    }
  },

  createPayRun: async (data) => {
    const businessId = useBusinessStore.getState().currentBusiness?.id;
    if (businessId == null) throw new Error('Select a business first');
    const created = await PayRunService.create({ ...data, business_id: businessId });
    set({ payRuns: [created, ...get().payRuns] });
    return created;
  },

  calculatePayRun: async (id) => {
    const detail = await PayRunService.calculate(id);
    replaceCurrent(set, get, detail);
    return detail;
  },

  sendBackPayRun: async (id) => {
    const detail = await PayRunService.sendBack(id);
    replaceCurrent(set, get, detail);
    return detail;
  },

  approvePayRun: async (id) => {
    const detail = await PayRunService.approve(id);
    replaceCurrent(set, get, detail);
    return detail;
  },

  payPayRun: async (id) => {
    const detail = await PayRunService.pay(id);
    replaceCurrent(set, get, detail);
    return detail;
  },

  cancelPayRun: async (id) => {
    const detail = await PayRunService.cancel(id);
    replaceCurrent(set, get, detail);
    return detail;
  },

  addOnceOff: async (id, data) => {
    await PayRunService.addOnceOff(id, data);
    await get().fetchPayRun(id);
  },

  removeOnceOff: async (id, itemId) => {
    await PayRunService.removeOnceOff(id, itemId);
    await get().fetchPayRun(id);
  },

  downloadPayslip: async (lineId) => {
    const run = get().current;
    if (!run) throw new Error('Load the pay run first');
    const line = run.lines.find((row) => row.id === lineId);
    if (!line) throw new Error('Employee line not found');
    const employee = await EmployeeService.findById(line.employee_id);
    const settingsStore = usePayrollEmployerSettingsStore.getState();
    if (!settingsStore.settings) {
      await settingsStore.fetchSettings();
    }
    const settings = usePayrollEmployerSettingsStore.getState().settings;
    const business = useBusinessStore.getState().currentBusiness;
    const model = buildPayslipModel({ run, line, employee, settings, business });
    await generatePayslipPdf(model, business);
  },

  downloadAllPayslips: async () => {
    const run = get().current;
    if (!run) throw new Error('Load the pay run first');
    for (const line of run.lines) {
      await get().downloadPayslip(line.id);
    }
  },

  downloadCsv: async () => {
    const run = get().current;
    if (!run) throw new Error('Load the pay run first');
    downloadPayRunCsv(run);
  },
}));
