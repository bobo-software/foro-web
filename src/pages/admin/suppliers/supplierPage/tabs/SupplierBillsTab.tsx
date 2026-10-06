import { useMemo, useState } from 'react';
import { AppDataTable, type AppDataTableColumn } from '@/components/elements/AppDataTable';
import {
  TableCount,
  TableCreateButton,
  TableFilterSelect,
  TableSearchInput,
  TableToolbarEnd,
  TableToolbarStart,
  matchesSearch,
} from '@/components/elements/AppTableToolbar';
import type { Bill } from '@/types/purchase';
import { formatCurrency } from '@/utils/currency';
import { formatCalendarDate } from '@/utils/recurrence';
import type { SupplierTabProps } from './types';

const STATUS_CLASSES: Record<string, string> = {
  unpaid: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  partially_paid: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  paid: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  cancelled: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'partially_paid', label: 'Partially paid' },
  { value: 'paid', label: 'Paid' },
  { value: 'cancelled', label: 'Cancelled' },
];

const columns: AppDataTableColumn<Bill>[] = [
  {
    id: 'bill_number',
    header: 'Bill #',
    cellClassName: 'font-mono text-slate-700 dark:text-slate-200',
    render: (bill) => bill.bill_number,
  },
  {
    id: 'date',
    header: 'Date',
    cellClassName: 'text-slate-600 dark:text-slate-300 whitespace-nowrap',
    render: (bill) => (bill.issue_date ? formatCalendarDate(bill.issue_date) : '—'),
  },
  {
    id: 'notes',
    header: 'Notes',
    cellClassName: 'text-slate-500 dark:text-slate-400 max-w-xs truncate',
    render: (bill) => bill.notes?.trim() || '—',
  },
  {
    id: 'status',
    header: 'Status',
    render: (bill) => (
      <span
        className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STATUS_CLASSES[bill.status] ?? ''}`}
      >
        {bill.status.replace('_', ' ')}
      </span>
    ),
  },
  {
    id: 'total',
    header: 'Total',
    align: 'right',
    cellClassName: 'tabular-nums',
    render: (bill) => formatCurrency(bill.total, bill.currency),
  },
];

export function SupplierBillsTab({ supplier, bills, loading }: SupplierTabProps) {
  const [filterStatus, setFilterStatus] = useState('all');
  const [search, setSearch] = useState('');
  const recordHref =
    supplier.id != null ? `/app/purchasing/bills/record-expense?supplierId=${supplier.id}` : '/app/purchasing/bills/record-expense';

  const filtered = useMemo(
    () =>
      bills.filter(
        (bill) =>
          (filterStatus === 'all' || bill.status === filterStatus) &&
          matchesSearch(search, [bill.bill_number, bill.notes]),
      ),
    [bills, filterStatus, search],
  );

  return (
    <AppDataTable<Bill>
      toolbar={
        <>
          <TableToolbarStart>
            <TableSearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search bill #, notes…"
              ariaLabel="Search bills"
            />
            <TableFilterSelect
              value={filterStatus}
              onChange={setFilterStatus}
              options={STATUS_FILTER_OPTIONS}
              ariaLabel="Filter by status"
            />
          </TableToolbarStart>
          <TableToolbarEnd>
            <TableCount count={filtered.length} noun="bill" loading={loading} />
            <TableCreateButton to={recordHref} label="Record supplier bill" />
          </TableToolbarEnd>
        </>
      }
      columns={columns}
      data={filtered}
      getRowKey={(row, index) => row.id ?? `bill-${index}`}
      loading={loading}
      emptyMessage={
        search.trim() || filterStatus !== 'all' ? 'No bills match your filters.' : 'No bills for this supplier yet.'
      }
      pageSize={20}
      pageSizeOptions={[10, 20, 50]}
    />
  );
}

export default SupplierBillsTab;
