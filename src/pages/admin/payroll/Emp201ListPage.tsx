import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LuFileSpreadsheet } from 'react-icons/lu';
import { AppDataTable, type AppDataTableColumn } from '@/components/elements/AppDataTable';
import AppLabeledSelectInput from '@/components/forms/AppLabledSelectInput';
import { useEmp201Store } from '@/stores/data/Emp201Store';
import { useBusinessStore } from '@/stores/data/BusinessStore';
import type { Emp201Return, Emp201Status } from '@/types/emp201';
import { EMP201_STATUS_LABELS, EMP201_STATUS_OPTIONS, EMP201_MONTH_OPTIONS } from '@/types/emp201';
import { formatCurrency } from '@/utils/currency';
import { parseMoney } from '@/utils/payrollPackage';
import { emp201PeriodLabel } from '@/utils/emp201';
import { formatCalendarDate } from '@/utils/recurrence';

const columns: AppDataTableColumn<Emp201Return>[] = [
  {
    id: 'period',
    header: 'Period',
    cellClassName: 'font-medium text-slate-800 dark:text-slate-100',
    render: (row) => emp201PeriodLabel(row.period_year, row.period_month),
  },
  {
    id: 'due',
    header: 'Due',
    cellClassName: 'text-slate-600 dark:text-slate-300',
    render: (row) => formatCalendarDate(row.due_date),
  },
  {
    id: 'status',
    header: 'Status',
    cellClassName: 'text-slate-600 dark:text-slate-300',
    render: (row) => EMP201_STATUS_LABELS[row.status],
  },
  {
    id: 'runs',
    header: 'Runs',
    cellClassName: 'text-slate-600 dark:text-slate-300',
    render: (row) => String(row.run_count),
  },
  {
    id: 'due_amount',
    header: 'Total due',
    cellClassName: 'text-right text-slate-800 dark:text-slate-100',
    render: (row) => formatCurrency(parseMoney(row.total_due)),
  },
];

export function Emp201ListPage() {
  const navigate = useNavigate();
  const { returns, loading, error, fetchReturns } = useEmp201Store();
  const businessId = useBusinessStore((s) => s.currentBusiness?.id);
  const [status, setStatus] = useState<Emp201Status | ''>('');
  const [month, setMonth] = useState('');

  useEffect(() => {
    void fetchReturns();
  }, [fetchReturns, businessId]);

  const filtered = useMemo(() => {
    return returns.filter((row) => {
      if (status && row.status !== status) return false;
      if (month && String(row.period_month) !== month) return false;
      return true;
    });
  }, [returns, status, month]);

  if (loading) {
    return <p className="text-sm text-slate-500 dark:text-slate-400 py-6">Loading EMP201 returns…</p>;
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <AppLabeledSelectInput
          label="Status"
          value={status}
          onChange={(e) => setStatus((e.target.value || '') as Emp201Status | '')}
          options={EMP201_STATUS_OPTIONS}
        />
        <AppLabeledSelectInput
          label="Month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          options={[{ value: '', label: 'All months' }, ...EMP201_MONTH_OPTIONS]}
        />
      </div>
      <AppDataTable<Emp201Return>
        title="EMP201"
        titleIcon={<LuFileSpreadsheet />}
        columns={columns}
        data={filtered}
        getRowKey={(row) => row.id}
        onRowClick={(row) => navigate(`/app/payroll/emp201/${row.id}`)}
        error={error}
        emptyMessage="No EMP201 returns yet. Generate a month from paid pay runs."
      />
    </div>
  );
}

export default Emp201ListPage;
