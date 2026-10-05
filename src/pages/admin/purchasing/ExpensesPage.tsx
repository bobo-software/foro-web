import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LuReceipt } from 'react-icons/lu';
import { AppDataTable, type AppDataTableColumn } from '@/components/elements/AppDataTable';
import AppLabeledSelectInput from '@/components/forms/AppLabledSelectInput';
import { useBusinessStore } from '@/stores/data/BusinessStore';
import { useExpenseStore } from '@/stores/data/ExpenseStore';
import type { Expense } from '@/types/expense';
import { EXPENSE_CATEGORY_OPTIONS } from '@/types/expense';
import { PAYMENT_METHODS } from '@/types/payment';
import { formatCurrency } from '@/utils/currency';
import { formatCalendarDate } from '@/utils/recurrence';

const CATEGORY_FILTER_OPTIONS = [{ value: 'all', label: 'All categories' }, ...EXPENSE_CATEGORY_OPTIONS];

export function ExpensesPage() {
  const navigate = useNavigate();
  const businessId = useBusinessStore((s) => s.currentBusiness?.id);
  const expenses = useExpenseStore((s) => s.expenses);
  const loading = useExpenseStore((s) => s.loading);
  const error = useExpenseStore((s) => s.error);
  const fetchExpenses = useExpenseStore((s) => s.fetchExpenses);
  const [category, setCategory] = useState('all');

  useEffect(() => {
    void fetchExpenses(category);
  }, [fetchExpenses, businessId, category]);

  const columns = useMemo<AppDataTableColumn<Expense>[]>(
    () => [
      {
        id: 'date',
        header: 'Date',
        cellClassName: 'text-slate-600 dark:text-slate-300',
        render: (row) => formatCalendarDate(row.date),
      },
      {
        id: 'category',
        header: 'Category',
        cellClassName: 'font-medium text-slate-800 dark:text-slate-100',
        render: (row) =>
          EXPENSE_CATEGORY_OPTIONS.find((option) => option.value === row.category)?.label ?? row.category,
      },
      {
        id: 'payee',
        header: 'Payee',
        cellClassName: 'text-slate-600 dark:text-slate-300',
        render: (row) => row.payee?.trim() || '—',
      },
      {
        id: 'amount',
        header: 'Amount',
        align: 'right',
        cellClassName: 'font-medium text-slate-800 dark:text-slate-100',
        render: (row) => formatCurrency(row.amount, row.currency),
      },
      {
        id: 'method',
        header: 'Method',
        cellClassName: 'text-slate-600 dark:text-slate-300',
        render: (row) =>
          PAYMENT_METHODS.find((method) => method.value === row.payment_method)?.label ?? row.payment_method ?? '—',
      },
      {
        id: 'notes',
        header: 'Notes',
        cellClassName: 'text-slate-500 dark:text-slate-400 max-w-xs truncate',
        render: (row) => row.notes?.trim() || '—',
      },
    ],
    [],
  );

  return (
    <div className="space-y-4">
      <div className="max-w-xs">
        <AppLabeledSelectInput
          label="Category"
          value={category}
          options={CATEGORY_FILTER_OPTIONS}
          onChange={(e) => setCategory(e.target.value || 'all')}
        />
      </div>
      <AppDataTable<Expense>
        title="Expenses"
        titleIcon={<LuReceipt />}
        columns={columns}
        data={expenses}
        getRowKey={(row, index) => row.id ?? `expense-${index}`}
        loading={loading}
        error={error}
        emptyMessage="No cash expenses yet."
        onRowClick={(row) => {
          if (row.id != null) navigate(`/app/purchasing/expenses/${row.id}/edit`);
        }}
      />
    </div>
  );
}

export default ExpensesPage;
