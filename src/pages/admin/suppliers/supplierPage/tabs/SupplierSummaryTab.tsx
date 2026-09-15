import { useMemo } from 'react';
import { formatCurrency } from '@/utils/currency';
import type { SupplierTabProps } from './types';

export function SupplierSummaryTab({ supplier, purchaseOrders, bills, loading }: SupplierTabProps) {
  const spendByCurrency = useMemo(() => {
    const byCurrency: Record<string, number> = {};
    for (const po of purchaseOrders) {
      const c = po.currency || 'ZAR';
      byCurrency[c] = (byCurrency[c] ?? 0) + Number(po.total ?? 0);
    }
    return byCurrency;
  }, [purchaseOrders]);

  const unpaidByCurrency = useMemo(() => {
    const byCurrency: Record<string, number> = {};
    for (const bill of bills) {
      if (bill.status === 'paid' || bill.status === 'cancelled') continue;
      const c = bill.currency || 'ZAR';
      byCurrency[c] = (byCurrency[c] ?? 0) + Number(bill.total ?? 0);
    }
    return byCurrency;
  }, [bills]);

  const lastOrderDate = useMemo(() => {
    const dates = purchaseOrders.map((po) => po.issue_date).filter(Boolean).sort();
    return dates.length > 0 ? dates[dates.length - 1] : null;
  }, [purchaseOrders]);

  const hasCredentials = supplier.vat_number || supplier.registration_number || supplier.payment_terms_days;

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm divide-y divide-slate-100 dark:divide-slate-700">
      <div className="p-4">
        <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">
          Contact
        </p>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
          {supplier.contact_person && (
            <div className="col-span-2 sm:col-span-2">
              <dt className="text-xs text-slate-400 dark:text-slate-500">Contact person</dt>
              <dd className="mt-0.5 text-sm text-slate-800 dark:text-slate-200">{supplier.contact_person}</dd>
            </div>
          )}
          {supplier.email && (
            <div>
              <dt className="text-xs text-slate-400 dark:text-slate-500">Email</dt>
              <dd className="mt-0.5 text-sm text-slate-800 dark:text-slate-200 truncate">{supplier.email}</dd>
            </div>
          )}
          {supplier.phone && (
            <div>
              <dt className="text-xs text-slate-400 dark:text-slate-500">Phone</dt>
              <dd className="mt-0.5 text-sm text-slate-800 dark:text-slate-200">{supplier.phone}</dd>
            </div>
          )}
          {supplier.address && (
            <div className="col-span-2 sm:col-span-4">
              <dt className="text-xs text-slate-400 dark:text-slate-500">Address</dt>
              <dd className="mt-0.5 text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap">{supplier.address}</dd>
            </div>
          )}
          {!supplier.contact_person && !supplier.email && !supplier.phone && !supplier.address && (
            <div className="col-span-4">
              <span className="text-sm text-slate-400 dark:text-slate-500">No contact details recorded.</span>
            </div>
          )}
        </dl>
      </div>

      <div className="p-4">
        <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">
          Spend summary
        </p>
        {loading ? (
          <p className="text-xs text-slate-400 dark:text-slate-500">Loading…</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-amber-50/60 dark:bg-amber-900/10 border border-amber-200/60 dark:border-amber-800/40">
              <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mb-1">Total ordered</p>
              {Object.keys(spendByCurrency).length === 0 ? (
                <span className="text-sm text-slate-400">—</span>
              ) : (
                Object.entries(spendByCurrency).map(([curr, tot]) => (
                  <p key={curr} className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                    {formatCurrency(tot, curr)}
                  </p>
                ))
              )}
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                {purchaseOrders.length} purchase order{purchaseOrders.length !== 1 ? 's' : ''}
                {lastOrderDate && <span className="block">Last order {new Date(lastOrderDate).toLocaleDateString()}</span>}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-red-50/60 dark:bg-red-900/10 border border-red-200/60 dark:border-red-800/40">
              <p className="text-xs font-medium text-red-600 dark:text-red-400 mb-1">Outstanding bills</p>
              {Object.keys(unpaidByCurrency).length === 0 ? (
                <span className="text-sm text-slate-400">—</span>
              ) : (
                Object.entries(unpaidByCurrency).map(([curr, tot]) => (
                  <p key={curr} className="text-sm font-semibold text-red-800 dark:text-red-200">
                    {formatCurrency(tot, curr)}
                  </p>
                ))
              )}
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                {bills.length} bill{bills.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        )}
      </div>

      {hasCredentials && (
        <div className="p-4">
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">
            Business credentials
          </p>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
            {supplier.vat_number && (
              <div>
                <dt className="text-xs text-slate-400 dark:text-slate-500">VAT number</dt>
                <dd className="mt-0.5 text-sm text-slate-800 dark:text-slate-200">{supplier.vat_number}</dd>
              </div>
            )}
            {supplier.registration_number && (
              <div>
                <dt className="text-xs text-slate-400 dark:text-slate-500">Registration no.</dt>
                <dd className="mt-0.5 text-sm text-slate-800 dark:text-slate-200">{supplier.registration_number}</dd>
              </div>
            )}
            {supplier.payment_terms_days != null && (
              <div>
                <dt className="text-xs text-slate-400 dark:text-slate-500">Payment terms</dt>
                <dd className="mt-0.5 text-sm text-slate-800 dark:text-slate-200">Net {supplier.payment_terms_days}</dd>
              </div>
            )}
          </dl>
        </div>
      )}

      {supplier.notes && (
        <div className="p-4">
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
            Notes
          </p>
          <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{supplier.notes}</p>
        </div>
      )}
    </div>
  );
}

export default SupplierSummaryTab;
