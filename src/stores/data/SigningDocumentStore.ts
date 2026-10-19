import { create } from 'zustand';
import SigningDocumentService from '../../services/signingDocumentService';
import { useBusinessStore } from './BusinessStore';
import type { SigningDocument } from '../../types/signingDocument';

interface SigningDocumentState {
  documents: SigningDocument[];
  loading: boolean;
  error: string | null;
  fetchDocuments: (params?: { status?: string }) => Promise<void>;
  removeDocument: (id: number) => Promise<void>;
  /** Replace (or prepend) a row after a create/update/action on the detail page. */
  upsertDocument: (doc: SigningDocument) => void;
}

export const useSigningDocumentStore = create<SigningDocumentState>((set, get) => ({
  documents: [],
  loading: false,
  error: null,

  fetchDocuments: async (params) => {
    const businessId = useBusinessStore.getState().currentBusiness?.id;
    set({ loading: true, error: null });
    try {
      const data = await SigningDocumentService.findAll({ businessId, status: params?.status });
      set({ documents: data, loading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load documents';
      set({ error: message, loading: false, documents: [] });
      console.error('Failed to load signing documents:', err);
    }
  },

  removeDocument: async (id) => {
    await SigningDocumentService.delete(id);
    set({ documents: get().documents.filter((d) => d.id !== id) });
  },

  upsertDocument: (doc) => {
    const others = get().documents.filter((d) => d.id !== doc.id);
    set({ documents: [doc, ...others] });
  },
}));
