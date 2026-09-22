import { create } from 'zustand';
import EmployeeRecurringComponentService from '../../services/employeeRecurringComponentService';
import type {
  CreateEmployeeRecurringComponentDto,
  EmployeeRecurringComponent,
} from '../../types/payrollPackage';

interface EmployeeRecurringComponentState {
  lines: EmployeeRecurringComponent[];
  loading: boolean;
  error: string | null;
  fetchLines: (employeeId: number) => Promise<void>;
  addLine: (data: CreateEmployeeRecurringComponentDto) => Promise<EmployeeRecurringComponent>;
  updateLine: (
    id: number,
    data: Partial<CreateEmployeeRecurringComponentDto>,
  ) => Promise<EmployeeRecurringComponent>;
  removeLine: (id: number) => Promise<void>;
}

export const useEmployeeRecurringComponentStore = create<EmployeeRecurringComponentState>((set, get) => ({
  lines: [],
  loading: false,
  error: null,

  fetchLines: async (employeeId) => {
    set({ loading: true, error: null });
    try {
      const lines = await EmployeeRecurringComponentService.findByEmployeeId(employeeId);
      set({ lines, loading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load pay package';
      set({ error: message, loading: false });
    }
  },

  addLine: async (data) => {
    const created = await EmployeeRecurringComponentService.create(data);
    set({ lines: [...get().lines, created] });
    return created;
  },

  updateLine: async (id, data) => {
    const updated = await EmployeeRecurringComponentService.update(id, data);
    set({
      lines: get().lines.map((row) => (row.id === id ? updated : row)),
    });
    return updated;
  },

  removeLine: async (id) => {
    await EmployeeRecurringComponentService.delete(id);
    set({ lines: get().lines.filter((row) => row.id !== id) });
  },
}));
