import { create } from 'zustand';
import KnownCompanyService from '../../services/knownCompanyService';
import type { KnownCompany } from '../../types/knownCompany';

interface KnownCompanyState {
  knownCompanies: KnownCompany[];
  loading: boolean;
  error: string | null;
  fetchKnownCompanies: (force?: boolean) => Promise<void>;
  /** Superadmin list (includes inactive). */
  fetchAllKnownCompanies: () => Promise<void>;
  upsertLocal: (row: KnownCompany) => void;
}

export const useKnownCompanyStore = create<KnownCompanyState>((set, get) => ({
  knownCompanies: [],
  loading: false,
  error: null,

  fetchKnownCompanies: async (force = false) => {
    if (!force && get().knownCompanies.length > 0) return;
    set({ loading: true, error: null });
    try {
      const data = await KnownCompanyService.findActive();
      set({ knownCompanies: data, loading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load known companies';
      set({ error: message, loading: false });
      console.error('Failed to load known companies:', err);
    }
  },

  fetchAllKnownCompanies: async () => {
    set({ loading: true, error: null });
    try {
      const data = await KnownCompanyService.findAllAdmin();
      set({ knownCompanies: data, loading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load known companies';
      set({ error: message, loading: false });
      console.error('Failed to load known companies:', err);
    }
  },

  upsertLocal: (row) => {
    set((state) => {
      const idx = state.knownCompanies.findIndex((c) => c.id === row.id);
      if (idx < 0) {
        return {
          knownCompanies: [...state.knownCompanies, row].sort((a, b) =>
            a.name.localeCompare(b.name),
          ),
        };
      }
      const next = [...state.knownCompanies];
      next[idx] = row;
      return { knownCompanies: next.sort((a, b) => a.name.localeCompare(b.name)) };
    });
  },
}));
