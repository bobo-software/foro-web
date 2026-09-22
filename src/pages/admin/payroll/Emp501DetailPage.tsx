import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { LuFileDown, LuFileSpreadsheet } from 'react-icons/lu';
import { AppPageHeader } from '@/components/ComponentsIndex';
import { useEmp501Store } from '@/stores/data/Emp501Store';
import { EMP501_STATUS_LABELS, type Emp501Status } from '@/types/emp501';
import { formatCurrency } from '@/utils/currency';
import { parseMoney } from '@/utils/payrollPackage';
import { emp201PeriodLabel } from '@/utils/emp201';
import { emp501PeriodLabel } from '@/utils/emp501';
import { formatCalendarDate } from '@/utils/recurrence';

function StatusBadge({ status }: { status: Emp501Status }) {
  const tone: Record<Emp501Status, string> = {
    draft: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
    submitted: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
  };
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${tone[status]}`}>
      {EMP501_STATUS_LABELS[status]}
    </span>
  );
}

export function Emp501DetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const current = useEmp501Store((s) => s.current);
  const loading = useEmp501Store((s) => s.loading);
  const error = useEmp501Store((s) => s.error);
  const fetchReturn = useEmp501Store((s) => s.fetchReturn);
  const recalculateReturn = useEmp501Store((s) => s.recalculateReturn);
  const submitReturn = useEmp501Store((s) => s.submitReturn);
  const downloadPdf = useEmp501Store((s) => s.downloadPdf);
  const downloadCsv = useEmp501Store((s) => s.downloadCsv);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    void fetchReturn(Number(id));
  }, [id, fetchReturn]);

  const runAction = async (label: string, fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
      toast.success(label);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Failed to ${label.toLowerCase()}`);
    } finally {
      setBusy(false);
    }
  };

  if (loading && !current) {
    return <p className="text-sm text-slate-500 dark:text-slate-400 py-6">Loading EMP501…</p>;
  }
  if (error && !current) {
    return <p className="text-sm text-red-600 py-6">{error}</p>;
  }
  if (!current) {
    return <p className="text-sm text-slate-500 dark:text-slate-400 py-6">EMP501 not found.</p>;
  }

  const period = emp501PeriodLabel(current.tax_year_code, current.period_type);
  const rows: Array<{ label: string; paye: string | number; uifEe: string | number; uifEr: string | number; sdl: string | number }> = [
    {
      label: 'Payroll',
      paye: current.payroll_paye,
      uifEe: current.payroll_uif_employee,
      uifEr: current.payroll_uif_employer,
      sdl: current.payroll_sdl,
    },
    {
      label: 'EMP201 submitted',
      paye: current.emp201_paye,
      uifEe: current.emp201_uif_employee,
      uifEr: current.emp201_uif_employer,
      sdl: current.emp201_sdl,
    },
    {
      label: 'Variance',
      paye: current.variance_payroll_vs_emp201.paye,
      uifEe: current.variance_payroll_vs_emp201.uif_employee,
      uifEr: current.variance_payroll_vs_emp201.uif_employer,
      sdl: current.variance_payroll_vs_emp201.sdl,
    },
  ];
  if (current.period_type === 'annual') {
    rows.push({
      label: 'IRP5 / IT3(a)',
      paye: current.certificate_paye,
      uifEe: current.certificate_uif_employee,
      uifEr: '—',
      sdl: '—',
    });
  }

  return (
    <div className="space-y-4">
      <AppPageHeader
        title={period}
        subtitle={`Due ${formatCalendarDate(current.due_date)} · ${formatCalendarDate(current.starts_on)} – ${formatCalendarDate(current.ends_on)}`}
        showBackButton
        onBackClick={() => navigate('/app/payroll/emp501')}
      />

      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={current.status} />
        {current.status === 'draft' && (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => void runAction('Recalculated', () => recalculateReturn(current.id))}
              className="rounded-md border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 disabled:opacity-50"
            >
              Recalculate
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void runAction('Submitted', () => submitReturn(current.id))}
              className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              Mark submitted
            </button>
          </>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={() => void runAction('PDF downloaded', () => downloadPdf(current.id))}
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 disabled:opacity-50"
        >
          <LuFileDown size={14} />
          PDF
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void runAction('CSV downloaded', () => downloadCsv(current.id))}
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 disabled:opacity-50"
        >
          <LuFileSpreadsheet size={14} />
          CSV
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">Source</th>
              <th className="px-3 py-2 text-right">PAYE</th>
              <th className="px-3 py-2 text-right">UIF (ee)</th>
              <th className="px-3 py-2 text-right">UIF (er)</th>
              <th className="px-3 py-2 text-right">SDL</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-t border-slate-100 dark:border-slate-800">
                <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-100">{row.label}</td>
                <td className="px-3 py-2 text-right">
                  {typeof row.paye === 'string' && row.paye === '—' ? '—' : formatCurrency(parseMoney(row.paye))}
                </td>
                <td className="px-3 py-2 text-right">
                  {typeof row.uifEe === 'string' && row.uifEe === '—'
                    ? '—'
                    : formatCurrency(parseMoney(row.uifEe))}
                </td>
                <td className="px-3 py-2 text-right">
                  {typeof row.uifEr === 'string' && row.uifEr === '—'
                    ? '—'
                    : formatCurrency(parseMoney(row.uifEr))}
                </td>
                <td className="px-3 py-2 text-right">
                  {typeof row.sdl === 'string' && row.sdl === '—' ? '—' : formatCurrency(parseMoney(row.sdl))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">EMP201</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2 text-right">Total due</th>
            </tr>
          </thead>
          <tbody>
            {current.emp201s.length === 0 && (
              <tr>
                <td colSpan={3} className="px-3 py-6 text-slate-500">
                  No EMP201 returns fall in this period.
                </td>
              </tr>
            )}
            {current.emp201s.map((item) => (
              <tr
                key={item.id}
                className="border-t border-slate-100 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60"
                onClick={() => navigate(`/app/payroll/emp201/${item.id}`)}
              >
                <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-100">
                  {emp201PeriodLabel(item.period_year, item.period_month)}
                </td>
                <td className="px-3 py-2 capitalize">{item.status}</td>
                <td className="px-3 py-2 text-right">{formatCurrency(parseMoney(item.total_due))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Payroll is from paid pay runs. EMP201 totals only include submitted months. Certificate totals appear on the
        annual return when a year-end batch exists. An accountant still files with SARS — this is not an e@syFile
        export.
      </p>
    </div>
  );
}

export default Emp501DetailPage;
