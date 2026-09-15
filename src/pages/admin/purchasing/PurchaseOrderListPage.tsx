import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppDataTable, type AppDataTableColumn } from '@/components/elements/AppDataTable';
import { useBusinessStore } from '@/stores/data/BusinessStore';
import { useCompanyStore } from '@/stores/data/CompanyStore';
import { useSupplierStore } from '@/stores/data/SupplierStore';
import PurchaseOrderService from '@/services/purchaseOrderService';
import type { PurchaseOrder } from '@/types/purchase';
import { formatCurrency } from '@/utils/currency';

const STATUS_CLASSES: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  sent: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  received: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  cancelled: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

export function PurchaseOrderListPage() {
  const navigate = useNavigate();
  const businessId = useBusinessStore((s) => s.currentBusiness?.id);
  const companies = useCompanyStore((s) => s.companies);
  const fetchCompanies = useCompanyStore((s) => s.fetchCompanies);
  const suppliers = useSupplierStore((s) => s.suppliers);
  const fetchSuppliers = useSupplierStore((s) => s.fetchSuppliers);
  const [rows, setRows] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchCompanies();
    void fetchSuppliers();
  }, [fetchCompanies, fetchSuppliers]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    PurchaseOrderService.findAll({
      where: businessId != null ? { business_id: businessId } : undefined,
    })
      .then((data) => {
        if (!cancelled) setRows(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load purchase orders');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [businessId]);

  const companyNameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const c of companies) {
      if (c.id != null) map.set(c.id, c.name);
    }
    return map;
  }, [companies]);
  const supplierNameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const s of suppliers) {
      if (s.id != null) map.set(s.id, s.name);
    }
    return map;
  }, [suppliers]);

  const columns = useMemo<AppDataTableColumn<PurchaseOrder>[]>(
    () => [
      {
        id: 'po_number',
        header: 'PO #',
        cellClassName: 'font-mono text-slate-700 dark:text-slate-200',
        render: (row) => row.po_number,
      },
      {
        id: 'supplier',
        header: 'Supplier',
        cellClassName: 'font-medium text-slate-800 dark:text-slate-100',
        render: (row) =>
          (row.supplier_id != null ? supplierNameById.get(row.supplier_id) : undefined) ??
          (row.company_id != null ? companyNameById.get(row.company_id) : undefined) ??
          '—',
      },
      {
        id: 'issue_date',
        header: 'Issued',
        render: (row) => (row.issue_date ? new Date(row.issue_date).toLocaleDateString() : '—'),
      },
      {
        id: 'status',
        header: 'Status',
        render: (row) => (
          <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STATUS_CLASSES[row.status] ?? ''}`}>
            {row.status}
          </span>
        ),
      },
      {
        id: 'total',
        header: 'Total',
        cellClassName: 'text-right',
        render: (row) => formatCurrency(row.total, row.currency),
      },
    ],
    [supplierNameById, companyNameById],
  );

  if (loading) {
    return <p className="text-sm text-slate-500 dark:text-slate-400 py-6">Loading purchase orders…</p>;
  }
  if (error) {
    return <p className="text-sm text-red-600 dark:text-red-400 py-6">{error}</p>;
  }

  return (
    <AppDataTable
      columns={columns}
      data={rows}
      getRowKey={(row) => String(row.id)}
      onRowClick={(row) => row.id != null && navigate(`/app/purchasing/orders/${row.id}`)}
      emptyMessage="No purchase orders yet."
    />
  );
}

export default PurchaseOrderListPage;
