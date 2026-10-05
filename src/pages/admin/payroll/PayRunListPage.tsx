import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LuWallet } from 'react-icons/lu';
import { AppDataTable, type AppDataTableColumn } from '@/components/elements/AppDataTable';
import AppLabeledSelectInput from '@/components/forms/AppLabledSelectInput';
import { usePayRunStore } from '@/stores/data/PayRunStore';
import { useBusinessStore } from '@/stores/data/BusinessStore';
import type { PayRun, PayRunStatus } from '@/types/payRun';
import { PAY_RUN_STATUS_LABELS, PAY_RUN_STATUS_OPTIONS } from '@/types/payRun';
import { EMPLOYEE_PAY_FREQUENCY_OPTIONS, type EmployeePayFrequency } from '@/types/employee';
import { formatCurrency } from '@/utils/currency';
import { formatCalendarDate } from '@/utils/recurrence';
import { parseMoney } from '@/utils/payrollPackage';

const columns: AppDataTableColumn<PayRun>[] = [
  {
    id: 'run_number',
    header: 'Run',
    cellClassName: 'font-medium text-slate-800 dark:text-slate-100',
    render: (row) => row.run_number,
  },
  {
    id: 'period',
    header: 'Period',
    cellClassName: 'text-slate-600 dark:text-slate-300',
    render: (row) => `${formatCalendarDate(row.period_start)} – ${formatCalendarDate(row.period_end)}`,
  },
  {
    id: 'pay_date',
    header: 'Pay date',
    cellClassName: 'text-slate-600 dark:text-slate-300',
    render: (row) => formatCalendarDate(row.pay_date),
  },
  {
    id: 'frequency',
    header: 'Frequency',
    cellClassName: 'text-slate-600 dark:text-slate-300',
    render: (row) =>
      EMPLOYEE_PAY_FREQUENCY_OPTIONS.find((o) => o.value === row.pay_frequency)?.label ?? row.pay_frequency,
  },
  {
    id: 'status',
    header: 'Status',
    cellClassName: 'text-slate-600 dark:text-slate-300',
    render: (row) => PAY_RUN_STATUS_LABELS[row.status],
  },
  {
    id: 'net',
    header: 'Net',
    cellClassName: 'text-right text-slate-800 dark:text-slate-100',
    render: (row) => formatCurrency(parseMoney(row.total_net)),
  },
];

export function PayRunListPage() {
  const navigate = useNavigate();
  const { payRuns, loading, error, fetchPayRuns } = usePayRunStore();
  const businessId = useBusinessStore((s) => s.currentBusiness?.id);
  const [status, setStatus] = useState<PayRunStatus | ''>('');
  const [frequency, setFrequency] = useState<EmployeePayFrequency | ''>('');

  useEffect(() => {
    void fetchPayRuns();
  }, [fetchPayRuns, businessId]);

  const filtered = useMemo(() => {
    return payRuns.filter((row) => {
      if (status && row.status !== status) return false;
      if (frequency && row.pay_frequency !== frequency) return false;
      return true;
    });
  }, [payRuns, status, frequency]);

  if (loading) {
    return <p className="text-sm text-slate-500 dark:text-slate-400 py-6">Loading pay runs…</p>;
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <AppLabeledSelectInput
          label="Status"
          value={status}
          onChange={(e) => setStatus((e.target.value || '') as PayRunStatus | '')}
          options={PAY_RUN_STATUS_OPTIONS}
        />
        <AppLabeledSelectInput
          label="Frequency"
          value={frequency}
          onChange={(e) => setFrequency((e.target.value || '') as EmployeePayFrequency | '')}
          options={[{ value: '', label: 'All frequencies' }, ...EMPLOYEE_PAY_FREQUENCY_OPTIONS]}
        />
      </div>
      <AppDataTable<PayRun>
        title="Pay runs"
        titleIcon={<LuWallet />}
        columns={columns}
        data={filtered}
        getRowKey={(row) => row.id}
        onRowClick={(row) => navigate(`/app/payroll/runs/${row.id}`)}
        error={error}
        emptyMessage="No pay runs yet. Create a period to calculate PAYE, UIF, and SDL."
      />
    </div>
  );
}

export default PayRunListPage;
