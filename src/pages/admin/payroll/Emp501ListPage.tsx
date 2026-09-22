import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LuScale } from 'react-icons/lu';
import { AppDataTable, type AppDataTableColumn } from '@/components/elements/AppDataTable';
import AppLabeledSelectInput from '@/components/forms/AppLabledSelectInput';
import { useEmp501Store } from '@/stores/data/Emp501Store';
import { useBusinessStore } from '@/stores/data/BusinessStore';
import type { Emp501Return, Emp501Status } from '@/types/emp501';
import { EMP501_PERIOD_LABELS, EMP501_STATUS_LABELS, EMP501_STATUS_OPTIONS } from '@/types/emp501';
import { formatCurrency } from '@/utils/currency';
import { parseMoney } from '@/utils/payrollPackage';
import { formatCalendarDate } from '@/utils/recurrence';

const columns: AppDataTableColumn<Emp501Return>[] = [
  {
    id: 'period',
    header: 'Period',
    cellClassName: 'font-medium text-slate-800 dark:text-slate-100',
    render: (row) => `${EMP501_PERIOD_LABELS[row.period_type]} ${row.tax_year_code}`,
  },
  {
    id: 'dates',
    header: 'Dates',
    cellClassName: 'text-slate-600 dark:text-slate-300',
    render: (row) => `${formatCalendarDate(row.starts_on)} – ${formatCalendarDate(row.ends_on)}`,
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
    render: (row) => EMP501_STATUS_LABELS[row.status],
  },
  {
    id: 'due_amount',
    header: 'Payroll due',
    cellClassName: 'text-right text-slate-600 dark:text-slate-300',
    render: (row) => formatCurrency(parseMoney(row.payroll_due)),
  },
];

export function Emp501ListPage() {
  const navigate = useNavigate();
  const { returns, loading, error, fetchReturns } = useEmp501Store();
  const businessId = useBusinessStore((s) => s.currentBusiness?.id);
  const [status, setStatus] = useState<Emp501Status | ''>('');

  useEffect(() => {
    void fetchReturns();
  }, [fetchReturns, businessId]);

  const filtered = useMemo(
    () => returns.filter((row) => !status || row.status === status),
    [returns, status],
  );

  if (loading) {
    return <p className="text-sm text-slate-500 dark:text-slate-400 py-6">Loading EMP501…</p>;
  }

  return (
    <div className="space-y-4">
      <AppLabeledSelectInput
        label="Status"
        value={status}
        onChange={(e) => setStatus((e.target.value || '') as Emp501Status | '')}
        options={EMP501_STATUS_OPTIONS}
      />
      <AppDataTable<Emp501Return>
        title="EMP501"
        titleIcon={<LuScale />}
        columns={columns}
        data={filtered}
        getRowKey={(row) => row.id}
        onRowClick={(row) => navigate(`/app/payroll/emp501/${row.id}`)}
        error={error}
        emptyMessage="No EMP501 reconciliations yet. Generate an interim or annual return from paid pay runs and EMP201s."
      />
    </div>
  );
}

export default Emp501ListPage;
