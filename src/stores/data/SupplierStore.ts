import { create } from 'zustand';
import SupplierService from '../../services/supplierService';
import { useBusinessStore } from './BusinessStore';
import type { Supplier } from '../../types/supplier';

interface SupplierState {
  suppliers: Supplier[];
  loading: boolean;
  error: string | null;
  fetchSuppliers: () => Promise<void>;
  removeSupplier: (id: number) => Promise<void>;
}

export const useSupplierStore = create<SupplierState>((set, get) => ({
  suppliers: [],
  loading: false,
  error: null,

  fetchSuppliers: async () => {
    const businessId = useBusinessStore.getState().currentBusiness?.id;
    const where = businessId != null ? { businessId } : undefined;
    set({ loading: true, error: null });
    try {
      const data = await SupplierService.findAll({ where });
      set({ suppliers: data, loading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load suppliers';
      set({ error: message, loading: false });
      console.error('Failed to load suppliers:', err);
    }
  },

  removeSupplier: async (id: number) => {
    await SupplierService.delete(id);
    set({ suppliers: get().suppliers.filter((s) => s.id !== id) });
  },
}));
