import { create } from 'zustand';
import EmployeeService from '../../services/employeeService';
import { useBusinessStore } from './BusinessStore';
import type { Employee } from '../../types/employee';

interface EmployeeState {
  employees: Employee[];
  loading: boolean;
  error: string | null;
  fetchEmployees: () => Promise<void>;
  upsertEmployee: (employee: Employee) => void;
  removeEmployee: (id: number) => Promise<void>;
}

export const useEmployeeStore = create<EmployeeState>((set, get) => ({
  employees: [],
  loading: false,
  error: null,

  fetchEmployees: async () => {
    const businessId = useBusinessStore.getState().currentBusiness?.id;
    const where = businessId != null ? { businessId } : undefined;
    set({ loading: true, error: null });
    try {
      const data = await EmployeeService.findAll({ where });
      set({ employees: data, loading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load employees';
      set({ error: message, loading: false });
      console.error('Failed to load employees:', err);
    }
  },

  upsertEmployee: (employee) => {
    if (employee.id == null) return;
    const existing = get().employees;
    const has = existing.some((row) => row.id === employee.id);
    set({
      employees: has
        ? existing.map((row) => (row.id === employee.id ? employee : row))
        : [...existing, employee],
    });
  },

  removeEmployee: async (id: number) => {
    await EmployeeService.delete(id);
    set({ employees: get().employees.filter((row) => row.id !== id) });
  },
}));
