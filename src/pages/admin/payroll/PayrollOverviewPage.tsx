import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useEmp501Store } from '@/stores/data/Emp501Store';
import { useBusinessStore } from '@/stores/data/BusinessStore';
import { EMP501_PERIOD_LABELS } from '@/types/emp501';
import { PAY_RUN_STATUS_LABELS, type PayRunStatus } from '@/types/payRun';
import { emp201PeriodLabel } from '@/utils/emp201';
import { formatCurrency } from '@/utils/currency';
import { parseMoney } from '@/utils/payrollPackage';
import { formatCalendarDate } from '@/utils/recurrence';

function Card({
  title,
  value,
  hint,
  to,
  tone = 'default',
}: {
  title: string;
  value: string;
  hint?: string;
  to: string;
  tone?: 'default' | 'warn';
}) {
  return (
    <Link
      to={to}
      className={`block rounded-lg border px-4 py-3 no-underline hover:border-indigo-300 dark:hover:border-indigo-500 ${
        tone === 'warn'
          ? 'border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30'
          : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800'
      }`}
    >
      <p className="text-[11px] uppercase tracking-wide text-slate-400">{title}</p>
      <p className="mt-1 text-base font-semibold text-slate-800 dark:text-slate-100">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{hint}</p> : null}
    </Link>
  );
}

export function PayrollOverviewPage() {
  const businessId = useBusinessStore((s) => s.currentBusiness?.id);
  const dashboard = useEmp501Store((s) => s.dashboard);
  const loading = useEmp501Store((s) => s.loading);
  const error = useEmp501Store((s) => s.error);
  const fetchDashboard = useEmp501Store((s) => s.fetchDashboard);

  useEffect(() => {
    void fetchDashboard();
  }, [fetchDashboard, businessId]);

  if (loading && !dashboard) {
    return <p className="text-sm text-slate-500 dark:text-slate-400 py-6">Loading payroll overview…</p>;
  }
  if (error && !dashboard) {
    return <p className="text-sm text-red-600 py-6">{error}</p>;
  }
  if (!dashboard) {
    return <p className="text-sm text-slate-500 dark:text-slate-400 py-6">Select a business to see payroll status.</p>;
  }

  const emp201 = dashboard.emp201_due;
  const emp201Label = emp201PeriodLabel(emp201.period_year, emp201.period_month);
  const emp201Hint =
    emp201.status === 'submitted'
      ? 'Submitted'
      : emp201.status === 'draft'
        ? `Draft · due ${formatCalendarDate(emp201.due_date)}`
        : `Not started · due ${formatCalendarDate(emp201.due_date)}`;
  const emp501 = dashboard.emp501_due;
  const emp501To = emp501?.id
    ? `/app/payroll/emp501/${emp501.id}`
    : '/app/payroll/emp501/create';
  const emp501Value = emp501
    ? `${EMP501_PERIOD_LABELS[emp501.period_type]} ${emp501.tax_year_code}`
    : 'No tax year';
  const emp501Hint = emp501
    ? `${emp501.status === 'submitted' ? 'Submitted' : emp501.status === 'draft' ? 'Draft' : 'Not started'} · due ${formatCalendarDate(emp501.due_date)}`
    : 'Seed a tax year to reconcile';

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card
          title="Next pay date"
          value={dashboard.next_pay_date ? formatCalendarDate(dashboard.next_pay_date) : 'Set a default pay day'}
          hint={dashboard.default_pay_day ? `Day ${dashboard.default_pay_day} of the month` : 'Employer settings'}
          to="/app/payroll/employer"
        />
        <Card
          title="Unpaid pay runs"
          value={String(dashboard.unpaid_run_count)}
          hint="Draft, calculated, or approved"
          to="/app/payroll/runs"
          tone={dashboard.unpaid_run_count > 0 ? 'warn' : 'default'}
        />
        <Card
          title="EMP201 due"
          value={emp201Label}
          hint={emp201Hint}
          to={emp201.id ? `/app/payroll/emp201/${emp201.id}` : '/app/payroll/emp201/create'}
          tone={emp201.overdue ? 'warn' : 'default'}
        />
        <Card
          title="EMP501"
          value={emp501Value}
          hint={emp501Hint}
          to={emp501To}
          tone={emp501?.overdue ? 'warn' : 'default'}
        />
      </div>

      <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Unpaid pay runs</h2>
        </div>
        {dashboard.unpaid_runs.length === 0 ? (
          <p className="px-4 py-6 text-sm text-slate-500">No draft, calculated, or approved pay runs.</p>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-2">Run</th>
                <th className="px-4 py-2">Pay date</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2 text-right">Net</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.unpaid_runs.map((run) => (
                <tr key={run.id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="px-4 py-2">
                    <Link to={`/app/payroll/runs/${run.id}`} className="font-medium text-indigo-600 no-underline hover:underline">
                      {run.run_number}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-slate-600 dark:text-slate-300">
                    {formatCalendarDate(run.pay_date)}
                  </td>
                  <td className="px-4 py-2 text-slate-600 dark:text-slate-300">
                    {PAY_RUN_STATUS_LABELS[run.status as PayRunStatus] ?? run.status}
                  </td>
                  <td className="px-4 py-2 text-right text-slate-600 dark:text-slate-300">
                    {formatCurrency(parseMoney(run.total_net))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default PayrollOverviewPage;
