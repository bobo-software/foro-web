import { useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AppPageHeader } from '@/components/ComponentsIndex';
import AppLabeledSelectInput from '@/components/forms/AppLabledSelectInput';
import { useEmp201Store } from '@/stores/data/Emp201Store';
import { EMP201_MONTH_OPTIONS, emp201YearOptions } from '@/types/emp201';
import { emp201Schema } from '@/validation/schemas';

export function Emp201FormPage() {
  const navigate = useNavigate();
  const createReturn = useEmp201Store((s) => s.createReturn);
  const now = useMemo(() => new Date(), []);
  const [periodYear, setPeriodYear] = useState(String(now.getFullYear()));
  const [periodMonth, setPeriodMonth] = useState(String(now.getMonth() + 1));
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = emp201Schema.safeParse({
      period_year: Number(periodYear),
      period_month: Number(periodMonth),
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'Choose a month');
      return;
    }
    setSaving(true);
    try {
      const created = await createReturn({
        period_year: parsed.data.period_year,
        period_month: parsed.data.period_month,
      });
      toast.success('EMP201 generated from paid pay runs');
      navigate(`/app/payroll/emp201/${created.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate EMP201');
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <AppPageHeader
        title="New EMP201"
        subtitle="Totals come from paid pay runs whose pay date falls in this calendar month."
        showBackButton
        onBackClick={() => navigate('/app/payroll/emp201')}
      />
      <form
        onSubmit={handleSubmit}
        className="max-w-xl space-y-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <AppLabeledSelectInput
            label="Year"
            value={periodYear}
            onChange={(e) => setPeriodYear(e.target.value)}
            options={emp201YearOptions(now)}
            required
          />
          <AppLabeledSelectInput
            label="Month"
            value={periodMonth}
            onChange={(e) => setPeriodMonth(e.target.value)}
            options={EMP201_MONTH_OPTIONS}
            required
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {saving ? 'Generating…' : 'Generate'}
        </button>
      </form>
    </div>
  );
}

export default Emp201FormPage;
