import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LuScrollText } from 'react-icons/lu';
import { AppDataTable, type AppDataTableColumn } from '@/components/elements/AppDataTable';
import AppLabeledSelectInput from '@/components/forms/AppLabledSelectInput';
import { useYearEndStore } from '@/stores/data/YearEndStore';
import { useBusinessStore } from '@/stores/data/BusinessStore';
import type { YearEndBatch, YearEndStatus } from '@/types/yearEnd';
import { YEAR_END_STATUS_LABELS, YEAR_END_STATUS_OPTIONS } from '@/types/yearEnd';
import { formatCalendarDate } from '@/utils/recurrence';

const columns: AppDataTableColumn<YearEndBatch>[] = [
  {
    id: 'tax_year',
    header: 'Tax year',
    cellClassName: 'font-medium text-slate-800 dark:text-slate-100',
    render: (row) => row.tax_year_code,
  },
  {
    id: 'period',
    header: 'Period',
    cellClassName: 'text-slate-600 dark:text-slate-300',
    render: (row) => `${formatCalendarDate(row.starts_on)} – ${formatCalendarDate(row.ends_on)}`,
  },
  {
    id: 'status',
    header: 'Status',
    cellClassName: 'text-slate-600 dark:text-slate-300',
    render: (row) => YEAR_END_STATUS_LABELS[row.status],
  },
  {
    id: 'certs',
    header: 'Certificates',
    cellClassName: 'text-slate-600 dark:text-slate-300',
    render: (row) => `${row.irp5_count} IRP5 · ${row.it3_count} IT3(a)`,
  },
];

export function YearEndListPage() {
  const navigate = useNavigate();
  const { batches, loading, error, fetchBatches } = useYearEndStore();
  const businessId = useBusinessStore((s) => s.currentBusiness?.id);
  const [status, setStatus] = useState<YearEndStatus | ''>('');

  useEffect(() => {
    void fetchBatches();
  }, [fetchBatches, businessId]);

  const filtered = useMemo(
    () => batches.filter((row) => !status || row.status === status),
    [batches, status],
  );

  if (loading) {
    return <p className="text-sm text-slate-500 dark:text-slate-400 py-6">Loading year-end certificates…</p>;
  }

  return (
    <div className="space-y-4">
      <AppLabeledSelectInput
        label="Status"
        value={status}
        onChange={(e) => setStatus((e.target.value || '') as YearEndStatus | '')}
        options={YEAR_END_STATUS_OPTIONS}
      />
      <AppDataTable<YearEndBatch>
        title="Year-end"
        titleIcon={<LuScrollText />}
        columns={columns}
        data={filtered}
        getRowKey={(row) => row.id}
        onRowClick={(row) => navigate(`/app/payroll/year-end/${row.id}`)}
        error={error}
        emptyMessage="No year-end batches yet. Generate IRP5 / IT3(a) certificates from paid pay runs."
      />
    </div>
  );
}

export default YearEndListPage;
