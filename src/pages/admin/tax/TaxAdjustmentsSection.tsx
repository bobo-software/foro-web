import { useState } from 'react';
import toast from 'react-hot-toast';
import AppInputLabeled from '@/components/forms/AppLabledInput';
import AppLabeledSelectInput from '@/components/forms/AppLabledSelectInput';
import { useBusinessTaxStore } from '@/stores/data/BusinessTaxStore';
import { TAX_ADJUSTMENT_PRESETS, type TaxReturn, type TaxReturnAdjustment } from '@/types/businessTax';
import { formatCurrency } from '@/utils/currency';
import { taxAdjustmentSchema } from '@/validation/schemas';
import { signedAmount } from '@/utils/businessTax';

const CUSTOM = 'custom';

const PRESET_OPTIONS = [
  ...TAX_ADJUSTMENT_PRESETS.map((preset) => ({ value: preset.label, label: preset.label })),
  { value: CUSTOM, label: 'Something else…' },
];

const DIRECTION_OPTIONS = [
  { value: 'deduct', label: 'Deduct from taxable income' },
  { value: 'add', label: 'Add to taxable income' },
];

interface FormState {
  preset: string;
  label: string;
  direction: 'add' | 'deduct';
  amount: string;
}

const EMPTY_FORM: FormState = {
  preset: TAX_ADJUSTMENT_PRESETS[0].label,
  label: TAX_ADJUSTMENT_PRESETS[0].label,
  direction: TAX_ADJUSTMENT_PRESETS[0].direction,
  amount: '',
};

function formFor(adjustment: TaxReturnAdjustment): FormState {
  const preset = TAX_ADJUSTMENT_PRESETS.find((item) => item.label === adjustment.label);
  return {
    preset: preset ? preset.label : CUSTOM,
    label: adjustment.label,
    direction: adjustment.direction,
    amount: adjustment.amount.toFixed(2),
  };
}

export function TaxAdjustmentsSection({ taxReturn }: { taxReturn: TaxReturn }) {
  const busy = useBusinessTaxStore((s) => s.returnBusy);
  const addAdjustment = useBusinessTaxStore((s) => s.addAdjustment);
  const updateAdjustment = useBusinessTaxStore((s) => s.updateAdjustment);
  const deleteAdjustment = useBusinessTaxStore((s) => s.deleteAdjustment);

  const isDraft = taxReturn.status === 'draft';
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const hint = TAX_ADJUSTMENT_PRESETS.find((preset) => preset.label === form.preset)?.hint;

  const choosePreset = (value: string) => {
    const preset = TAX_ADJUSTMENT_PRESETS.find((item) => item.label === value);
    setForm((current) =>
      preset
        ? { ...current, preset: value, label: preset.label, direction: preset.direction }
        : { ...current, preset: CUSTOM, label: '' },
    );
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setFormError(null);
  };

  const handleSave = async () => {
    const parsed = taxAdjustmentSchema.safeParse({
      label: form.label,
      direction: form.direction,
      amount: form.amount,
    });
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? 'Check the adjustment');
      return;
    }
    setFormError(null);
    try {
      if (editingId != null) {
        await updateAdjustment(taxReturn.id, editingId, parsed.data);
        toast.success('Adjustment saved');
      } else {
        await addAdjustment(taxReturn.id, parsed.data);
        toast.success('Adjustment added');
      }
      resetForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save the adjustment');
    }
  };

  const handleRemove = async (adjustment: TaxReturnAdjustment) => {
    try {
      await deleteAdjustment(taxReturn.id, adjustment.id);
      if (editingId === adjustment.id) resetForm();
      toast.success('Adjustment removed');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove the adjustment');
    }
  };

  if (!isDraft && taxReturn.adjustments.length === 0) return null;

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Adjustments</h2>
        {isDraft && (
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Year-end changes your accountant makes that are not in your documents. The return recalculates after each
            change.
          </p>
        )}
      </div>

      {taxReturn.adjustments.length > 0 && (
        <table className="min-w-full text-sm">
          <tbody className="text-slate-600 dark:text-slate-300">
            {taxReturn.adjustments.map((adjustment) => (
              <tr
                key={adjustment.id}
                className={`border-t border-slate-100 first:border-t-0 dark:border-slate-800 ${
                  editingId === adjustment.id ? 'bg-indigo-50/60 dark:bg-indigo-950/30' : ''
                }`}
              >
                <td className="px-4 py-2">{adjustment.label}</td>
                <td className="px-4 py-2 text-right">
                  {signedAmount(adjustment.amount, adjustment.direction === 'deduct' ? -1 : 1)}
                </td>
                {isDraft && (
                  <td className="w-32 px-4 py-2 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(adjustment.id);
                        setForm(formFor(adjustment));
                        setFormError(null);
                      }}
                      disabled={busy}
                      className="text-xs font-medium text-indigo-600 hover:underline disabled:opacity-50 dark:text-indigo-400"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleRemove(adjustment)}
                      disabled={busy}
                      className="ml-3 text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </td>
                )}
              </tr>
            ))}
            <tr className="border-t border-slate-200 font-medium text-slate-800 dark:border-slate-700 dark:text-slate-100">
              <td className="px-4 py-2">Net adjustments</td>
              <td className="px-4 py-2 text-right">
                {taxReturn.figures.adjustments_total < 0
                  ? `(${formatCurrency(-taxReturn.figures.adjustments_total)})`
                  : formatCurrency(taxReturn.figures.adjustments_total)}
              </td>
              {isDraft && <td />}
            </tr>
          </tbody>
        </table>
      )}

      {isDraft && (
        <div className="space-y-3 border-t border-slate-200 p-4 dark:border-slate-700">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <AppLabeledSelectInput
              label="Adjustment"
              value={form.preset}
              options={PRESET_OPTIONS}
              onChange={(e) => choosePreset(e.target.value)}
              disabled={busy}
            />
            {form.preset === CUSTOM && (
              <AppInputLabeled
                label="Description"
                value={form.label}
                onChange={(e) => setForm((current) => ({ ...current, label: e.target.value }))}
                disabled={busy}
              />
            )}
            <AppLabeledSelectInput
              label="Effect"
              value={form.direction}
              options={DIRECTION_OPTIONS}
              onChange={(e) =>
                setForm((current) => ({ ...current, direction: e.target.value === 'add' ? 'add' : 'deduct' }))
              }
              disabled={busy}
            />
            <AppInputLabeled
              label="Amount"
              type="number"
              min={0}
              step={0.01}
              value={form.amount}
              onChange={(e) => setForm((current) => ({ ...current, amount: e.target.value }))}
              disabled={busy}
            />
          </div>
          {hint && <p className="text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
          {formError && <p className="text-xs text-red-600">{formError}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={busy}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              {editingId != null ? 'Save adjustment' : 'Add adjustment'}
            </button>
            {editingId != null && (
              <button
                type="button"
                onClick={resetForm}
                disabled={busy}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default TaxAdjustmentsSection;
