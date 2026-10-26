import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import AppInputLabeled from '@/components/forms/AppLabledInput';
import AppLabeledAreaInput from '@/components/forms/AppLabledAreaInput';
import DeleteConfirmationModal from '@/components/modals/DeleteConfirmationModal';
import { useBusinessTaxStore } from '@/stores/data/BusinessTaxStore';
import { BUSINESS_TAX_ENTITY_LABELS, TAX_RETURN_KIND_LABELS } from '@/types/businessTax';
import {
  amountDueLabel,
  effectiveRatePercent,
  formatSummaryAmount,
  isProvisionalReturn,
  settledLabel,
  taxReturnSummaryRows,
  taxYearLabel,
} from '@/utils/businessTax';
import { formatCurrency } from '@/utils/currency';
import { formatCalendarDate } from '@/utils/recurrence';
import { TaxAdjustmentsSection } from './TaxAdjustmentsSection';
import { TaxCard } from './TaxCard';
import { TaxReturnStatusBadge } from './TaxReturnStatusBadge';

const secondaryButton =
  'rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800';

const exportButton =
  'rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800';

export function TaxReturnDetailPage() {
  const { id } = useParams();
  const returnId = Number(id);
  const navigate = useNavigate();
  const taxReturn = useBusinessTaxStore((s) => s.currentReturn);
  const loading = useBusinessTaxStore((s) => s.returnLoading);
  const busy = useBusinessTaxStore((s) => s.returnBusy);
  const error = useBusinessTaxStore((s) => s.error);
  const fetchReturn = useBusinessTaxStore((s) => s.fetchReturn);
  const updateReturn = useBusinessTaxStore((s) => s.updateReturn);
  const recalculateReturn = useBusinessTaxStore((s) => s.recalculateReturn);
  const submitReturn = useBusinessTaxStore((s) => s.submitReturn);
  const deleteReturn = useBusinessTaxStore((s) => s.deleteReturn);
  const exporting = useBusinessTaxStore((s) => s.exporting);
  const downloadReturnPdf = useBusinessTaxStore((s) => s.downloadReturnPdf);
  const downloadReturnCsv = useBusinessTaxStore((s) => s.downloadReturnCsv);

  const [otherCredits, setOtherCredits] = useState('');
  const [notes, setNotes] = useState('');
  const [estimate, setEstimate] = useState('');
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (Number.isFinite(returnId)) void fetchReturn(returnId);
  }, [fetchReturn, returnId]);

  const savedOtherCredits = taxReturn?.other_credits;
  const savedNotes = taxReturn?.notes;
  const savedEstimate = taxReturn?.estimate_override;
  useEffect(() => {
    setOtherCredits(savedOtherCredits ? savedOtherCredits.toFixed(2) : '');
    setNotes(savedNotes ?? '');
    setEstimate(savedEstimate != null ? savedEstimate.toFixed(2) : '');
  }, [taxReturn?.id, savedOtherCredits, savedNotes, savedEstimate]);

  if (loading && taxReturn?.id !== returnId) {
    return <p className="text-sm text-slate-500 dark:text-slate-400 py-6">Loading tax return…</p>;
  }
  if (!taxReturn || taxReturn.id !== returnId) {
    return <p className="text-sm text-red-600 py-6">{error ?? 'Tax return not found.'}</p>;
  }

  const isDraft = taxReturn.status === 'draft';
  const isProvisional = isProvisionalReturn(taxReturn);
  const { figures } = taxReturn;
  const estimatedTaxable = taxReturn.estimate_override ?? figures.taxable_income;
  const annualTax = Math.max(0, taxReturn.gross_tax - taxReturn.rebates);

  const run = async (action: () => Promise<void>, success: string) => {
    try {
      await action();
      toast.success(success);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    }
  };

  const handleExport = async (download: () => Promise<void>, format: string) => {
    try {
      await download();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Failed to download the ${format}`);
    }
  };

  const handleSave = () =>
    run(
      () =>
        updateReturn(taxReturn.id, {
          other_credits: otherCredits,
          notes,
          ...(isProvisional ? { estimate_override: estimate } : {}),
        }),
      'Return saved and recalculated',
    );

  const handleSubmit = async () => {
    setConfirmSubmit(false);
    await run(() => submitReturn(taxReturn.id), 'Return marked as submitted');
  };

  const handleDelete = async () => {
    try {
      await deleteReturn(taxReturn.id);
      toast.success('Draft return deleted');
      navigate('/app/tax/returns');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete the tax return');
      setConfirmDelete(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Link to="/app/tax/returns" className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400">
          ← Returns
        </Link>
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          {isProvisional ? `${TAX_RETURN_KIND_LABELS[taxReturn.kind]} · ` : ''}
          {taxYearLabel(taxReturn.tax_year_code)}
        </h2>
        <TaxReturnStatusBadge status={taxReturn.status} />
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {isProvisional && taxReturn.due_date
            ? `Due ${formatCalendarDate(taxReturn.due_date)}`
            : `${formatCalendarDate(taxReturn.period_start)} – ${formatCalendarDate(taxReturn.period_end)}`}{' '}
          · {BUSINESS_TAX_ENTITY_LABELS[taxReturn.entity_type]}
          {taxReturn.submitted_at ? ` · submitted ${formatCalendarDate(taxReturn.submitted_at.slice(0, 10))}` : ''}
        </p>
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={() => void handleExport(downloadReturnPdf, 'PDF')}
            disabled={exporting}
            className={exportButton}
          >
            Download PDF
          </button>
          <button
            type="button"
            onClick={() => void handleExport(downloadReturnCsv, 'CSV')}
            disabled={exporting}
            className={exportButton}
          >
            Download CSV
          </button>
        </div>
      </div>

      {isProvisional ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <TaxCard
            title="Estimated taxable income"
            value={formatCurrency(estimatedTaxable)}
            hint={taxReturn.estimate_override != null ? 'Your estimate' : 'Projected from documents'}
          />
          <TaxCard
            title="Estimated tax for the year"
            value={formatCurrency(annualTax)}
            hint={taxReturn.rate_table_code ? `SARS ${taxReturn.rate_table_code} tables` : undefined}
          />
          {taxReturn.kind === 'irp6_p1' ? (
            <TaxCard title="Half for this period" value={formatCurrency(taxReturn.tax_liability)} />
          ) : (
            <TaxCard title="Earlier provisional payments" value={formatCurrency(taxReturn.prior_payments)} />
          )}
          <TaxCard
            title="Payment due"
            value={formatCurrency(taxReturn.amount_due)}
            hint={taxReturn.due_date ? `By ${formatCalendarDate(taxReturn.due_date)}` : undefined}
          />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <TaxCard
            title="Tax for the year"
            value={formatCurrency(taxReturn.tax_liability)}
            hint={taxReturn.rate_table_code ? `SARS ${taxReturn.rate_table_code} tables` : undefined}
          />
          <TaxCard title="Taxable income" value={formatCurrency(figures.taxable_income)} />
          <TaxCard
            title="Effective rate"
            value={`${effectiveRatePercent(taxReturn.tax_liability, figures.taxable_income)}%`}
          />
          <TaxCard
            title={settledLabel(taxReturn)}
            value={amountDueLabel(taxReturn.amount_due)}
            hint="After provisional payments and other credits"
          />
        </div>
      )}

      {taxReturn.warnings.length > 0 && (
        <ul className="space-y-1 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-200">
          {taxReturn.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      )}

      <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
        {isProvisional && (
          <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Projected full year from documents
            </h2>
          </div>
        )}
        <table className="min-w-full text-sm">
          <tbody className="text-slate-600 dark:text-slate-300">
            {taxReturnSummaryRows(taxReturn).map((row) => (
              <tr
                key={row.label}
                className={
                  row.emphasis
                    ? 'border-t border-slate-200 font-medium text-slate-800 first:border-t-0 dark:border-slate-700 dark:text-slate-100'
                    : 'border-t border-slate-100 first:border-t-0 dark:border-slate-800'
                }
              >
                <td className="px-4 py-2">{row.label}</td>
                <td className="px-4 py-2 text-right">{formatSummaryAmount(row)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <TaxAdjustmentsSection taxReturn={taxReturn} />

      {isDraft ? (
        <div className="space-y-3 rounded-lg border border-slate-200 p-4 dark:border-slate-700">
          <div className="grid gap-4 sm:grid-cols-2">
            {isProvisional && (
              <AppInputLabeled
                label="Your estimate of taxable income for the year"
                type="number"
                min={0}
                step={0.01}
                value={estimate}
                onChange={(e) => setEstimate(e.target.value)}
                disabled={busy}
                placeholder={`Blank uses the projection (${formatCurrency(figures.taxable_income)})`}
              />
            )}
            <AppInputLabeled
              label="Other credits (e.g. tax withheld by clients)"
              type="number"
              min={0}
              step={0.01}
              value={otherCredits}
              onChange={(e) => setOtherCredits(e.target.value)}
              disabled={busy}
            />
            <div className="sm:col-span-2">
              <AppLabeledAreaInput
                label="Notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={busy}
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={busy}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => void run(() => recalculateReturn(taxReturn.id), 'Return recalculated')}
              disabled={busy}
              className={secondaryButton}
            >
              Recalculate from documents
            </button>
            {confirmSubmit ? (
              <>
                <button
                  type="button"
                  onClick={() => void handleSubmit()}
                  disabled={busy}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                >
                  Confirm — freeze these figures
                </button>
                <button type="button" onClick={() => setConfirmSubmit(false)} className={secondaryButton}>
                  Cancel
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmSubmit(true)}
                disabled={busy}
                className={secondaryButton}
              >
                Mark as submitted
              </button>
            )}
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              disabled={busy}
              className="ml-auto rounded-lg px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-950/30"
            >
              Delete draft
            </button>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Marking as submitted records that you (or your accountant) filed this return with SARS. Foro does not file
            it for you.
          </p>
        </div>
      ) : (
        taxReturn.notes && (
          <p className="whitespace-pre-wrap rounded-lg border border-slate-200 px-4 py-3 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
            {taxReturn.notes}
          </p>
        )
      )}

      <DeleteConfirmationModal
        isOpen={confirmDelete}
        title="Delete draft return"
        message={`Delete the draft return for the ${taxYearLabel(taxReturn.tax_year_code).toLowerCase()}?`}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => void handleDelete()}
        isLoading={busy}
      />
    </div>
  );
}

export default TaxReturnDetailPage;
