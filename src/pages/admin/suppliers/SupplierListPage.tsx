import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LuFilter, LuTruck } from 'react-icons/lu';
import { AppDataTable, type AppDataTableColumn } from '@/components/elements/AppDataTable';
import { useSupplierStore } from '@/stores/data/SupplierStore';
import { useBusinessStore } from '@/stores/data/BusinessStore';
import type { Supplier } from '@/types/supplier';

const supplierColumns: AppDataTableColumn<Supplier>[] = [
  {
    id: 'name',
    header: 'Name',
    cellClassName: 'font-medium text-slate-800 dark:text-slate-100',
    render: (s) => s.name,
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

  const filteredSuppliers = useMemo(() => {
    if (!search.trim()) return suppliers;
    const q = search.trim().toLowerCase();
    return suppliers.filter(
      (s) =>
        s.name?.toLowerCase().includes(q) ||
        s.contact_person?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q) ||
        s.phone?.toLowerCase().includes(q) ||
        s.vat_number?.toLowerCase().includes(q),
    );
  }, [suppliers, search]);

  const emptyMessage = search.trim() ? 'No suppliers match your search.' : 'No suppliers yet.';

  if (loading) {
    return <p className="text-sm text-slate-500 dark:text-slate-400 py-6">Loading suppliers…</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative min-w-0 flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
            <LuFilter size={18} />
          </span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search suppliers…"
            className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 py-2 pl-9 pr-3 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            aria-label="Search suppliers"
          />
        </div>
        <Link
          to="/app/purchasing/suppliers/create"
          className="shrink-0 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white no-underline hover:bg-indigo-500"
        >
          + Add supplier
        </Link>
      </div>

      <AppDataTable<Supplier>
        title="Suppliers"
        titleIcon={<LuTruck />}
        columns={supplierColumns}
        data={filteredSuppliers}
        getRowKey={(row, index) => row.id ?? `supplier-${index}`}
        onRowClick={(s) => {
          if (s.id != null) navigate(`/app/purchasing/suppliers/${s.id}`);
        }}
        error={error}
        emptyMessage={emptyMessage}
      />
    </div>
  );
}

export default SupplierListPage;
