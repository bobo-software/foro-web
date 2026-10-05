import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import AppInputLabeled from '@/components/forms/AppLabledInput';
import AppLabeledAreaInput from '@/components/forms/AppLabledAreaInput';
import AppLabeledCheckbox from '@/components/forms/AppLabeledCheckbox';
import { useBusinessStore } from '@/stores/data/BusinessStore';
import { usePayrollEmployerSettingsStore } from '@/stores/data/PayrollEmployerSettingsStore';
import { payrollEmployerSettingsSchema } from '@/validation/schemas';

export function EmployerSettingsPage() {
  const businessId = useBusinessStore((s) => s.currentBusiness?.id);
  const settings = usePayrollEmployerSettingsStore((s) => s.settings);
  const loading = usePayrollEmployerSettingsStore((s) => s.loading);
  const saving = usePayrollEmployerSettingsStore((s) => s.saving);
  const error = usePayrollEmployerSettingsStore((s) => s.error);
  const fetchSettings = usePayrollEmployerSettingsStore((s) => s.fetchSettings);
  const saveSettings = usePayrollEmployerSettingsStore((s) => s.saveSettings);

  const [payeReference, setPayeReference] = useState('');
  const [uifReference, setUifReference] = useState('');
  const [sdlReference, setSdlReference] = useState('');
  const [sdlLiable, setSdlLiable] = useState(true);
  const [defaultPayDay, setDefaultPayDay] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    void fetchSettings();
  }, [fetchSettings, businessId]);

  useEffect(() => {
    setPayeReference(settings?.paye_reference ?? '');
    setUifReference(settings?.uif_reference ?? '');
    setSdlReference(settings?.sdl_reference ?? '');
    setSdlLiable(settings?.sdl_liable ?? true);
    setDefaultPayDay(settings?.default_pay_day != null ? String(settings.default_pay_day) : '');
    setNotes(settings?.notes ?? '');
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payDay = defaultPayDay.trim() === '' ? null : Number(defaultPayDay);
    const validation = payrollEmployerSettingsSchema.safeParse({
      paye_reference: payeReference,
      uif_reference: uifReference,
      sdl_reference: sdlReference,
      sdl_liable: sdlLiable,
      default_pay_day: payDay,
      notes,
    });
    if (!validation.success) {
      toast.error(validation.error.issues[0]?.message ?? 'Please check your input');
      return;
    }
    try {
      await saveSettings({
        paye_reference: payeReference.trim() || null,
        uif_reference: uifReference.trim() || null,
        sdl_reference: sdlReference.trim() || null,
        sdl_liable: sdlLiable,
        default_pay_day: payDay,
        notes: notes.trim() || undefined,
      });
      toast.success('Employer settings saved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save employer settings');
    }
  };

  if (loading) {
    return <p className="text-sm text-slate-500 dark:text-slate-400 py-6">Loading employer settings…</p>;
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm"
    >
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
        SARS employer references used on EMP201 and payslips. You can fill these in later.
      </p>
      {error && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <AppInputLabeled
          label="PAYE reference"
          value={payeReference}
          onChange={(e) => setPayeReference(e.target.value)}
          disabled={saving}
        />
        <AppInputLabeled
          label="UIF reference"
          value={uifReference}
          onChange={(e) => setUifReference(e.target.value)}
          disabled={saving}
        />
        <AppInputLabeled
          label="SDL reference"
          value={sdlReference}
          onChange={(e) => setSdlReference(e.target.value)}
          disabled={saving}
        />
        <AppInputLabeled
          label="Default pay day"
          type="number"
          min={1}
          max={31}
          value={defaultPayDay}
          onChange={(e) => setDefaultPayDay(e.target.value)}
          disabled={saving}
          placeholder="e.g. 25"
        />
        <div className="sm:col-span-2">
          <AppLabeledCheckbox
            label="This business is liable for SDL"
            checked={sdlLiable}
            onChange={setSdlLiable}
            disabled={saving}
            helperText="Skills Development Levy is usually 1% of payroll when registered."
          />
        </div>
        <div className="sm:col-span-2">
          <AppLabeledAreaInput
            label="Notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={saving}
          />
        </div>
      </div>
      <div className="mt-6">
        <button
          type="submit"
          disabled={saving || businessId == null}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save employer settings'}
        </button>
      </div>
    </form>
  );
}

export default EmployerSettingsPage;
