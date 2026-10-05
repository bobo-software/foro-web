import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AppPageHeader } from '@/components/ComponentsIndex';
import AppInputLabeled from '@/components/forms/AppLabledInput';
import AppLabeledSelectInput from '@/components/forms/AppLabledSelectInput';
import AppLabeledAreaInput from '@/components/forms/AppLabledAreaInput';
import AppLabledAutocomplete from '@/components/forms/AppLabledAutocomplete';
import AppLabeledCheckbox from '@/components/forms/AppLabeledCheckbox';
import { useBusinessStore } from '@/stores/data/BusinessStore';
import { useSupplierStore } from '@/stores/data/SupplierStore';
import { useBillStore } from '@/stores/data/BillStore';
import { BillPaymentService, BillService } from '@/services/billService';
import type { Supplier, SupplierRecurrenceInterval } from '@/types/supplier';
import { formatCurrency } from '@/utils/currency';
import { PAYMENT_METHODS } from '@/types/payment';
import { localDateISO } from '@/utils/localDateISO';
import {
  formatCalendarDate,
  isRecurrenceInterval,
  RECURRENCE_INTERVAL_OPTIONS,
  suggestNextExpectedPaymentDate,
} from '@/utils/recurrence';

const RECENT_PAYMENTS_LIMIT = 10;

interface RecentPayment {
  id: number;
  date: string;
  amount: number;
  currency?: string;
  method?: string;
  reference?: string;
  notes?: string;
  billNumber: string;
}

function methodLabel(value?: string): string | undefined {
  if (!value) return undefined;
  return PAYMENT_METHODS.find((m) => m.value === value)?.label ?? value;
}

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
  const addAnotherRef = useRef(false);
  const [recentPayments, setRecentPayments] = useState<RecentPayment[]>([]);
  const [recentLoading, setRecentLoading] = useState(false);
  const [recentTick, setRecentTick] = useState(0);

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

  // Payments hang off bills, so join this supplier's bills with the business's payments.
  const selectedSupplierId = selectedSupplier?.id;
  useEffect(() => {
    if (selectedSupplierId == null || businessId == null) {
      setRecentPayments([]);
      return;
    }
    let cancelled = false;
    setRecentLoading(true);
    Promise.all([
      BillService.findAll({ where: { supplier_id: selectedSupplierId, business_id: businessId } }),
      BillPaymentService.findAll({ where: { business_id: businessId } }),
    ])
      .then(([supplierBills, payments]) => {
        if (cancelled) return;
        const billsById = new Map(supplierBills.map((b) => [b.id, b]));
        const rows: RecentPayment[] = [];
        for (const p of payments) {
          const bill = billsById.get(p.bill_id);
          if (!bill || p.id == null) continue;
          rows.push({
            id: p.id,
            date: p.date,
            amount: p.amount,
            currency: p.currency ?? bill.currency,
            method: p.payment_method,
            reference: p.reference,
            notes: bill.notes,
            billNumber: bill.bill_number,
          });
        }
        rows.sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
        setRecentPayments(rows.slice(0, RECENT_PAYMENTS_LIMIT));
      })
      .catch(() => {
        if (!cancelled) setRecentPayments([]);
      })
      .finally(() => {
        if (!cancelled) setRecentLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedSupplierId, businessId, recentTick]);

  const importPayment = (payment: RecentPayment) => {
    setAmount(String(payment.amount));
    if (payment.method) setMethod(payment.method);
    setReference(payment.reference ?? '');
    setNotes(payment.notes ?? '');
    toast.success('Details copied from previous payment');
  };

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
      toast.success('Supplier bill recorded');
      if (!addAnotherRef.current) {
        navigate('/app/purchasing/bills');
        return;
      }
      // Keep supplier, date, method and reference; reset the rest from the (now updated) supplier.
      const updated = useSupplierStore.getState().suppliers.find((s) => s.id === selectedSupplier.id) ?? selectedSupplier;
      setAmount('');
      setNotes('');
      applySupplier(updated);
      setRecentTick((t) => t + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to record supplier bill');
    } finally {
      setSaving(false);
      addAnotherRef.current = false;
    }
  };

  return (
    <div className="space-y-3">
      <AppPageHeader
        title="Record supplier bill"
        subtitle="Records a paid supplier bill for money that already left the bank (hosting, SaaS, fees). No purchase order."
        showBackButton
        onBackClick={() => navigate(-1)}
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,32rem)_minmax(0,1fr)] lg:items-start">
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
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
              label="This bill repeats"
              checked={repeats}
              onChange={handleRepeatsChange}
              helperText="Show this supplier as due on the next expected payment date. Record the supplier bill when the money actually leaves the bank."
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

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={saving}
              onClick={() => {
                addAnotherRef.current = false;
              }}
              className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save supplier bill'}
            </button>
            <button
              type="submit"
              disabled={saving}
              onClick={() => {
                addAnotherRef.current = true;
              }}
              className="rounded-md border border-indigo-600 px-3 py-1.5 text-sm text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 disabled:opacity-50"
            >
              Save and add another
            </button>
          </div>
        </form>

        <section className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
          <header className="border-b border-slate-200 dark:border-slate-700 px-4 py-2.5">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              {selectedSupplier ? `Recent payments to ${selectedSupplier.name}` : 'Recent payments'}
            </h2>
          </header>
          {!selectedSupplier ? (
            <p className="px-4 py-6 text-xs text-slate-500 dark:text-slate-400">Choose a supplier to see their recent payments.</p>
          ) : recentLoading ? (
            <p className="px-4 py-6 text-xs text-slate-500 dark:text-slate-400">Loading…</p>
          ) : recentPayments.length === 0 ? (
            <p className="px-4 py-6 text-xs text-slate-500 dark:text-slate-400">No payments recorded for this supplier yet.</p>
          ) : (
            <ul className="divide-y divide-slate-200 dark:divide-slate-700">
              {recentPayments.map((payment) => (
                <li key={payment.id} className="flex items-start justify-between gap-3 px-4 py-2.5">
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-baseline gap-2 text-sm">
                      <span className="font-medium text-slate-800 dark:text-slate-100">
                        {formatCurrency(payment.amount, payment.currency)}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">{formatCalendarDate(payment.date)}</span>
                    </div>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                      {[methodLabel(payment.method), payment.reference, payment.billNumber].filter(Boolean).join(' · ')}
                    </p>
                    {payment.notes && (
                      <p className="truncate text-xs text-slate-400 dark:text-slate-500">{payment.notes}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => importPayment(payment)}
                    className="shrink-0 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Import details
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

export default RecordExpensePage;
