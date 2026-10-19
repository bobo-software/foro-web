import { create } from 'zustand';
import CompanyService from '../../services/companyService';
import type { Business } from '../../types/business';

interface BusinessState {
  currentBusiness: Business | null;
  businesses: Business[];
  activeBusinessId: number | null;
  loading: boolean;
  error: string | null;
  fetchUserBusinesses: (userId: number) => Promise<void>;
  setCurrentBusiness: (business: Business | null) => void;
  setCurrentBusinessById: (businessId: number) => void;
}

const ACTIVE_BUSINESS_STORAGE_KEY = 'foro.activeBusinessId';

function readPersistedActiveBusinessId(): number | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(ACTIVE_BUSINESS_STORAGE_KEY);
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function persistActiveBusinessId(businessId: number | null) {
  if (typeof window === 'undefined') return;
  if (businessId == null) {
    window.localStorage.removeItem(ACTIVE_BUSINESS_STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(ACTIVE_BUSINESS_STORAGE_KEY, String(businessId));
}

export const useBusinessStore = create<BusinessState>((set) => ({
  currentBusiness: null,
  businesses: [],
  activeBusinessId: readPersistedActiveBusinessId(),
  // Starts true so pages don't render "no business" / unscoped data before the first fetch lands.
  loading: true,
  error: null,

  fetchUserBusinesses: async (userId: number) => {
    set({ loading: true, error: null });
    try {
      const businesses = (await CompanyService.getAccessibleCompaniesForUser(userId)) as Business[];
      const persistedId = readPersistedActiveBusinessId();
      const initialBusiness =
        businesses.find((b) => b.id != null && b.id === persistedId) || businesses[0] || null;
      persistActiveBusinessId(initialBusiness?.id ?? null);
      set({
        businesses,
        currentBusiness: initialBusiness,
        activeBusinessId: initialBusiness?.id ?? null,
        loading: false,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load businesses';
      set({ error: message, loading: false, businesses: [], currentBusiness: null, activeBusinessId: null });
      persistActiveBusinessId(null);
      console.error('Failed to load businesses:', err);
    }
  },

  setCurrentBusiness: (business: Business | null) => {
    const nextId = business?.id ?? null;
    persistActiveBusinessId(nextId);
    set({ currentBusiness: business, activeBusinessId: nextId });
  },

  setCurrentBusinessById: (businessId: number) => {
    set((state) => {
      const selected = state.businesses.find((business) => business.id === businessId) || null;
      if (!selected) return state;
      persistActiveBusinessId(businessId);
      return {
        ...state,
        currentBusiness: selected,
        activeBusinessId: businessId,
      };
    });
  },
}));
