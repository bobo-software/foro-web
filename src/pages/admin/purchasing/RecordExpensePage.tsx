import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import AppInputLabeled from '@/components/forms/AppLabledInput';
import AppLabeledSelectInput from '@/components/forms/AppLabledSelectInput';
import AppLabeledAreaInput from '@/components/forms/AppLabledAreaInput';
import AppLabledAutocomplete from '@/components/forms/AppLabledAutocomplete';
import AppLabeledCheckbox from '@/components/forms/AppLabeledCheckbox';
import { useBusinessStore } from '@/stores/data/BusinessStore';
import { useSupplierStore } from '@/stores/data/SupplierStore';
import { useBillStore } from '@/stores/data/BillStore';
import type { Supplier, SupplierRecurrenceInterval } from '@/types/supplier';
import { PAYMENT_METHODS } from '@/types/payment';
import { localDateISO } from '@/utils/localDateISO';
import {
  isRecurrenceInterval,
  RECURRENCE_INTERVAL_OPTIONS,
  suggestNextExpectedPaymentDate,
} from '@/utils/recurrence';

export function RecordExpensePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const businessId = useBusinessStore((s) => s.currentBusiness?.id);
  const suppliers = useSupplierStore((s) => s.suppliers);
  const fetchSuppliers = useSupplierStore((s) => s.fetchSuppliers);
  const recordExpense = useBillStore((s) => s.recordExpense);

  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(localDateISO);
  const [method, setMethod] = useState('eft');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [repeats, setRepeats] = useState(false);
  const [interval, setInterval] = useState<SupplierRecurrenceInterval>('monthly');
  const [nextExpectedPaymentDate, setNextExpectedPaymentDate] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void fetchSuppliers();
  }, [fetchSuppliers]);

  const applySupplier = (supplier: Supplier | null, paymentDate = date) => {
    setSelectedSupplier(supplier);
    if (!supplier) {
      setRepeats(false);
      setInterval('monthly');
      setNextExpectedPaymentDate('');
      return;
    }
    const supplierInterval = isRecurrenceInterval(supplier.recurrence_interval)
      ? supplier.recurrence_interval
      : null;
    setRepeats(Boolean(supplierInterval));
    const nextInterval = supplierInterval ?? 'monthly';
    setInterval(nextInterval);
    if (supplier.expected_amount != null) {
      setAmount(String(supplier.expected_amount));
    }
    if (supplierInterval) {
      const from = supplier.next_expected_payment_date || paymentDate;
      setNextExpectedPaymentDate(suggestNextExpectedPaymentDate(from, nextInterval));
    } else {
      setNextExpectedPaymentDate('');
    }
  };

  useEffect(() => {
    const raw = searchParams.get('supplierId') ?? searchParams.get('supplier_id');
    const supplierId = Number(raw);
    if (!supplierId || selectedSupplier) return;
    const match = suppliers.find((s) => s.id === supplierId);
    if (match) applySupplier(match);
    // applySupplier is stateful; only react to the prefill query + loaded rows.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, suppliers, selectedSupplier]);

  const handleIntervalChange = (value: string) => {
    if (!isRecurrenceInterval(value)) return;
    setInterval(value);
    const from = selectedSupplier?.next_expected_payment_date || date;
    setNextExpectedPaymentDate(suggestNextExpectedPaymentDate(from, value));
  };

  const handleRepeatsChange = (checked: boolean) => {
    setRepeats(checked);
    if (!checked) {
      setNextExpectedPaymentDate('');
      return;
    }
    const from = selectedSupplier?.next_expected_payment_date || date;
    setNextExpectedPaymentDate(suggestNextExpectedPaymentDate(from, interval));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (businessId == null) {
      toast.error('Select a business first');
      return;
    }
    if (selectedSupplier?.id == null) {
      toast.error('Choose a supplier');
      return;
    }
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      toast.error('Enter a payment amount');
      return;
    }
    if (repeats && !nextExpectedPaymentDate) {
      toast.error('Set the next expected payment date');
      return;
    }
    setSaving(true);
    try {
      await recordExpense({
        business_id: businessId,
        supplier_id: selectedSupplier.id,
        amount: value,
        date,
        currency: selectedSupplier.currency ?? 'ZAR',
        payment_method: method,
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
        recurrence_interval: repeats ? interval : null,
        next_expected_payment_date: repeats ? nextExpectedPaymentDate : null,
      });
      toast.success('Expense recorded');
      navigate('/app/purchasing/bills');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to record expense');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6 max-w-lg">
      <div className="flex items-center gap-3">
        <Link to="/app/purchasing/bills" className="text-sm text-indigo-600 dark:text-indigo-400 no-underline">
          ← Back
        </Link>
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Record expense</h1>
      </div>
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Records a paid supplier bill for money that already left the bank (hosting, SaaS, fees). No purchase order.
      </p>

      <div className="grid gap-4">
        <AppLabledAutocomplete
          label="Supplier *"
          options={suppliers}
          value={selectedSupplier?.id != null ? String(selectedSupplier.id) : ''}
          displayValue={selectedSupplier?.name ?? ''}
          accessor="name"
          valueAccessor="id"
          onSelect={(supplier) => applySupplier(supplier as Supplier)}
          onClear={() => applySupplier(null)}
          required
          placeholder="Search supplier…"
        />
        <AppInputLabeled
          label="Amount *"
          type="number"
          min={0.01}
          step={0.01}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
        <AppInputLabeled
          label="Payment date *"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
        <p className="-mt-2 text-xs text-slate-500 dark:text-slate-400">
          When the money left the bank. Next expected payment is the following due date.
        </p>
        <AppLabeledSelectInput
          label="Method"
          value={method}
          options={PAYMENT_METHODS.map((m) => ({ value: m.value, label: m.label }))}
          onChange={(e) => setMethod(e.target.value)}
        />
        <AppInputLabeled label="Reference" value={reference} onChange={(e) => setReference(e.target.value)} />
        <AppLabeledAreaInput
          label="Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. September VPS — VAT inclusive"
          rows={3}
        />
        <AppLabeledCheckbox
          label="This expense repeats"
          checked={repeats}
          onChange={handleRepeatsChange}
          helperText="Show this supplier as due on the next expected payment date. Record the expense when the money actually leaves the bank."
        />
        {repeats && (
          <>
            <AppLabeledSelectInput
              label="Repeats *"
              value={interval}
              options={RECURRENCE_INTERVAL_OPTIONS}
              onChange={(e) => handleIntervalChange(e.target.value)}
              required
            />
            <AppInputLabeled
              label="Next expected payment *"
              type="date"
              value={nextExpectedPaymentDate}
              onChange={(e) => setNextExpectedPaymentDate(e.target.value)}
              required
            />
          </>
        )}
      </div>

      <button
        type="submit"
        disabled={saving}
        className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save expense'}
      </button>
    </form>
  );
}

export default RecordExpensePage;
