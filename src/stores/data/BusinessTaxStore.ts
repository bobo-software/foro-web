import { create } from 'zustand';
import BusinessTaxService, { sortTaxReturns } from '../../services/businessTaxService';
import { useBusinessStore } from './BusinessStore';
import type {
  BusinessTaxEstimate,
  BusinessTaxProfile,
  SaveBusinessTaxProfileDto,
  SaveTaxReturnAdjustmentDto,
  TaxReturn,
  TaxReturnKind,
  TaxReturnMonthlyTotals,
  UpdateTaxReturnDto,
} from '../../types/businessTax';
import { downloadCsvFile } from '../../utils/csvDownload';
import {
  buildTaxReturnCsv,
  generateTaxReturnPdf,
  taxReturnFilename,
  type TaxExportContext,
} from '../../utils/taxReturnExport';

interface BusinessTaxState {
  profile: BusinessTaxProfile | null;
  profileLoading: boolean;
  saving: boolean;
  estimate: BusinessTaxEstimate | null;
  estimateLoading: boolean;
  returns: TaxReturn[];
  returnsLoading: boolean;
  currentReturn: TaxReturn | null;
  returnLoading: boolean;
  returnBusy: boolean;
  error: string | null;
  fetchProfile: () => Promise<void>;
  saveProfile: (data: SaveBusinessTaxProfileDto) => Promise<BusinessTaxProfile>;
  fetchEstimate: (taxYear?: string) => Promise<void>;
  fetchReturns: () => Promise<void>;
  fetchReturn: (id: number) => Promise<void>;
  createReturn: (kind: TaxReturnKind, taxYear: string) => Promise<TaxReturn>;
  updateReturn: (id: number, data: UpdateTaxReturnDto) => Promise<void>;
  recalculateReturn: (id: number) => Promise<void>;
  submitReturn: (id: number) => Promise<void>;
  deleteReturn: (id: number) => Promise<void>;
  addAdjustment: (returnId: number, data: SaveTaxReturnAdjustmentDto) => Promise<void>;
  updateAdjustment: (returnId: number, adjustmentId: number, data: SaveTaxReturnAdjustmentDto) => Promise<void>;
  deleteAdjustment: (returnId: number, adjustmentId: number) => Promise<void>;
  exporting: boolean;
  downloadReturnPdf: () => Promise<void>;
  downloadReturnCsv: () => Promise<void>;
}

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

function upsertReturn(list: TaxReturn[], row: TaxReturn): TaxReturn[] {
  return sortTaxReturns([row, ...list.filter((item) => item.id !== row.id)]);
}

export const useBusinessTaxStore = create<BusinessTaxState>((set, get) => {
  /** Runs a draft-return action, keeping the list and the open return in sync. */
  async function runReturnAction(action: () => Promise<TaxReturn>, fallback: string): Promise<void> {
    set({ returnBusy: true, error: null });
    try {
      const row = await action();
      set({ currentReturn: row, returns: upsertReturn(get().returns, row), returnBusy: false });
    } catch (err) {
      set({ error: errorMessage(err, fallback), returnBusy: false });
      throw err;
    }
  }

  /** Loads what an export needs (monthly totals, tax reference) for the open return. */
  async function runExport(
    write: (taxReturn: TaxReturn, monthly: TaxReturnMonthlyTotals, context: TaxExportContext) => Promise<void> | void,
  ): Promise<void> {
    const taxReturn = get().currentReturn;
    if (!taxReturn) throw new Error('Open a tax return first');
    set({ exporting: true });
    try {
      if (!get().profile) await get().fetchProfile();
      const monthly = await BusinessTaxService.getMonthlyTotals(taxReturn.id);
      await write(taxReturn, monthly, {
        business: useBusinessStore.getState().currentBusiness,
        taxReference: get().profile?.tax_reference,
      });
    } finally {
      set({ exporting: false });
    }
  }

  return {
    profile: null,
    profileLoading: false,
    saving: false,
    estimate: null,
    estimateLoading: false,
    returns: [],
    returnsLoading: false,
    currentReturn: null,
    returnLoading: false,
    returnBusy: false,
    error: null,

    fetchProfile: async () => {
      const businessId = useBusinessStore.getState().currentBusiness?.id;
      if (businessId == null) {
        set({ profile: null, profileLoading: false, error: null });
        return;
      }
      set({ profileLoading: true, error: null });
      try {
        const profile = await BusinessTaxService.findProfile(businessId);
        set({ profile, profileLoading: false });
      } catch (err) {
        set({ error: errorMessage(err, 'Failed to load the tax profile'), profileLoading: false });
      }
    },

    saveProfile: async (data) => {
      const businessId = useBusinessStore.getState().currentBusiness?.id;
      if (businessId == null) throw new Error('Select a business first');
      set({ saving: true, error: null });
      try {
        const profile = await BusinessTaxService.saveProfile(businessId, data);
        set({ profile, saving: false, estimate: null });
        return profile;
      } catch (err) {
        set({ error: errorMessage(err, 'Failed to save the tax profile'), saving: false });
        throw err;
      }
    },

    fetchEstimate: async (taxYear) => {
      const businessId = useBusinessStore.getState().currentBusiness?.id;
      if (businessId == null) {
        set({ estimate: null, estimateLoading: false, error: null });
        return;
      }
      set({ estimateLoading: true, error: null });
      try {
        const estimate = await BusinessTaxService.getEstimate(businessId, taxYear);
        set({ estimate, estimateLoading: false });
      } catch (err) {
        set({ error: errorMessage(err, 'Failed to load the tax estimate'), estimateLoading: false });
      }
    },

    fetchReturns: async () => {
      const businessId = useBusinessStore.getState().currentBusiness?.id;
      if (businessId == null) {
        set({ returns: [], returnsLoading: false, error: null });
        return;
      }
      set({ returnsLoading: true, error: null });
      try {
        const returns = await BusinessTaxService.listReturns(businessId);
        set({ returns, returnsLoading: false });
      } catch (err) {
        set({ error: errorMessage(err, 'Failed to load tax returns'), returnsLoading: false });
      }
    },

    fetchReturn: async (id) => {
      set({ returnLoading: true, error: null, currentReturn: get().currentReturn?.id === id ? get().currentReturn : null });
      try {
        const row = await BusinessTaxService.getReturn(id);
        set({ currentReturn: row, returnLoading: false });
      } catch (err) {
        set({ error: errorMessage(err, 'Failed to load the tax return'), returnLoading: false });
      }
    },

    createReturn: async (kind, taxYear) => {
      const businessId = useBusinessStore.getState().currentBusiness?.id;
      if (businessId == null) throw new Error('Select a business first');
      set({ returnBusy: true, error: null });
      try {
        const row = await BusinessTaxService.createReturn(businessId, kind, taxYear);
        set({ returns: upsertReturn(get().returns, row), returnBusy: false });
        return row;
      } catch (err) {
        set({ error: errorMessage(err, 'Failed to create the tax return'), returnBusy: false });
        throw err;
      }
    },

    updateReturn: (id, data) =>
      runReturnAction(() => BusinessTaxService.updateReturn(id, data), 'Failed to save the tax return'),

    recalculateReturn: (id) =>
      runReturnAction(() => BusinessTaxService.recalculateReturn(id), 'Failed to recalculate the tax return'),

    submitReturn: (id) =>
      runReturnAction(() => BusinessTaxService.submitReturn(id), 'Failed to submit the tax return'),

    deleteReturn: async (id) => {
      set({ returnBusy: true, error: null });
      try {
        await BusinessTaxService.deleteReturn(id);
        set({
          returns: get().returns.filter((row) => row.id !== id),
          currentReturn: get().currentReturn?.id === id ? null : get().currentReturn,
          returnBusy: false,
        });
      } catch (err) {
        set({ error: errorMessage(err, 'Failed to delete the tax return'), returnBusy: false });
        throw err;
      }
    },

    addAdjustment: (returnId, data) =>
      runReturnAction(() => BusinessTaxService.addAdjustment(returnId, data), 'Failed to add the adjustment'),

    updateAdjustment: (returnId, adjustmentId, data) =>
      runReturnAction(
        () => BusinessTaxService.updateAdjustment(returnId, adjustmentId, data),
        'Failed to save the adjustment',
      ),

    deleteAdjustment: (returnId, adjustmentId) =>
      runReturnAction(
        () => BusinessTaxService.deleteAdjustment(returnId, adjustmentId),
        'Failed to remove the adjustment',
      ),

    exporting: false,

    downloadReturnPdf: () => runExport(generateTaxReturnPdf),

    downloadReturnCsv: () =>
      runExport((taxReturn, monthly, context) =>
        downloadCsvFile(taxReturnFilename(taxReturn, 'csv'), buildTaxReturnCsv(taxReturn, monthly, context)),
      ),
  };
});
