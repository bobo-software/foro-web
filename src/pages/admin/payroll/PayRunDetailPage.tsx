import { Fragment, useEffect, useMemo, useState, type FormEvent, type MouseEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { LuFileDown, LuFileSpreadsheet } from 'react-icons/lu';
import { AppPageHeader } from '@/components/ComponentsIndex';
import AppInputLabeled from '@/components/forms/AppLabledInput';
import AppLabeledSelectInput from '@/components/forms/AppLabledSelectInput';
import { usePayRunStore } from '@/stores/data/PayRunStore';
import { usePayrollComponentTypeStore } from '@/stores/data/PayrollComponentTypeStore';
import { formatCurrency } from '@/utils/currency';
import { parseMoney } from '@/utils/payrollPackage';
import { isPayslipReady } from '@/utils/payslipPdf';
import { formatCalendarDate } from '@/utils/recurrence';
import { EMPLOYEE_PAY_FREQUENCY_OPTIONS } from '@/types/employee';
import { PAY_RUN_STATUS_LABELS, payRunEmployeeName, type PayRunStatus } from '@/types/payRun';

function StatusBadge({ status }: { status: PayRunStatus }) {
  const tone: Record<PayRunStatus, string> = {
    draft: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
    calculated: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200',
    approved: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
    paid: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
    cancelled: 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
  };
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${tone[status]}`}>
      {PAY_RUN_STATUS_LABELS[status]}
    </span>
  );
}

function Totals({
  gross,
  paye,
  uifEmployee,
  uifEmployer,
  sdl,
  net,
}: {
  gross: string;
  paye: string;
  uifEmployee: string;
  uifEmployer: string;
  sdl: string;
  net: string;
}) {
  const items = [
    { label: 'Gross', value: gross },
    { label: 'PAYE', value: paye },
    { label: 'UIF (ee)', value: uifEmployee },
    { label: 'UIF (er)', value: uifEmployer },
    { label: 'SDL', value: sdl },
    { label: 'Net', value: net },
  ];
  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {items.map((item) => (
        <div key={item.label} className="rounded-md border border-slate-200 dark:border-slate-700 px-3 py-2">
          <dt className="text-[11px] uppercase tracking-wide text-slate-400">{item.label}</dt>
          <dd className="mt-0.5 text-sm font-medium text-slate-800 dark:text-slate-100">
            {formatCurrency(parseMoney(item.value))}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function PayRunDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const current = usePayRunStore((s) => s.current);
  const loading = usePayRunStore((s) => s.loading);
  const error = usePayRunStore((s) => s.error);
  const fetchPayRun = usePayRunStore((s) => s.fetchPayRun);
  const calculatePayRun = usePayRunStore((s) => s.calculatePayRun);
  const sendBackPayRun = usePayRunStore((s) => s.sendBackPayRun);
  const approvePayRun = usePayRunStore((s) => s.approvePayRun);
  const payPayRun = usePayRunStore((s) => s.payPayRun);
  const cancelPayRun = usePayRunStore((s) => s.cancelPayRun);
  const addOnceOff = usePayRunStore((s) => s.addOnceOff);
  const removeOnceOff = usePayRunStore((s) => s.removeOnceOff);
  const downloadPayslip = usePayRunStore((s) => s.downloadPayslip);
  const downloadAllPayslips = usePayRunStore((s) => s.downloadAllPayslips);
  const downloadCsv = usePayRunStore((s) => s.downloadCsv);
  const types = usePayrollComponentTypeStore((s) => s.types);
  const fetchTypes = usePayrollComponentTypeStore((s) => s.fetchTypes);
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [onceOffEmployeeId, setOnceOffEmployeeId] = useState('');
  const [onceOffTypeId, setOnceOffTypeId] = useState('');
  const [onceOffAmount, setOnceOffAmount] = useState('');

  useEffect(() => {
    if (!id) return;
    void fetchPayRun(Number(id));
    void fetchTypes();
  }, [id, fetchPayRun, fetchTypes]);

  const earningTypes = useMemo(
    () =>
      types.filter(
        (type) =>
          type.direction === 'earning' &&
          type.id != null &&
          !['PAYE', 'UIF_EE', 'UIF_ER', 'SDL'].includes(type.code),
      ),
    [types],
  );

  const runAction = async (label: string, fn: () => Promise<unknown>) => {
    if (current?.id == null) return;
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

  const handleDownloadPayslip = async (event: MouseEvent, lineId: number) => {
    event.stopPropagation();
    setBusy(true);
    try {
      await downloadPayslip(lineId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to download payslip');
    } finally {
      setBusy(false);
    }
  };

  const handleDownloadAll = async () => {
    setBusy(true);
    try {
      await downloadAllPayslips();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to download payslips');
    } finally {
      setBusy(false);
    }
  };

  const handleOnceOff = async (e: FormEvent) => {
    e.preventDefault();
    if (current?.id == null) return;
    const amount = Number(onceOffAmount);
    if (!onceOffEmployeeId || !onceOffTypeId || !Number.isFinite(amount) || amount <= 0) {
      toast.error('Choose an employee, earning, and amount');
      return;
    }
    setBusy(true);
    try {
      await addOnceOff(current.id, {
        employeeId: Number(onceOffEmployeeId),
        componentTypeId: Number(onceOffTypeId),
        amount,
      });
      setOnceOffAmount('');
      toast.success('Once-off earning added. Calculate again to include it in PAYE.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add once-off earning');
    } finally {
      setBusy(false);
    }
  };

  if (loading && !current) {
    return <p className="text-sm text-slate-500 dark:text-slate-400 py-6">Loading pay run…</p>;
  }
  if (error && !current) {
    return <p className="text-sm text-red-600 py-6">{error}</p>;
  }
  if (!current) {
    return <p className="text-sm text-slate-500 dark:text-slate-400 py-6">Pay run not found.</p>;
  }

  const frequencyLabel =
    EMPLOYEE_PAY_FREQUENCY_OPTIONS.find((o) => o.value === current.pay_frequency)?.label ?? current.pay_frequency;

  return (
    <div className="space-y-4">
      <AppPageHeader
        title={current.run_number}
        subtitle={`${formatCalendarDate(current.period_start)} – ${formatCalendarDate(current.period_end)} · Pay ${formatCalendarDate(current.pay_date)} · ${frequencyLabel}`}
        showBackButton
        onBackClick={() => navigate('/app/payroll/runs')}
      />

      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={current.status} />
        {current.status === 'draft' && (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => void runAction('Calculated', () => calculatePayRun(current.id))}
              className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              Calculate
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void runAction('Cancelled', () => cancelPayRun(current.id))}
              className="rounded-md border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 disabled:opacity-50"
            >
              Cancel
            </button>
          </>
        )}
        {current.status === 'calculated' && (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => void runAction('Approved', () => approvePayRun(current.id))}
              className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              Approve
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void runAction('Sent back to draft', () => sendBackPayRun(current.id))}
              className="rounded-md border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 disabled:opacity-50"
            >
              Send back
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void runAction('Cancelled', () => cancelPayRun(current.id))}
              className="rounded-md border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 disabled:opacity-50"
            >
              Cancel
            </button>
          </>
        )}
        {current.status === 'approved' && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void runAction('Marked as paid', () => payPayRun(current.id))}
            className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            Mark paid
          </button>
        )}
        {isPayslipReady(current.status) && current.lines.length > 0 && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleDownloadAll()}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 disabled:opacity-50"
          >
            <LuFileDown size={14} />
            Download all
          </button>
        )}
        {current.lines.length > 0 && current.status !== 'cancelled' && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void runAction('CSV downloaded', () => downloadCsv())}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 disabled:opacity-50"
          >
            <LuFileSpreadsheet size={14} />
            CSV
          </button>
        )}
      </div>

      <Totals
        gross={current.total_gross}
        paye={current.total_paye}
        uifEmployee={current.total_uif_employee}
        uifEmployer={current.total_uif_employer}
        sdl={current.total_sdl}
        net={current.total_net}
      />

      {current.status === 'draft' && current.lines.length > 0 && (
        <form
          onSubmit={handleOnceOff}
          className="grid gap-3 sm:grid-cols-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3"
        >
          <AppLabeledSelectInput
            label="Employee"
            value={onceOffEmployeeId}
            onChange={(e) => setOnceOffEmployeeId(e.target.value)}
            options={current.lines.map((line) => ({
              value: String(line.employee_id),
              label: payRunEmployeeName(line),
            }))}
          />
          <AppLabeledSelectInput
            label="Once-off earning"
            value={onceOffTypeId}
            onChange={(e) => setOnceOffTypeId(e.target.value)}
            options={earningTypes
              .filter((type) => type.id != null)
              .map((type) => ({ value: String(type.id), label: type.name }))}
          />
          <AppInputLabeled
            label="Amount"
            type="number"
            step={0.01}
            min={0}
            value={onceOffAmount}
            onChange={(e) => setOnceOffAmount(e.target.value)}
          />
          <div className="flex items-end">
            <button
              type="submit"
              disabled={busy}
              className="rounded-md bg-slate-800 dark:bg-slate-200 px-3 py-1.5 text-xs font-medium text-white dark:text-slate-900 disabled:opacity-50"
            >
              Add once-off
            </button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">Employee</th>
              <th className="px-3 py-2 text-right">Gross</th>
              <th className="px-3 py-2 text-right">PAYE</th>
              <th className="px-3 py-2 text-right">UIF</th>
              <th className="px-3 py-2 text-right">SDL</th>
              <th className="px-3 py-2 text-right">Net</th>
              {isPayslipReady(current.status) && <th className="px-3 py-2 w-10" />}
            </tr>
          </thead>
          <tbody>
            {current.lines.length === 0 && (
              <tr>
                <td colSpan={isPayslipReady(current.status) ? 7 : 6} className="px-3 py-6 text-slate-500">
                  No employees match this frequency and period.
                </td>
              </tr>
            )}
            {current.lines.map((line) => {
              const open = expanded === line.id;
              return (
                <Fragment key={line.id}>
                  <tr
                    className="border-t border-slate-100 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60"
                    onClick={() => setExpanded(open ? null : line.id)}
                  >
                    <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-100">
                      {payRunEmployeeName(line)}
                    </td>
                    <td className="px-3 py-2 text-right">{formatCurrency(parseMoney(line.gross))}</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(parseMoney(line.paye))}</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(parseMoney(line.uif_employee))}</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(parseMoney(line.sdl))}</td>
                    <td className="px-3 py-2 text-right font-medium">{formatCurrency(parseMoney(line.net))}</td>
                    {isPayslipReady(current.status) && (
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={(event) => void handleDownloadPayslip(event, line.id)}
                          className="inline-flex rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200 transition-colors disabled:opacity-50"
                          title={`Download payslip for ${payRunEmployeeName(line)}`}
                          aria-label={`Download payslip for ${payRunEmployeeName(line)}`}
                        >
                          <LuFileDown size={14} />
                        </button>
                      </td>
                    )}
                  </tr>
                  {open && (
                    <tr className="bg-slate-50/80 dark:bg-slate-900/40">
                      <td colSpan={isPayslipReady(current.status) ? 7 : 6} className="px-3 py-2">
                        <ul className="space-y-1">
                          {line.items.map((item) => (
                            <li
                              key={item.id}
                              className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300"
                            >
                              <span>
                                {item.name}
                                {item.is_once_off ? ' (once-off)' : ''}
                              </span>
                              <span className="flex items-center gap-2">
                                {formatCurrency(parseMoney(item.amount))}
                                {current.status === 'draft' && item.is_once_off && (
                                  <button
                                    type="button"
                                    className="text-red-600 hover:underline"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      void removeOnceOff(current.id, item.id).then(
                                        () => toast.success('Once-off removed'),
                                        (err: unknown) =>
                                          toast.error(err instanceof Error ? err.message : 'Failed to remove'),
                                      );
                                    }}
                                  >
                                    Remove
                                  </button>
                                )}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Figures are operational for this pay run. An accountant still files with SARS. Bankserv export is not in this
        phase — use net per employee for a manual EFT.
      </p>
    </div>
  );
}

export default PayRunDetailPage;
