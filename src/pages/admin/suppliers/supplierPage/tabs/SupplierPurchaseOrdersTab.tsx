import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import type { PurchaseOrder } from '@/types/purchase';
import { formatCurrency } from '@/utils/currency';
import type { SupplierTabProps } from './types';

const STATUS_CLASSES: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  sent: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  received: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  cancelled: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'received', label: 'Received' },
  { value: 'cancelled', label: 'Cancelled' },
];

const columns: AppDataTableColumn<PurchaseOrder>[] = [
  {
    id: 'po_number',
    header: 'PO #',
    cellClassName: 'font-mono text-slate-700 dark:text-slate-200',
    render: (po) => po.po_number,
  },
  {
    id: 'issue_date',
    header: 'Issued',
    cellClassName: 'text-slate-600 dark:text-slate-300 whitespace-nowrap',
    render: (po) => (po.issue_date ? new Date(po.issue_date).toLocaleDateString() : '—'),
  },
  {
    id: 'quote_reference',
    header: 'Quote ref',
    cellClassName: 'text-slate-600 dark:text-slate-300',
    render: (po) => po.quote_reference || '—',
  },
  {
    id: 'status',
    header: 'Status',
    render: (po) => (
      <span
        className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STATUS_CLASSES[po.status] ?? ''}`}
      >
        {po.status}
      </span>
    ),
  },
  {
    id: 'total',
    header: 'Total',
    align: 'right',
    cellClassName: 'tabular-nums',
    render: (po) => formatCurrency(po.total, po.currency),
  },
];

export function SupplierPurchaseOrdersTab({ supplier, purchaseOrders, loading }: SupplierTabProps) {
  const navigate = useNavigate();
  const [filterStatus, setFilterStatus] = useState('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(
    () =>
      purchaseOrders.filter(
        (po) =>
          (filterStatus === 'all' || po.status === filterStatus) &&
          matchesSearch(search, [po.po_number, po.quote_reference, po.status]),
      ),
    [purchaseOrders, filterStatus, search],
  );

  return (
    <AppDataTable<PurchaseOrder>
      toolbar={
        <>
          <TableToolbarStart>
            <TableSearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search PO #, quote ref…"
              ariaLabel="Search purchase orders"
            />
            <TableFilterSelect
              value={filterStatus}
              onChange={setFilterStatus}
              options={STATUS_FILTER_OPTIONS}
              ariaLabel="Filter by status"
            />
          </TableToolbarStart>
          <TableToolbarEnd>
            <TableCount count={filtered.length} noun="purchase order" loading={loading} />
            <TableCreateButton to={`/app/purchasing/orders/create?supplier_id=${supplier.id}`} label="New PO" />
          </TableToolbarEnd>
        </>
      }
      columns={columns}
      data={filtered}
      getRowKey={(row, index) => row.id ?? `po-${index}`}
      onRowClick={(po) => {
        if (po.id != null) navigate(`/app/purchasing/orders/${po.id}`);
      }}
      loading={loading}
      emptyMessage={
        search.trim() || filterStatus !== 'all'
          ? 'No purchase orders match your filters.'
          : 'No purchase orders for this supplier yet.'
      }
      pageSize={20}
      pageSizeOptions={[10, 20, 50]}
    />
  );
}

export default SupplierPurchaseOrdersTab;
