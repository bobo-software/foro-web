import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AppPageHeader } from '@/components/ComponentsIndex';
import AppInputLabeled from '@/components/forms/AppLabledInput';
import AppLabeledSelectInput from '@/components/forms/AppLabledSelectInput';
import AppLabeledAreaInput from '@/components/forms/AppLabledAreaInput';
import { useBusinessStore } from '@/stores/data/BusinessStore';
import { useExpenseStore } from '@/stores/data/ExpenseStore';
import type { ExpenseCategory } from '@/types/expense';
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_OPTIONS } from '@/types/expense';
import { PAYMENT_METHODS } from '@/types/payment';
import { localDateISO } from '@/utils/localDateISO';
import { expenseSchema } from '@/validation/schemas';

function isCategory(value: string): value is ExpenseCategory {
  return (EXPENSE_CATEGORIES as readonly string[]).includes(value);
}

export function ExpenseFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const expenseId = id ? Number(id) : null;
  const isEdit = expenseId != null && Number.isFinite(expenseId);
  const businessId = useBusinessStore((s) => s.currentBusiness?.id);
  const getExpense = useExpenseStore((s) => s.getExpense);
  const createExpense = useExpenseStore((s) => s.createExpense);
  const updateExpense = useExpenseStore((s) => s.updateExpense);

  const [category, setCategory] = useState<ExpenseCategory | ''>('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(localDateISO);
  const [payee, setPayee] = useState('');
  const [method, setMethod] = useState('card');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);

  useEffect(() => {
    if (!isEdit || expenseId == null) return;
    let cancelled = false;
    setLoading(true);
    void getExpense(expenseId)
      .then((row) => {
        if (cancelled) return;
        if (!row) {
          toast.error('Expense not found');
          navigate('/app/purchasing/expenses');
          return;
        }
        setCategory(row.category);
        setAmount(String(row.amount));
        setDate(row.date);
        setPayee(row.payee ?? '');
        setMethod(row.payment_method ?? 'card');
        setReference(row.reference ?? '');
        setNotes(row.notes ?? '');
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error(err instanceof Error ? err.message : 'Failed to load expense');
          navigate('/app/purchasing/expenses');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [expenseId, getExpense, isEdit, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (businessId == null) {
      toast.error('Select a business first');
      return;
    }
    const parsedAmount = Number(amount);
    const validation = expenseSchema.safeParse({
      business_id: businessId,
      date,
      amount: parsedAmount,
      category,
      payee: payee.trim() || undefined,
      payment_method: method,
      reference: reference.trim() || undefined,
      notes: notes.trim() || undefined,
    });
    if (!validation.success) {
      toast.error(validation.error.issues[0]?.message ?? 'Check the expense details');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        business_id: businessId,
        date: validation.data.date,
        amount: validation.data.amount,
        currency: 'ZAR',
        category: validation.data.category,
        payee: validation.data.payee ?? null,
        payment_method: validation.data.payment_method,
        reference: validation.data.reference ?? null,
        notes: validation.data.notes ?? null,
      };
      if (isEdit && expenseId != null) {
        await updateExpense(expenseId, payload);
        toast.success('Expense updated');
      } else {
        await createExpense(payload);
        toast.success('Expense recorded');
      }
      navigate('/app/purchasing/expenses');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save expense');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-slate-500 dark:text-slate-400 py-6">Loading expense…</p>;
  }

  return (
    <div className="space-y-3">
      <AppPageHeader
        title={isEdit ? 'Edit expense' : 'Record expense'}
        subtitle="Cash or card spend that already left the bank (petrol, parking, meals). No supplier."
        showBackButton
        onBackClick={() => navigate(-1)}
      />
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6 max-w-lg">
        <div className="grid gap-4">
          <AppLabeledSelectInput
            label="Category *"
            value={category}
            options={EXPENSE_CATEGORY_OPTIONS}
            onChange={(e) => {
              if (isCategory(e.target.value)) setCategory(e.target.value);
            }}
            required
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
            label="Date *"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
          <AppInputLabeled
            label="Payee"
            value={payee}
            onChange={(e) => setPayee(e.target.value)}
            placeholder="e.g. Engen N1"
          />
          <AppLabeledSelectInput
            label="Method"
            value={method}
            options={PAYMENT_METHODS}
            onChange={(e) => setMethod(e.target.value)}
          />
          <AppInputLabeled label="Reference" value={reference} onChange={(e) => setReference(e.target.value)} />
          <AppLabeledAreaInput
            label="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Job site trip — full tank"
            rows={3}
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
        >
          {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Save expense'}
        </button>
      </form>
    </div>
  );
}

export default ExpenseFormPage;
