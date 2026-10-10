import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import type { Invoice } from '../../types/invoice';
import { PAYMENT_METHODS, type PaymentMethod } from '../../types/payment';
import { useInvoiceStore } from '../../stores/data/InvoiceStore';
import { formatCurrency } from '../../utils/currency';
import { markInvoicePaidSchema } from '../../validation/schemas';
import AppInputLabeled from '../forms/AppLabledInput';
import AppLabeledSelectInput from '../forms/AppLabledSelectInput';
import { AppModal } from './AppModal';

interface MarkInvoicePaidModalProps {
  invoice: Invoice;
  isOpen: boolean;
  onClose: () => void;
  onPaid: () => void;
}

function todayIso(): string {
  return new Date().toISOString().split('T')[0];
}

export function MarkInvoicePaidModal({ invoice, isOpen, onClose, onPaid }: MarkInvoicePaidModalProps) {
  const [amount, setAmount] = useState(String(invoice.total ?? ''));
  const [date, setDate] = useState(todayIso());
  const [method, setMethod] = useState<PaymentMethod>('eft');
  const [reference, setReference] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ amount?: string; date?: string }>({});

  useEffect(() => {
    if (!isOpen) return;
    setAmount(invoice.total != null ? String(invoice.total) : '');
    setDate(todayIso());
    setMethod('eft');
    setReference('');
    setErrors({});
    setSaving(false);
  }, [isOpen, invoice.id, invoice.total]);

  const save = async () => {
    const parsed = markInvoicePaidSchema.safeParse({
      amount: amount.trim() === '' ? Number.NaN : Number(amount),
      date,
      payment_method: method,
      reference: reference.trim() || undefined,
    });
    if (!parsed.success) {
      const next: { amount?: string; date?: string } = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (key === 'amount' && !next.amount) next.amount = issue.message;
        if (key === 'date' && !next.date) next.date = issue.message;
      }
      setErrors(next);
      return;
    }

    if (invoice.id == null) return;
    setSaving(true);
    setErrors({});
    try {
      await useInvoiceStore.getState().markInvoicePaid(invoice.id, {
        amount: parsed.data.amount,
        date: parsed.data.date,
        payment_method: parsed.data.payment_method,
        reference: parsed.data.reference,
      });
      toast.success('Invoice marked as paid');
      onPaid();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to record payment');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppModal
      isOpen={isOpen}
      onClose={onClose}
      title="Invoice has been paid"
      subtitle={`${invoice.invoice_number} · ${formatCurrency(Number(invoice.total), invoice.currency)}`}
      size="md"
      closeOnBackdrop={!saving}
      buttons={[
        { label: 'Cancel', onClick: onClose, variant: 'secondary', disabled: saving },
        {
          label: 'Save payment',
          onClick: () => void save(),
          variant: 'primary',
          loading: saving,
          loadingLabel: 'Saving…',
        },
      ]}
    >
      <div className="space-y-3">
        <AppInputLabeled
          label="Amount"
          type="number"
          min={0.01}
          step={0.01}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          error={errors.amount}
        />
        <AppInputLabeled
          label="Date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          error={errors.date}
        />
        <AppLabeledSelectInput
          label="Method"
          value={method}
          options={PAYMENT_METHODS.map((item) => ({ value: item.value, label: item.label }))}
          onChange={(e) => setMethod(e.target.value as PaymentMethod)}
          required
        />
        <AppInputLabeled
          label="Reference"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder="Optional"
        />
      </div>
    </AppModal>
  );
}
