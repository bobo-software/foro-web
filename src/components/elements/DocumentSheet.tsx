import type { BankingDetails } from '@/types/bankingDetails';
import { ACCOUNT_TYPES } from '@/types/bankingDetails';
import type { Business } from '@/types/business';
import { formatCurrency } from '@/utils/currency';

export interface DocumentSheetLine {
  id?: number;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface DocumentSheetProps {
  /** The issuing business (letterhead). */
  business: Business | null;
  bankingDetails: BankingDetails | null;
  /** e.g. "Issued 1 May 2026 · Due 31 May 2026". */
  dateLine: string;
  status: string;
  customerName: string;
  customerAddress?: string;
  lines: DocumentSheetLine[];
  /** Stored subtotal, used when there are no lines. */
  subtotal: number;
  taxRate?: number;
  currency?: string;
  notes?: string;
}

/**
 * Read-only rendering of an issued invoice or quotation — letterhead, bill-to,
 * lines, banking details and totals. Used where the viewer isn't the issuer
 * (statement portal, documents received from a linked business).
 */
export function DocumentSheet({
  business,
  bankingDetails,
  dateLine,
  status,
  customerName,
  customerAddress,
  lines,
  subtotal,
  taxRate,
  currency,
  notes,
}: DocumentSheetProps) {
  const taxEnabled = business?.tax_enabled ?? true;
  const vatRate = taxEnabled ? Number(taxRate) || 0 : 0;
  const linesSubtotal = lines.length > 0 ? lines.reduce((sum, item) => sum + Number(item.total || 0), 0) : Number(subtotal) || 0;
  const vatAmount = (linesSubtotal * vatRate) / 100;
  const total = linesSubtotal + vatAmount;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-8 space-y-6">
      <div className="flex items-start justify-between pb-4 border-b border-slate-200 dark:border-slate-700">
        <div>
          <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{business?.name ?? '—'}</p>
          {business?.address && (
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 whitespace-pre-line">{business.address}</p>
          )}
          {business?.vat_number && <p className="text-xs text-slate-500 dark:text-slate-400">VAT: {business.vat_number}</p>}
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500 dark:text-slate-400">{dateLine}</p>
          <span className="mt-1 inline-block px-2 py-0.5 rounded text-xs font-semibold uppercase bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
            {status}
          </span>
        </div>
      </div>

      <div>
        <p className="mb-1 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Bill to</p>
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{customerName}</p>
        {customerAddress && (
          <p className="text-xs text-slate-500 dark:text-slate-400 whitespace-pre-line">{customerAddress}</p>
        )}
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase border-b border-slate-200 dark:border-slate-700">
            <th className="py-2">Description</th>
            <th className="py-2 text-right">Qty</th>
            <th className="py-2 text-right">Unit price</th>
            <th className="py-2 text-right">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {lines.map((item, idx) => (
            <tr key={item.id ?? idx}>
              <td className="py-2 text-slate-800 dark:text-slate-200">{item.description}</td>
              <td className="py-2 text-right text-slate-600 dark:text-slate-400">{item.quantity}</td>
              <td className="py-2 text-right text-slate-600 dark:text-slate-400">
                {formatCurrency(Number(item.unit_price), currency)}
              </td>
              <td className="py-2 text-right font-medium text-slate-800 dark:text-slate-200">
                {formatCurrency(Number(item.total), currency)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start pt-2">
        {bankingDetails ? (
          <div className="text-xs">
            <p className="mb-1.5 font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Payment / banking details
            </p>
            {bankingDetails.label && (
              <p className="font-semibold text-slate-700 dark:text-slate-300 mb-0.5">{bankingDetails.label}</p>
            )}
            <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-slate-600 dark:text-slate-400">
              <span className="text-slate-400 dark:text-slate-500">Bank</span>
              <span>{bankingDetails.bank_name}</span>
              {bankingDetails.account_holder && (
                <>
                  <span className="text-slate-400 dark:text-slate-500">Acc. holder</span>
                  <span>{bankingDetails.account_holder}</span>
                </>
              )}
              <span className="text-slate-400 dark:text-slate-500">Account no.</span>
              <span>{bankingDetails.account_number}</span>
              {bankingDetails.account_type && (
                <>
                  <span className="text-slate-400 dark:text-slate-500">Acc. type</span>
                  <span>
                    {ACCOUNT_TYPES.find((t) => t.value === bankingDetails.account_type)?.label ?? bankingDetails.account_type}
                  </span>
                </>
              )}
              {bankingDetails.branch_code && (
                <>
                  <span className="text-slate-400 dark:text-slate-500">Branch code</span>
                  <span>{bankingDetails.branch_code}</span>
                </>
              )}
              {bankingDetails.swift_code && (
                <>
                  <span className="text-slate-400 dark:text-slate-500">SWIFT</span>
                  <span>{bankingDetails.swift_code}</span>
                </>
              )}
            </div>
          </div>
        ) : (
          <div />
        )}

        <div className="text-sm space-y-1 sm:justify-self-end sm:w-56">
          <div className="flex justify-between text-slate-600 dark:text-slate-400">
            <span>Subtotal</span>
            <span>{formatCurrency(linesSubtotal, currency)}</span>
          </div>
          {taxEnabled && (
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>VAT ({vatRate}%)</span>
              <span>{formatCurrency(vatAmount, currency)}</span>
            </div>
          )}
          <div className="flex justify-between pt-2 mt-1 border-t-2 border-slate-700 dark:border-slate-300 text-base font-bold text-slate-900 dark:text-slate-100">
            <span>Total</span>
            <span>{formatCurrency(total, currency)}</span>
          </div>
        </div>
      </div>

      {notes && (
        <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
          <p className="mb-2 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Notes</p>
          <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{notes}</p>
        </div>
      )}
    </div>
  );
}
