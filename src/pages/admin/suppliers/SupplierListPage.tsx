import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppDataTable, type AppDataTableColumn } from '@/components/elements/AppDataTable';
import { TableCount, TableSearchInput, TableCreateButton, TableToolbarEnd, TableToolbarStart, matchesSearch } from '@/components/elements/AppTableToolbar';
import { useSupplierStore } from '@/stores/data/SupplierStore';
import { useBusinessStore } from '@/stores/data/BusinessStore';
import type { Supplier } from '@/types/supplier';
import { SUPPLIER_COST_TYPE_OPTIONS } from '@/types/supplier';
import { formatCalendarDate } from '@/utils/recurrence';
import { localDateISO } from '@/utils/localDateISO';

const supplierColumns: AppDataTableColumn<Supplier>[] = [
  {
    id: 'name',
    header: 'Name',
    cellClassName: 'font-medium text-slate-800 dark:text-slate-100',
    render: (s) => s.name,
  },
  {
    id: 'cost_type',
    header: 'Cost type',
    cellClassName: 'text-slate-600 dark:text-slate-300',
    render: (s) =>
      SUPPLIER_COST_TYPE_OPTIONS.find((o) => o.value === s.cost_type)?.label ?? '—',
  },
  {
    id: 'contact_person',
    header: 'Contact',
    cellClassName: 'text-slate-600 dark:text-slate-300',
    render: (s) => s.contact_person ?? '—',
  },
  {
    id: 'email',
    header: 'Email',
    cellClassName: 'text-slate-600 dark:text-slate-300',
    render: (s) => s.email ?? '—',
  },
  {
    id: 'phone',
    header: 'Phone',
    cellClassName: 'text-slate-600 dark:text-slate-300',
    render: (s) => s.phone ?? '—',
  },
  {
    id: 'next_expected_payment_date',
    header: 'Next payment',
    cellClassName: 'text-slate-600 dark:text-slate-300',
    render: (s) => {
      if (!s.next_expected_payment_date) return '—';
      const overdue = s.next_expected_payment_date < localDateISO();
      return (
        <span className={overdue ? 'font-medium text-red-700 dark:text-red-300' : undefined}>
          {formatCalendarDate(s.next_expected_payment_date)}
        </span>
      );
    },
  },
  {
    id: 'vat_number',
    header: 'VAT number',
    cellClassName: 'text-slate-600 dark:text-slate-300',
    render: (s) => s.vat_number ?? '—',
  },
];

export function SupplierListPage() {
  const navigate = useNavigate();
  const { suppliers, loading, error, fetchSuppliers } = useSupplierStore();
  const businessId = useBusinessStore((s) => s.currentBusiness?.id);
  const [search, setSearch] = useState('');

  useEffect(() => {
    void fetchSuppliers();
  }, [fetchSuppliers, businessId]);

  const filteredSuppliers = useMemo(
    () =>
      suppliers.filter((s) => matchesSearch(search, [s.name, s.contact_person, s.email, s.phone, s.vat_number])),
    [suppliers, search],
  );

  const emptyMessage = search.trim() ? 'No suppliers match your search.' : 'No suppliers yet.';

  return (
    <AppDataTable<Supplier>
      toolbar={
        <>
          <TableToolbarStart>
            <TableSearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search name, contact, email…"
              ariaLabel="Search suppliers"
            />
          </TableToolbarStart>
          <TableToolbarEnd>
            <TableCount count={filteredSuppliers.length} noun="supplier" loading={loading} />
            <TableCreateButton to="/app/purchasing/suppliers/create" label="New supplier" />
          </TableToolbarEnd>
        </>
      }
      columns={supplierColumns}
      data={filteredSuppliers}
      getRowKey={(row, index) => row.id ?? `supplier-${index}`}
      onRowClick={(s) => {
        if (s.id != null) navigate(`/app/purchasing/suppliers/${s.id}`);
      }}
      loading={loading}
      error={error}
      emptyMessage={emptyMessage}
      pageSize={20}
      pageSizeOptions={[10, 20, 50]}
    />
  );
}

export default SupplierListPage;
