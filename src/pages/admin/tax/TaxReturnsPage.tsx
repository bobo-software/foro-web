import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import AppLabeledSelectInput from '@/components/forms/AppLabledSelectInput';
import { useBusinessStore } from '@/stores/data/BusinessStore';
import { useBusinessTaxStore } from '@/stores/data/BusinessTaxStore';
import { TAX_RETURN_KIND_LABELS, TAX_RETURN_KIND_ORDER, type TaxReturnKind } from '@/types/businessTax';
import { amountDueLabel, taxYearLabel, taxYearOptions } from '@/utils/businessTax';
import { formatCurrency } from '@/utils/currency';
import { TaxReturnStatusBadge } from './TaxReturnStatusBadge';

const KIND_OPTIONS = ['annual' as const, ...TAX_RETURN_KIND_ORDER.filter((kind) => kind !== 'annual')].map(
  (kind) => ({ value: kind, label: TAX_RETURN_KIND_LABELS[kind] }),
);

export function TaxReturnsPage() {
  const navigate = useNavigate();
  const businessId = useBusinessStore((s) => s.currentBusiness?.id);
  const returns = useBusinessTaxStore((s) => s.returns);
  const loading = useBusinessTaxStore((s) => s.returnsLoading);
  const busy = useBusinessTaxStore((s) => s.returnBusy);
  const error = useBusinessTaxStore((s) => s.error);
  const estimate = useBusinessTaxStore((s) => s.estimate);
  const fetchReturns = useBusinessTaxStore((s) => s.fetchReturns);
  const fetchEstimate = useBusinessTaxStore((s) => s.fetchEstimate);
  const createReturn = useBusinessTaxStore((s) => s.createReturn);

  const [kind, setKind] = useState<TaxReturnKind>('annual');
  const [taxYear, setTaxYear] = useState('');

  useEffect(() => {
    void fetchReturns();
    void fetchEstimate();
  }, [fetchReturns, fetchEstimate, businessId]);

  const yearOptions = useMemo(() => {
    if (!estimate) return [];
    const taken = new Set(returns.filter((row) => row.kind === kind).map((row) => row.tax_year_code));
    return taxYearOptions(estimate.year_of_assessment.code).filter((option) => !taken.has(option.value));
  }, [estimate, returns, kind]);

  useEffect(() => {
    if (!yearOptions.some((option) => option.value === taxYear)) setTaxYear(yearOptions[0]?.value ?? '');
  }, [yearOptions, taxYear]);

  const handleCreate = async () => {
    if (!taxYear) return;
    try {
      const created = await createReturn(kind, taxYear);
      toast.success('Draft return created');
      navigate(`/app/tax/returns/${created.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create the tax return');
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500 dark:text-slate-400">
        A saved return keeps a copy of the figures for one year of assessment: the annual income tax return, or a
        provisional tax payment (IRP6). Drafts recalculate from your documents; once you mark a return as submitted its
        figures are frozen.
      </p>

      <div className="flex flex-wrap items-end gap-3">
        <AppLabeledSelectInput
          label="New return"
          className="w-72"
          value={kind}
          options={KIND_OPTIONS}
          onChange={(e) => {
            setKind(e.target.value as TaxReturnKind);
            setTaxYear('');
          }}
          disabled={busy}
        />
        <AppLabeledSelectInput
          label="Year of assessment"
          className="w-64"
          value={taxYear}
          options={yearOptions.length > 0 ? yearOptions : [{ value: '', label: 'Every recent year has one' }]}
          onChange={(e) => setTaxYear(e.target.value)}
          disabled={busy || yearOptions.length === 0}
        />
        <button
          type="button"
          onClick={() => void handleCreate()}
          disabled={busy || !taxYear || businessId == null}
          className="mb-0.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {busy ? 'Creating…' : 'Create draft'}
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400 dark:bg-slate-800">
            <tr>
              <th className="px-4 py-2">Year of assessment</th>
              <th className="px-4 py-2">Return</th>
              <th className="px-4 py-2 text-right">Taxable income</th>
              <th className="px-4 py-2 text-right">Tax</th>
              <th className="px-4 py-2 text-right">To pay / refund</th>
              <th className="px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody className="text-slate-600 dark:text-slate-300">
            {returns.map((row) => (
              <tr
                key={row.id}
                onClick={() => navigate(`/app/tax/returns/${row.id}`)}
                className="cursor-pointer border-t border-slate-100 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60"
              >
                <td className="px-4 py-2 font-medium text-slate-800 dark:text-slate-100">
                  {taxYearLabel(row.tax_year_code)}
                </td>
                <td className="px-4 py-2">{TAX_RETURN_KIND_LABELS[row.kind]}</td>
                <td className="px-4 py-2 text-right">
                  {formatCurrency(row.estimate_override ?? row.figures.taxable_income)}
                </td>
                <td className="px-4 py-2 text-right">{formatCurrency(row.tax_liability)}</td>
                <td className="px-4 py-2 text-right">{amountDueLabel(row.amount_due)}</td>
                <td className="px-4 py-2">
                  <TaxReturnStatusBadge status={row.status} />
                </td>
              </tr>
            ))}
            {returns.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                  {loading ? 'Loading returns…' : 'No saved returns yet.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default TaxReturnsPage;
