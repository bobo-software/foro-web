import { Link, useNavigate } from 'react-router-dom';
import { formatCurrency } from '@/utils/currency';
import type { SupplierTabProps } from './types';

const STATUS_CLASSES: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  sent: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  received: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  cancelled: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

export function SupplierPurchaseOrdersTab({ supplier, purchaseOrders, loading }: SupplierTabProps) {
  const navigate = useNavigate();

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Purchase orders</h2>
        <Link
          to={`/app/purchasing/orders/create?supplier_id=${supplier.id}`}
          className="text-xs font-medium text-indigo-600 dark:text-indigo-400 no-underline"
        >
          + New PO
        </Link>
      </div>
      {loading ? (
        <p className="text-sm text-slate-400 dark:text-slate-500">Loading…</p>
      ) : purchaseOrders.length === 0 ? (
        <p className="text-sm text-slate-400 dark:text-slate-500">No purchase orders for this supplier yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 dark:text-slate-400">
              <th className="py-1 font-medium">PO #</th>
              <th className="py-1 font-medium">Issued</th>
              <th className="py-1 font-medium">Status</th>
              <th className="py-1 font-medium text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {purchaseOrders.map((po) => (
              <tr
                key={po.id}
                className="border-t border-slate-100 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/40"
                onClick={() => po.id != null && navigate(`/app/purchasing/orders/${po.id}`)}
              >
                <td className="py-2 font-mono text-slate-700 dark:text-slate-200">{po.po_number}</td>
                <td className="py-2 text-slate-600 dark:text-slate-300">
                  {po.issue_date ? new Date(po.issue_date).toLocaleDateString() : '—'}
                </td>
                <td className="py-2">
                  <span
                    className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STATUS_CLASSES[po.status] ?? ''}`}
                  >
                    {po.status}
                  </span>
                </td>
                <td className="py-2 text-right">{formatCurrency(po.total, po.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default SupplierPurchaseOrdersTab;
