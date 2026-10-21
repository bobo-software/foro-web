import { create } from 'zustand';
import ReceivedDocumentsService, {
  type ReceivedDocumentKind,
  type ReceivedDocumentSummary,
} from '../../services/receivedDocumentsService';
import { useBusinessStore } from './BusinessStore';

interface ReceivedDocumentsState {
  documents: ReceivedDocumentSummary[];
  loading: boolean;
  error: string | null;
  /** Documents every linked Foro business has sent the current business. */
  fetchAll: (kind?: ReceivedDocumentKind) => Promise<void>;
}

export const useReceivedDocumentsStore = create<ReceivedDocumentsState>((set) => ({
  documents: [],
  loading: false,
  error: null,

  fetchAll: async (kind) => {
    const businessId = useBusinessStore.getState().currentBusiness?.id;
    if (businessId == null) {
      set({ documents: [], loading: false, error: null });
      return;
    }
    set({ loading: true, error: null });
    try {
      set({ documents: await ReceivedDocumentsService.listAll(businessId, kind), loading: false });
    } catch (err) {
      set({
        documents: [],
        loading: false,
        error: err instanceof Error ? err.message : 'Could not load received documents',
      });
    }
  },
}));
