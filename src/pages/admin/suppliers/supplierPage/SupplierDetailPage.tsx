import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import SupplierService from '@/services/supplierService';
import SupplierItemService from '@/services/supplierItemService';
import PurchaseOrderService from '@/services/purchaseOrderService';
import { BillService } from '@/services/billService';
import type { Supplier, SupplierItem } from '@/types/supplier';
import type { PurchaseOrder, Bill } from '@/types/purchase';
import {
  SupplierSummaryTab,
  SupplierItemsTab,
  SupplierPurchaseOrdersTab,
  SupplierBillsTab,
  SupplierEditTab,
} from './tabs';
import { AppPageHeader } from '@/components/ComponentsIndex';

type TabId = 'summary' | 'items' | 'orders' | 'bills' | 'edit';

const TAB_BUTTONS: { id: TabId; label: string }[] = [
  { id: 'summary', label: 'Summary' },
  { id: 'items', label: 'Items' },
  { id: 'orders', label: 'Purchase orders' },
  { id: 'bills', label: 'Bills' },
  { id: 'edit', label: 'Edit' },
];

export function SupplierDetailPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { id } = useParams<{ id: string }>();
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [items, setItems] = useState<SupplierItem[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [docsLoading, setDocsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const tabParam = searchParams.get('tab') as TabId | null;
  const [activeTab, setActiveTab] = useState<TabId>(tabParam ?? 'summary');

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    SupplierService.findById(Number(id))
      .then((data) => {
        if (!cancelled) setSupplier(data);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load supplier');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const loadDocs = useCallback((supplierId: number) => {
    setDocsLoading(true);
    return Promise.all([
      SupplierItemService.findAll({ where: { supplier_id: supplierId } }).catch(() => [] as SupplierItem[]),
      PurchaseOrderService.findAll({ where: { supplier_id: supplierId } }).catch(() => [] as PurchaseOrder[]),
      BillService.findAll({ where: { supplier_id: supplierId } }).catch(() => [] as Bill[]),
    ])
      .then(([itemRows, poRows, billRows]) => {
        setItems(itemRows);
        setPurchaseOrders(poRows);
        setBills(billRows);
      })
      .finally(() => setDocsLoading(false));
  }, []);

  useEffect(() => {
    if (!supplier?.id) return;
    let cancelled = false;
    loadDocs(supplier.id).then(() => {
      if (cancelled) return;
    });
    return () => {
      cancelled = true;
    };
  }, [supplier?.id, loadDocs, refreshTick]);

  const handleSupplierUpdate = (updated: Supplier) => setSupplier(updated);
  const handleRefresh = () => setRefreshTick((t) => t + 1);

  const tabProps = useMemo(
    () => ({
      supplier: supplier!,
      items,
      purchaseOrders,
      bills,
      loading: docsLoading,
      onSupplierUpdate: handleSupplierUpdate,
      onItemsChange: handleRefresh,
    }),
    [supplier, items, purchaseOrders, bills, docsLoading],
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="text-slate-500 dark:text-slate-400">Loading…</div>
      </div>
    );
  }
  if (error || !supplier) {
    return (
      <div className="space-y-4">
        <p className="text-red-600 dark:text-red-400">{error ?? 'Supplier not found.'}</p>
        <Link to="/app/purchasing/suppliers" className="text-indigo-600 dark:text-indigo-400 hover:underline no-underline">
          Back to suppliers
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <AppPageHeader
        title={supplier.name}
        subtitle="Supplier details"
        showBackButton
        onBackClick={() => navigate(-1)}
      />

      <div className="flex items-end justify-between border-b border-slate-200 dark:border-slate-700">
        <nav className="flex gap-0.5 flex-wrap" aria-label="Tabs">
          {TAB_BUTTONS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2 text-xs font-medium rounded-t-md border-b-2 -mb-px transition-colors ${
                activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 bg-white dark:bg-slate-800'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'summary' && <SupplierSummaryTab {...tabProps} />}
      {activeTab === 'items' && <SupplierItemsTab {...tabProps} />}
      {activeTab === 'orders' && <SupplierPurchaseOrdersTab {...tabProps} />}
      {activeTab === 'bills' && <SupplierBillsTab {...tabProps} />}
      {activeTab === 'edit' && <SupplierEditTab {...tabProps} />}
    </div>
  );
}

export default SupplierDetailPage;
