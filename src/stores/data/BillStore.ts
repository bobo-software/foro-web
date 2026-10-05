import { create } from 'zustand';
import { BillPaymentService, BillService } from '../../services/billService';
import { useBusinessStore } from './BusinessStore';
import { useSupplierStore } from './SupplierStore';
import type { Bill, BillPayment, CreateBillPaymentDto, RecordExpenseDto, RecordExpenseResult } from '../../types/purchase';
import { isRecurrenceInterval } from '../../utils/recurrence';

interface BillState {
  bills: Bill[];
  loading: boolean;
  error: string | null;
  fetchBills: () => Promise<void>;
  recordExpense: (data: RecordExpenseDto) => Promise<RecordExpenseResult>;
  recordPayment: (data: CreateBillPaymentDto) => Promise<BillPayment>;
}

export const useBillStore = create<BillState>((set, get) => ({
  bills: [],
  loading: false,
  error: null,

  fetchBills: async () => {
    const businessId = useBusinessStore.getState().currentBusiness?.id;
    set({ loading: true, error: null });
    try {
      const data = await BillService.findAll({
        where: businessId != null ? { business_id: businessId } : undefined,
      });
      set({ bills: data, loading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load bills';
      set({ error: message, loading: false, bills: [] });
      console.error('Failed to load bills:', err);
    }
  },

  recordExpense: async (data) => {
    const result = await BillService.recordExpense(data);
    if (result.bill.id != null) {
      set({ bills: [result.bill, ...get().bills.filter((b) => b.id !== result.bill.id)] });
    }
    const existing = useSupplierStore.getState().suppliers.find((s) => s.id === data.supplier_id);
    if (existing) {
      const interval =
        data.recurrence_interval !== undefined
          ? data.recurrence_interval
          : existing.recurrence_interval;
      const nextInterval = isRecurrenceInterval(interval) ? interval : null;
      useSupplierStore.getState().upsertSupplier({
        ...existing,
        recurrence_interval: nextInterval,
        next_expected_payment_date: nextInterval ? data.next_expected_payment_date ?? null : null,
        expected_amount: nextInterval ? data.amount : null,
      });
    }
    return result;
  },

  recordPayment: async (data) => {
    const payment = await BillPaymentService.create(data);
    await get().fetchBills();
    return payment;
  },
}));
