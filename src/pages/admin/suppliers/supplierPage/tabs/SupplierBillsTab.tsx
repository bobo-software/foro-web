import { Link } from 'react-router-dom';
import { formatCurrency } from '@/utils/currency';
import type { SupplierTabProps } from './types';

const STATUS_CLASSES: Record<string, string> = {
  unpaid: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  partially_paid: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  paid: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  cancelled: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

export function SupplierBillsTab({ bills, loading }: SupplierTabProps) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm p-4 space-y-3">
      <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Bills</h2>
      {loading ? (
        <p className="text-sm text-slate-400 dark:text-slate-500">Loading…</p>
      ) : bills.length === 0 ? (
        <p className="text-sm text-slate-400 dark:text-slate-500">No bills for this supplier yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 dark:text-slate-400">
              <th className="py-1 font-medium">Bill #</th>
              <th className="py-1 font-medium">Issued</th>
              <th className="py-1 font-medium">Status</th>
              <th className="py-1 font-medium text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {bills.map((bill) => (
              <tr key={bill.id} className="border-t border-slate-100 dark:border-slate-700">
                <td className="py-2 font-mono text-slate-700 dark:text-slate-200">
                  <Link to="/app/purchasing/bills" className="text-indigo-600 dark:text-indigo-400 no-underline">
                    {bill.bill_number}
                  </Link>
                </td>
                <td className="py-2 text-slate-600 dark:text-slate-300">
                  {bill.issue_date ? new Date(bill.issue_date).toLocaleDateString() : '—'}
                </td>
                <td className="py-2">
                  <span
                    className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STATUS_CLASSES[bill.status] ?? ''}`}
                  >
                    {bill.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="py-2 text-right">{formatCurrency(bill.total, bill.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default SupplierBillsTab;
