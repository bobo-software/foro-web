import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AppPageHeader } from '@/components/ComponentsIndex';
import AppLabeledSelectInput from '@/components/forms/AppLabledSelectInput';
import { useYearEndStore } from '@/stores/data/YearEndStore';
import { yearEndSchema } from '@/validation/schemas';
import { formatCalendarDate } from '@/utils/recurrence';

export function YearEndFormPage() {
  const navigate = useNavigate();
  const createBatch = useYearEndStore((s) => s.createBatch);
  const taxYears = useYearEndStore((s) => s.taxYears);
  const fetchTaxYears = useYearEndStore((s) => s.fetchTaxYears);
  const [taxYearId, setTaxYearId] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void fetchTaxYears();
  }, [fetchTaxYears]);

  useEffect(() => {
    if (!taxYearId && taxYears[0]) setTaxYearId(String(taxYears[0].id));
  }, [taxYears, taxYearId]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = yearEndSchema.safeParse({ tax_year_id: Number(taxYearId) });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'Choose a tax year');
      return;
    }
    setSaving(true);
    try {
      const created = await createBatch({ tax_year_id: parsed.data.tax_year_id });
      toast.success('Year-end certificates generated from paid pay runs');
      navigate(`/app/payroll/year-end/${created.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate year-end certificates');
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <AppPageHeader
        title="New year-end certificates"
        subtitle="One IRP5 or IT3(a) per employee from paid pay runs in the selected tax year."
        showBackButton
        onBackClick={() => navigate('/app/payroll/year-end')}
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

export default YearEndFormPage;
