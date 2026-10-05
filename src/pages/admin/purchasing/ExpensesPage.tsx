import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppDataTable, type AppDataTableColumn } from '@/components/elements/AppDataTable';
import { TableCount, TableFilterSelect, TableSearchInput, TableCreateButton, TableToolbarEnd, TableToolbarStart, matchesSearch } from '@/components/elements/AppTableToolbar';
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
  const [search, setSearch] = useState('');

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

  const filteredExpenses = useMemo(
    () =>
      expenses.filter((row) =>
        matchesSearch(search, [
          row.payee,
          row.notes,
          row.reference,
          EXPENSE_CATEGORY_OPTIONS.find((option) => option.value === row.category)?.label,
        ]),
      ),
    [expenses, search],
  );

  return (
    <AppDataTable<Expense>
      toolbar={
        <>
          <TableToolbarStart>
            <TableSearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search payee, notes, reference…"
              ariaLabel="Search expenses"
            />
            <TableFilterSelect
              value={category}
              onChange={(value) => setCategory(value || 'all')}
              options={CATEGORY_FILTER_OPTIONS}
              ariaLabel="Filter by category"
            />
          </TableToolbarStart>
          <TableToolbarEnd>
            <TableCount count={filteredExpenses.length} noun="expense" loading={loading} />
            <TableCreateButton to="/app/purchasing/expenses/create" label="Record expense" />
          </TableToolbarEnd>
        </>
      }
      columns={columns}
      data={filteredExpenses}
      getRowKey={(row, index) => row.id ?? `expense-${index}`}
      loading={loading}
      error={error}
      emptyMessage={search.trim() || category !== 'all' ? 'No expenses match your filters.' : 'No cash expenses yet.'}
      onRowClick={(row) => {
        if (row.id != null) navigate(`/app/purchasing/expenses/${row.id}/edit`);
      }}
      pageSize={20}
      pageSizeOptions={[10, 20, 50]}
    />
  );
}

export default ExpensesPage;
