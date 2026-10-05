import { create } from 'zustand';
import ExpenseService from '../../services/expenseService';
import { useBusinessStore } from './BusinessStore';
import type { CreateExpenseDto, Expense } from '../../types/expense';

interface ExpenseState {
  expenses: Expense[];
  loading: boolean;
  error: string | null;
  fetchExpenses: (category?: string) => Promise<void>;
  getExpense: (id: number) => Promise<Expense | null>;
  createExpense: (data: CreateExpenseDto) => Promise<Expense>;
  updateExpense: (id: number, data: Partial<CreateExpenseDto>) => Promise<Expense>;
  removeExpense: (id: number) => Promise<void>;
}

export const useExpenseStore = create<ExpenseState>((set, get) => ({
  expenses: [],
  loading: false,
  error: null,

  fetchExpenses: async (category) => {
    const businessId = useBusinessStore.getState().currentBusiness?.id;
    set({ loading: true, error: null });
    try {
      const data = await ExpenseService.findAll({
        where: {
          ...(businessId != null && { business_id: businessId }),
          ...(category && category !== 'all' && { category }),
        },
      });
      set({ expenses: data, loading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load expenses';
      set({ error: message, loading: false, expenses: [] });
      console.error('Failed to load expenses:', err);
    }
  },

  getExpense: async (id) => {
    const cached = get().expenses.find((row) => row.id === id);
    if (cached) return cached;
    return ExpenseService.findById(id);
  },

  createExpense: async (data) => {
    const created = await ExpenseService.create(data);
    if (created.id != null) {
      set({ expenses: [created, ...get().expenses.filter((row) => row.id !== created.id)] });
    }
    return created;
  },

  updateExpense: async (id, data) => {
    const updated = await ExpenseService.update(id, data);
    set({
      expenses: get().expenses.map((row) => (row.id === id ? updated : row)),
    });
    return updated;
  },

  removeExpense: async (id) => {
    await ExpenseService.delete(id);
    set({ expenses: get().expenses.filter((row) => row.id !== id) });
  },
}));
