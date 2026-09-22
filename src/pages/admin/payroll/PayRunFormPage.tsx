import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AppPageHeader } from '@/components/ComponentsIndex';
import AppInputLabeled from '@/components/forms/AppLabledInput';
import AppLabeledSelectInput from '@/components/forms/AppLabledSelectInput';
import AppLabeledAreaInput from '@/components/forms/AppLabledAreaInput';
import { usePayRunStore } from '@/stores/data/PayRunStore';
import { usePayrollEmployerSettingsStore } from '@/stores/data/PayrollEmployerSettingsStore';
import { payRunSchema } from '@/validation/schemas';
import { EMPLOYEE_PAY_FREQUENCY_OPTIONS, type EmployeePayFrequency } from '@/types/employee';

function lastDayOfMonth(year: number, monthIndex0: number): number {
  return new Date(year, monthIndex0 + 1, 0).getDate();
}

function defaultPeriod(from = new Date()) {
  const year = from.getFullYear();
  const month = from.getMonth();
  const start = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const last = lastDayOfMonth(year, month);
  const end = `${year}-${String(month + 1).padStart(2, '0')}-${String(last).padStart(2, '0')}`;
  return { start, end, last };
}

function clampPayDate(periodEnd: string, day: number | null | undefined): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(periodEnd);
  if (!match) return periodEnd;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const last = lastDayOfMonth(year, month - 1);
  const payDay = Math.min(Math.max(day ?? last, 1), last);
  return `${year}-${String(month).padStart(2, '0')}-${String(payDay).padStart(2, '0')}`;
}

export function PayRunFormPage() {
  const navigate = useNavigate();
  const createPayRun = usePayRunStore((s) => s.createPayRun);
  const settings = usePayrollEmployerSettingsStore((s) => s.settings);
  const fetchSettings = usePayrollEmployerSettingsStore((s) => s.fetchSettings);
  const initial = useMemo(() => defaultPeriod(), []);
  const [periodStart, setPeriodStart] = useState(initial.start);
  const [periodEnd, setPeriodEnd] = useState(initial.end);
  const [payDate, setPayDate] = useState(clampPayDate(initial.end, settings?.default_pay_day));
  const [payFrequency, setPayFrequency] = useState<EmployeePayFrequency>('monthly');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    if (settings?.default_pay_day != null) {
      setPayDate(clampPayDate(periodEnd, settings.default_pay_day));
    }
  }, [settings?.default_pay_day, periodEnd]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = payRunSchema.safeParse({
      period_start: periodStart,
      period_end: periodEnd,
      pay_date: payDate,
      pay_frequency: payFrequency,
      notes,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'Check the pay run dates');
      return;
    }
    setSaving(true);
    try {
      const created = await createPayRun({
        period_start: parsed.data.period_start,
        period_end: parsed.data.period_end,
        pay_date: parsed.data.pay_date,
        pay_frequency: parsed.data.pay_frequency,
        notes: parsed.data.notes,
      });
      toast.success('Pay run created');
      navigate(`/app/payroll/runs/${created.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create pay run');
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <AppPageHeader
        title="New pay run"
        subtitle="Pick the period and pay date. Tax is calculated on the next step."
        showBackButton
        onBackClick={() => navigate('/app/payroll/runs')}
      />
      <form onSubmit={handleSubmit} className="max-w-xl space-y-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <AppInputLabeled
            label="Period start"
            type="date"
            value={periodStart}
            onChange={(e) => setPeriodStart(e.target.value)}
            required
          />
          <AppInputLabeled
            label="Period end"
            type="date"
            value={periodEnd}
            onChange={(e) => setPeriodEnd(e.target.value)}
            required
          />
        </div>
        <AppInputLabeled
          label="Pay date"
          type="date"
          value={payDate}
          onChange={(e) => setPayDate(e.target.value)}
          required
        />
        <AppLabeledSelectInput
          label="Frequency"
          value={payFrequency}
          onChange={(e) => setPayFrequency(e.target.value as EmployeePayFrequency)}
          options={EMPLOYEE_PAY_FREQUENCY_OPTIONS}
          required
        />
        <AppLabeledAreaInput label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {saving ? 'Creating…' : 'Create draft'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default PayRunFormPage;
