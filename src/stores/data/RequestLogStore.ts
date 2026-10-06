import { create } from 'zustand';
import {
  requestLogService,
  type RequestLogDetail,
  type RequestLogFilters,
  type RequestLogRow,
} from '../../services/requestLogService';

interface RequestLogState {
  rows: RequestLogRow[];
  total: number;
  loading: boolean;
  error: string | null;
  detail: RequestLogDetail | null;
  detailLoading: boolean;
  detailError: string | null;
  fetchLogs: (filters: RequestLogFilters) => Promise<void>;
  fetchDetail: (id: number) => Promise<void>;
  clearDetail: () => void;
}

let listSeq = 0;
let detailSeq = 0;

export const useRequestLogStore = create<RequestLogState>((set) => ({
  rows: [],
  total: 0,
  loading: false,
  error: null,
  detail: null,
  detailLoading: false,
  detailError: null,

  fetchLogs: async (filters) => {
    const seq = ++listSeq;
    set({ loading: true, error: null });
    try {
      const res = await requestLogService.list(filters);
      if (seq !== listSeq) return;
      set({ rows: res.rows, total: res.total, loading: false });
    } catch (err) {
      if (seq !== listSeq) return;
      const message = err instanceof Error ? err.message : 'Failed to load request logs';
      set({ error: message, loading: false });
    }
  },

  fetchDetail: async (id) => {
    const seq = ++detailSeq;
    set({ detailLoading: true, detailError: null, detail: null });
    try {
      const detail = await requestLogService.get(id);
      if (seq !== detailSeq) return;
      set({ detail, detailLoading: false });
    } catch (err) {
      if (seq !== detailSeq) return;
      const message = err instanceof Error ? err.message : 'Failed to load request details';
      set({ detailError: message, detailLoading: false });
    }
  },

  clearDetail: () => {
    detailSeq += 1;
    set({ detail: null, detailLoading: false, detailError: null });
  },
}));
