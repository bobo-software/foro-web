import { useEffect, useMemo, useState } from 'react';
import { useBillStore } from '@/stores/data/BillStore';
import { useBusinessStore } from '@/stores/data/BusinessStore';
import PurchaseOrderService from '@/services/purchaseOrderService';
import type { PurchaseOrder } from '@/types/purchase';
import { formatCurrency } from '@/utils/currency';

function sumByCurrency(rows: { currency?: string; total?: number }[]): Record<string, number> {
  const byCurrency: Record<string, number> = {};
  for (const row of rows) {
    const currency = row.currency || 'ZAR';
    byCurrency[currency] = (byCurrency[currency] ?? 0) + Number(row.total ?? 0);
  }
  return byCurrency;
}

export function PaymentsSummaryPage() {
  const businessId = useBusinessStore((s) => s.currentBusiness?.id);
  const bills = useBillStore((s) => s.bills);
  const billsLoading = useBillStore((s) => s.loading);
  const fetchBills = useBillStore((s) => s.fetchBills);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  useEffect(() => {
    void fetchBills();
  }, [fetchBills, businessId]);

  useEffect(() => {
    let cancelled = false;
    setOrdersLoading(true);
    PurchaseOrderService.findAll({
      where: businessId != null ? { business_id: businessId } : undefined,
    })
      .then((data) => {
        if (!cancelled) setPurchaseOrders(data);
      })
      .catch(() => {
        if (!cancelled) setPurchaseOrders([]);
      })
      .finally(() => {
        if (!cancelled) setOrdersLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [businessId]);

  const paidBills = useMemo(() => bills.filter((bill) => bill.status === 'paid'), [bills]);
  const outstandingBills = useMemo(
    () => bills.filter((bill) => bill.status !== 'paid' && bill.status !== 'cancelled'),
    [bills],
  );

  const orderedByCurrency = useMemo(() => sumByCurrency(purchaseOrders), [purchaseOrders]);
  const paidByCurrency = useMemo(() => sumByCurrency(paidBills), [paidBills]);
  const outstandingByCurrency = useMemo(() => sumByCurrency(outstandingBills), [outstandingBills]);

  const loading = billsLoading || ordersLoading;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryCard
          label="Total ordered"
          tone="amber"
          totals={orderedByCurrency}
          caption={`${purchaseOrders.length} purchase order${purchaseOrders.length === 1 ? '' : 's'}`}
          loading={loading}
        />
        <SummaryCard
          label="Paid bills"
          tone="emerald"
          totals={paidByCurrency}
          caption={`${paidBills.length} paid bill${paidBills.length === 1 ? '' : 's'}`}
          loading={loading}
        />
        <SummaryCard
          label="Outstanding bills"
          tone="red"
          totals={outstandingByCurrency}
          caption={`${outstandingBills.length} outstanding bill${outstandingBills.length === 1 ? '' : 's'}`}
          loading={loading}
        />
    </div>
  );
}

function SummaryCard({
  label,
  tone,
  totals,
  caption,
  loading,
}: {
  label: string;
  tone: 'amber' | 'emerald' | 'red';
  totals: Record<string, number>;
  caption: string;
  loading: boolean;
}) {
  const tones = {
    amber: {
      box: 'bg-amber-50/60 dark:bg-amber-900/10 border-amber-200/60 dark:border-amber-800/40',
      label: 'text-amber-600 dark:text-amber-400',
      value: 'text-amber-800 dark:text-amber-200',
    },
    emerald: {
      box: 'bg-emerald-50/60 dark:bg-emerald-900/10 border-emerald-200/60 dark:border-emerald-800/40',
      label: 'text-emerald-600 dark:text-emerald-400',
      value: 'text-emerald-800 dark:text-emerald-200',
    },
    red: {
      box: 'bg-red-50/60 dark:bg-red-900/10 border-red-200/60 dark:border-red-800/40',
      label: 'text-red-600 dark:text-red-400',
      value: 'text-red-800 dark:text-red-200',
    },
  }[tone];

  return (
    <div className={`p-3 rounded-lg border ${tones.box}`}>
      <p className={`text-xs font-medium mb-1 ${tones.label}`}>{label}</p>
      {loading ? (
        <span className="text-sm text-slate-400">Loading…</span>
      ) : Object.keys(totals).length === 0 ? (
        <span className="text-sm text-slate-400">—</span>
      ) : (
        Object.entries(totals).map(([currency, total]) => (
          <p key={currency} className={`text-sm font-semibold ${tones.value}`}>
            {formatCurrency(total, currency)}
          </p>
        ))
      )}
      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{caption}</p>
    </div>
  );
}

export default PaymentsSummaryPage;
