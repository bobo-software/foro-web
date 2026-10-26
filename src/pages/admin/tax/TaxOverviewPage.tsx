import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AppLabeledSelectInput from '@/components/forms/AppLabledSelectInput';
import { useBusinessStore } from '@/stores/data/BusinessStore';
import { useBusinessTaxStore } from '@/stores/data/BusinessTaxStore';
import { BUSINESS_TAX_ENTITY_LABELS } from '@/types/businessTax';
import {
  BREAKDOWN_ROWS,
  effectiveRatePercent,
  signedAmount,
  taxYearLabel,
  taxYearOptions,
} from '@/utils/businessTax';
import { formatCurrency } from '@/utils/currency';
import { formatCalendarDate } from '@/utils/recurrence';
import { TaxCard as Card } from './TaxCard';
import { TaxReturnStatusBadge } from './TaxReturnStatusBadge';

export function TaxOverviewPage() {
  const businessId = useBusinessStore((s) => s.currentBusiness?.id);
  const estimate = useBusinessTaxStore((s) => s.estimate);
  const loading = useBusinessTaxStore((s) => s.estimateLoading);
  const error = useBusinessTaxStore((s) => s.error);
  const fetchEstimate = useBusinessTaxStore((s) => s.fetchEstimate);

  const [selectedYear, setSelectedYear] = useState('');
  const [currentYear, setCurrentYear] = useState('');

  useEffect(() => {
    setSelectedYear('');
    setCurrentYear('');
  }, [businessId]);

  useEffect(() => {
    void fetchEstimate(selectedYear || undefined);
  }, [fetchEstimate, businessId, selectedYear]);

  useEffect(() => {
    if (estimate && !selectedYear) setCurrentYear(estimate.year_of_assessment.code);
  }, [estimate, selectedYear]);

  if (loading && !estimate) {
    return <p className="text-sm text-slate-500 dark:text-slate-400 py-6">Loading tax estimate…</p>;
  }
  if (error && !estimate) {
    return <p className="text-sm text-red-600 py-6">{error}</p>;
  }
  if (!estimate) {
    return <p className="text-sm text-slate-500 dark:text-slate-400 py-6">Select a business to see its tax estimate.</p>;
  }

  const { actual, projected, year_of_assessment: yoa } = estimate;
  const yearComplete = estimate.days_elapsed >= estimate.days_in_year;
  const fullYear = projected ?? actual;
  const showRebates = estimate.entity_type === 'sole_prop';

  return (
    <div className="space-y-4">
      <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
        These figures are estimates built from your Foro documents, not tax advice. Your accountant still prepares
        and files the return with SARS.
      </p>

      {estimate.profile_missing && (
        <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-900 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-200">
          No tax profile yet, so this assumes a company with a February year end.{' '}
          <Link to="/app/tax/profile" className="font-medium underline">
            Set up the tax profile
          </Link>
        </div>
      )}

      <div className="flex flex-wrap items-end gap-4">
        <AppLabeledSelectInput
          label="Year of assessment"
          className="w-64"
          value={selectedYear || yoa.code}
          options={currentYear ? taxYearOptions(currentYear) : [{ value: yoa.code, label: taxYearLabel(yoa.code) }]}
          onChange={(e) => setSelectedYear(e.target.value === currentYear ? '' : e.target.value)}
          disabled={loading}
        />
        <p className="pb-2 text-xs text-slate-500 dark:text-slate-400">
          {formatCalendarDate(yoa.starts_on)} – {formatCalendarDate(yoa.ends_on)} ·{' '}
          {BUSINESS_TAX_ENTITY_LABELS[estimate.entity_type]} ·{' '}
          {estimate.vat_registered ? 'amounts exclude VAT' : 'amounts include VAT'}
          {!yearComplete && estimate.days_elapsed > 0
            ? ` · day ${estimate.days_elapsed} of ${estimate.days_in_year}`
            : ''}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card
          title={yearComplete ? 'Tax for the year' : 'Projected tax for the year'}
          value={formatCurrency(fullYear.tax.tax_liability)}
          hint={yearComplete ? 'Based on the full year' : projected ? 'Year to date scaled to 12 months' : 'Year not started'}
        />
        <Card
          title="Tax on income so far"
          value={formatCurrency(actual.tax.tax_liability)}
          hint={`Taxable income ${formatCurrency(actual.figures.taxable_income)}`}
        />
        <Card
          title={yearComplete ? 'Taxable income' : 'Projected taxable income'}
          value={formatCurrency(fullYear.figures.taxable_income)}
        />
        <Card
          title="Effective rate"
          value={`${effectiveRatePercent(fullYear.tax.tax_liability, fullYear.figures.taxable_income)}%`}
          hint={`SARS ${fullYear.tax.rate_table_code} tables`}
        />
      </div>

      {estimate.provisional.length > 0 && (
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-2 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
            <h2 className="flex-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Provisional tax (IRP6)
            </h2>
            <Link to="/app/tax/returns" className="text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400">
              Save an IRP6 return
            </Link>
          </div>
          <div className="grid gap-px bg-slate-200 sm:grid-cols-3 dark:bg-slate-700">
            {estimate.provisional.map((plan) => (
              <div key={plan.kind} className="bg-white px-4 py-3 dark:bg-slate-800">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">{plan.label}</p>
                <p className="mt-1 text-base font-semibold text-slate-800 dark:text-slate-100">
                  {plan.suggested_payment != null ? formatCurrency(plan.suggested_payment) : 'Optional'}
                </p>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Due {formatCalendarDate(plan.due_date)}
                  {plan.kind === 'irp6_p3' ? ' · tops up any shortfall to avoid interest' : ''}
                </p>
                {plan.return_id != null && plan.return_status && (
                  <Link
                    to={`/app/tax/returns/${plan.return_id}`}
                    className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                  >
                    <TaxReturnStatusBadge status={plan.return_status} />
                    View saved return
                  </Link>
                )}
              </div>
            ))}
          </div>
          <p className="px-4 py-2 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-700">
            Suggested amounts split the projected tax for the year (the 2nd deducts a submitted 1st payment); the saved
            IRP6 return deducts earlier payments and lets you enter your own estimate. If a due date falls on a weekend or public holiday, pay by the last
            business day before it.
          </p>
        </div>
      )}

      {estimate.warnings.length > 0 && (
        <ul className="space-y-1 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-200">
          {estimate.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      )}

      <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">How the tax is worked out</h2>
        </div>
        <table className="min-w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-2"></th>
              <th className="px-4 py-2 text-right">So far</th>
              {!yearComplete && <th className="px-4 py-2 text-right">Projected full year</th>}
            </tr>
          </thead>
          <tbody className="text-slate-600 dark:text-slate-300">
            {BREAKDOWN_ROWS.map((row) => (
              <tr key={row.key} className="border-t border-slate-100 dark:border-slate-800">
                <td className="px-4 py-2">{row.label}</td>
                <td className="px-4 py-2 text-right">{signedAmount(actual.figures[row.key], row.sign)}</td>
                {!yearComplete && (
                  <td className="px-4 py-2 text-right">
                    {projected ? signedAmount(projected.figures[row.key], row.sign) : '—'}
                  </td>
                )}
              </tr>
            ))}
            <tr className="border-t border-slate-200 font-medium text-slate-800 dark:border-slate-700 dark:text-slate-100">
              <td className="px-4 py-2">Taxable income</td>
              <td className="px-4 py-2 text-right">{formatCurrency(actual.figures.taxable_income)}</td>
              {!yearComplete && (
                <td className="px-4 py-2 text-right">
                  {projected ? formatCurrency(projected.figures.taxable_income) : '—'}
                </td>
              )}
            </tr>
            <tr className="border-t border-slate-100 dark:border-slate-800">
              <td className="px-4 py-2">Tax before rebates</td>
              <td className="px-4 py-2 text-right">{formatCurrency(actual.tax.gross_tax)}</td>
              {!yearComplete && (
                <td className="px-4 py-2 text-right">{projected ? formatCurrency(projected.tax.gross_tax) : '—'}</td>
              )}
            </tr>
            {showRebates && (
              <tr className="border-t border-slate-100 dark:border-slate-800">
                <td className="px-4 py-2">Less rebates</td>
                <td className="px-4 py-2 text-right">{signedAmount(actual.tax.rebates, -1)}</td>
                {!yearComplete && (
                  <td className="px-4 py-2 text-right">{projected ? signedAmount(projected.tax.rebates, -1) : '—'}</td>
                )}
              </tr>
            )}
            <tr className="border-t border-slate-200 font-semibold text-slate-800 dark:border-slate-700 dark:text-slate-100">
              <td className="px-4 py-2">Tax payable</td>
              <td className="px-4 py-2 text-right">{formatCurrency(actual.tax.tax_liability)}</td>
              {!yearComplete && (
                <td className="px-4 py-2 text-right">
                  {projected ? formatCurrency(projected.tax.tax_liability) : '—'}
                </td>
              )}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default TaxOverviewPage;
