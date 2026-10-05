import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AppPageHeader } from '@/components/ComponentsIndex';
import AppLabeledSelectInput from '@/components/forms/AppLabledSelectInput';
import { useEmp501Store } from '@/stores/data/Emp501Store';
import { emp501Schema } from '@/validation/schemas';
import { EMP501_PERIOD_OPTIONS, type Emp501PeriodType } from '@/types/emp501';
import { formatCalendarDate } from '@/utils/recurrence';

export function Emp501FormPage() {
  const navigate = useNavigate();
  const createReturn = useEmp501Store((s) => s.createReturn);
  const taxYears = useEmp501Store((s) => s.taxYears);
  const fetchTaxYears = useEmp501Store((s) => s.fetchTaxYears);
  const [taxYearId, setTaxYearId] = useState('');
  const [periodType, setPeriodType] = useState<Emp501PeriodType>('interim');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void fetchTaxYears();
  }, [fetchTaxYears]);

  useEffect(() => {
    if (!taxYearId && taxYears[0]) setTaxYearId(String(taxYears[0].id));
  }, [taxYears, taxYearId]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = emp501Schema.safeParse({
      tax_year_id: Number(taxYearId),
      period_type: periodType,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'Choose a tax year and period');
      return;
    }
    setSaving(true);
    try {
      const created = await createReturn({
        tax_year_id: parsed.data.tax_year_id,
        period_type: parsed.data.period_type,
      });
      toast.success('EMP501 generated from paid pay runs and EMP201s');
      navigate(`/app/payroll/emp501/${created.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate EMP501');
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <AppPageHeader
        title="New EMP501"
        subtitle="Reconcile paid payroll against submitted EMP201s for the interim (Mar–Aug) or full tax year."
        showBackButton
        onBackClick={() => navigate('/app/payroll/emp501')}
      />
      <form
        onSubmit={handleSubmit}
        className="max-w-xl space-y-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4"
      >
        <AppLabeledSelectInput
          label="Tax year"
          value={taxYearId}
          onChange={(e) => setTaxYearId(e.target.value)}
          options={taxYears.map((year) => ({
            value: String(year.id),
            label: `${year.code} (${formatCalendarDate(year.starts_on)} – ${formatCalendarDate(year.ends_on)})`,
          }))}
          required
        />
        <AppLabeledSelectInput
          label="Period"
          value={periodType}
          onChange={(e) => setPeriodType(e.target.value as Emp501PeriodType)}
          options={EMP501_PERIOD_OPTIONS}
          required
        />
        <button
          type="submit"
          disabled={saving || !taxYearId}
          className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {saving ? 'Generating…' : 'Generate'}
        </button>
      </form>
    </div>
  );
}

export default Emp501FormPage;
