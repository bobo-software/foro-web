import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { LuFileDown, LuFileSpreadsheet } from 'react-icons/lu';
import { AppPageHeader } from '@/components/ComponentsIndex';
import { useEmp201Store } from '@/stores/data/Emp201Store';
import { EMP201_STATUS_LABELS, type Emp201Status } from '@/types/emp201';
import { formatCurrency } from '@/utils/currency';
import { parseMoney } from '@/utils/payrollPackage';
import { emp201PeriodLabel } from '@/utils/emp201';
import { formatCalendarDate } from '@/utils/recurrence';

function StatusBadge({ status }: { status: Emp201Status }) {
  const tone: Record<Emp201Status, string> = {
    draft: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
    submitted: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
  };
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${tone[status]}`}>
      {EMP201_STATUS_LABELS[status]}
    </span>
  );
}

export function Emp201DetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const current = useEmp201Store((s) => s.current);
  const loading = useEmp201Store((s) => s.loading);
  const error = useEmp201Store((s) => s.error);
  const fetchReturn = useEmp201Store((s) => s.fetchReturn);
  const recalculateReturn = useEmp201Store((s) => s.recalculateReturn);
  const submitReturn = useEmp201Store((s) => s.submitReturn);
  const downloadPdf = useEmp201Store((s) => s.downloadPdf);
  const downloadCsv = useEmp201Store((s) => s.downloadCsv);
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
    return <p className="text-sm text-slate-500 dark:text-slate-400 py-6">Loading EMP201…</p>;
  }
  if (error && !current) {
    return <p className="text-sm text-red-600 py-6">{error}</p>;
  }
  if (!current) {
    return <p className="text-sm text-slate-500 dark:text-slate-400 py-6">EMP201 not found.</p>;
  }

  const period = emp201PeriodLabel(current.period_year, current.period_month);
  const totals = [
    { label: 'PAYE', value: current.total_paye },
    { label: 'UIF (ee)', value: current.total_uif_employee },
    { label: 'UIF (er)', value: current.total_uif_employer },
    { label: 'SDL', value: current.total_sdl },
    { label: 'Total due', value: current.total_due },
  ];

  return (
    <div className="space-y-4">
      <AppPageHeader
        title={period}
        subtitle={`Due ${formatCalendarDate(current.due_date)} · ${current.employee_count} employee${current.employee_count === 1 ? '' : 's'} · ${current.run_count} paid run${current.run_count === 1 ? '' : 's'}`}
        showBackButton
        onBackClick={() => navigate('/app/payroll/emp201')}
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

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {totals.map((item) => (
          <div key={item.label} className="rounded-md border border-slate-200 dark:border-slate-700 px-3 py-2">
            <dt className="text-[11px] uppercase tracking-wide text-slate-400">{item.label}</dt>
            <dd className="mt-0.5 text-sm font-medium text-slate-800 dark:text-slate-100">
              {formatCurrency(parseMoney(item.value))}
            </dd>
          </div>
        ))}
      </dl>

      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">Pay run</th>
              <th className="px-3 py-2">Pay date</th>
              <th className="px-3 py-2 text-right">PAYE</th>
              <th className="px-3 py-2 text-right">UIF (ee)</th>
              <th className="px-3 py-2 text-right">UIF (er)</th>
              <th className="px-3 py-2 text-right">SDL</th>
            </tr>
          </thead>
          <tbody>
            {current.pay_runs.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-slate-500">
                  No paid pay runs have a pay date in this month.
                </td>
              </tr>
            )}
            {current.pay_runs.map((run) => (
              <tr
                key={run.id}
                className="border-t border-slate-100 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60"
                onClick={() => navigate(`/app/payroll/runs/${run.id}`)}
              >
                <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-100">{run.run_number}</td>
                <td className="px-3 py-2">{formatCalendarDate(run.pay_date)}</td>
                <td className="px-3 py-2 text-right">{formatCurrency(parseMoney(run.total_paye))}</td>
                <td className="px-3 py-2 text-right">{formatCurrency(parseMoney(run.total_uif_employee))}</td>
                <td className="px-3 py-2 text-right">{formatCurrency(parseMoney(run.total_uif_employer))}</td>
                <td className="px-3 py-2 text-right">{formatCurrency(parseMoney(run.total_sdl))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Figures are operational for this month. An accountant still files with SARS. Marking submitted only records that
        you handed the file over — Foro does not eFile.
      </p>
    </div>
  );
}

export default Emp201DetailPage;
