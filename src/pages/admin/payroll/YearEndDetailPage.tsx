import { useEffect, useState, type MouseEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { LuFileDown } from 'react-icons/lu';
import { AppPageHeader } from '@/components/ComponentsIndex';
import { useYearEndStore } from '@/stores/data/YearEndStore';
import {
  YEAR_END_STATUS_LABELS,
  YEAR_END_TYPE_LABELS,
  yearEndEmployeeName,
  type YearEndStatus,
} from '@/types/yearEnd';
import { formatCurrency } from '@/utils/currency';
import { parseMoney } from '@/utils/payrollPackage';
import { formatCalendarDate } from '@/utils/recurrence';

function StatusBadge({ status }: { status: YearEndStatus }) {
  const tone: Record<YearEndStatus, string> = {
    draft: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
    issued: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
  };
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${tone[status]}`}>
      {YEAR_END_STATUS_LABELS[status]}
    </span>
  );
}

export function YearEndDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const current = useYearEndStore((s) => s.current);
  const loading = useYearEndStore((s) => s.loading);
  const error = useYearEndStore((s) => s.error);
  const fetchBatch = useYearEndStore((s) => s.fetchBatch);
  const recalculateBatch = useYearEndStore((s) => s.recalculateBatch);
  const issueBatch = useYearEndStore((s) => s.issueBatch);
  const downloadCertificate = useYearEndStore((s) => s.downloadCertificate);
  const downloadAll = useYearEndStore((s) => s.downloadAll);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    void fetchBatch(Number(id));
  }, [id, fetchBatch]);

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

  const handleDownload = async (event: MouseEvent, certificateId: number) => {
    event.stopPropagation();
    await runAction('PDF downloaded', () => downloadCertificate(certificateId));
  };

  if (loading && !current) {
    return <p className="text-sm text-slate-500 dark:text-slate-400 py-6">Loading year-end certificates…</p>;
  }
  if (error && !current) {
    return <p className="text-sm text-red-600 py-6">{error}</p>;
  }
  if (!current) {
    return <p className="text-sm text-slate-500 dark:text-slate-400 py-6">Year-end batch not found.</p>;
  }

  return (
    <div className="space-y-4">
      <AppPageHeader
        title={`Tax year ${current.tax_year_code}`}
        subtitle={`${formatCalendarDate(current.starts_on)} – ${formatCalendarDate(current.ends_on)} · ${current.irp5_count} IRP5 · ${current.it3_count} IT3(a)`}
        showBackButton
        onBackClick={() => navigate('/app/payroll/year-end')}
      />

      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={current.status} />
        {current.status === 'draft' && (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => void runAction('Recalculated', () => recalculateBatch(current.id))}
              className="rounded-md border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 disabled:opacity-50"
            >
              Recalculate
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void runAction('Issued', () => issueBatch(current.id))}
              className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              Mark issued
            </button>
          </>
        )}
        {current.certificates.length > 0 && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void runAction('PDFs downloaded', () => downloadAll())}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 disabled:opacity-50"
          >
            <LuFileDown size={14} />
            Download all
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">Employee</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2 text-right">Gross</th>
              <th className="px-3 py-2 text-right">PAYE</th>
              <th className="px-3 py-2 text-right">UIF</th>
              <th className="px-3 py-2 w-10" />
            </tr>
          </thead>
          <tbody>
            {current.certificates.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-slate-500">
                  No paid pay runs fall in this tax year.
                </td>
              </tr>
            )}
            {current.certificates.map((cert) => (
              <tr key={cert.id} className="border-t border-slate-100 dark:border-slate-800">
                <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-100">
                  {yearEndEmployeeName(cert)}
                </td>
                <td className="px-3 py-2">{YEAR_END_TYPE_LABELS[cert.certificate_type]}</td>
                <td className="px-3 py-2 text-right">{formatCurrency(parseMoney(cert.gross))}</td>
                <td className="px-3 py-2 text-right">{formatCurrency(parseMoney(cert.paye))}</td>
                <td className="px-3 py-2 text-right">{formatCurrency(parseMoney(cert.uif_employee))}</td>
                <td className="px-3 py-2 text-right">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={(event) => void handleDownload(event, cert.id)}
                    className="inline-flex rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200 transition-colors disabled:opacity-50"
                    title={`Download ${YEAR_END_TYPE_LABELS[cert.certificate_type]} for ${yearEndEmployeeName(cert)}`}
                    aria-label={`Download ${YEAR_END_TYPE_LABELS[cert.certificate_type]} for ${yearEndEmployeeName(cert)}`}
                  >
                    <LuFileDown size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        IRP5 if PAYE was withheld; IT3(a) otherwise. Figures are operational from paid pay runs. An accountant still
        files with SARS — this is not an e@syFile export.
      </p>
    </div>
  );
}

export default YearEndDetailPage;
