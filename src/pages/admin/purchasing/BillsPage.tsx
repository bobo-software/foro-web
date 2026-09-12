import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { AppDataTable, type AppDataTableColumn } from '@/components/elements/AppDataTable';
import AppInputLabeled from '@/components/forms/AppLabledInput';
import AppLabeledSelectInput from '@/components/forms/AppLabledSelectInput';
import { useBusinessStore } from '@/stores/data/BusinessStore';
import { useCompanyStore } from '@/stores/data/CompanyStore';
import { BillPaymentService, BillService } from '@/services/billService';
import type { Bill } from '@/types/purchase';
import { formatCurrency } from '@/utils/currency';
import { PAYMENT_METHODS } from '@/types/payment';

const STATUS_CLASSES: Record<string, string> = {
  unpaid: 'bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200',
  partially_paid: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  paid: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  cancelled: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
};

export function BillsPage() {
  const businessId = useBusinessStore((s) => s.currentBusiness?.id);
  const companies = useCompanyStore((s) => s.companies);
  const fetchCompanies = useCompanyStore((s) => s.fetchCompanies);
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState<Bill | null>(null);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState('');
  const [method, setMethod] = useState('eft');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await BillService.findAll({
        where: businessId != null ? { business_id: businessId } : undefined,
      });
      setBills(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load bills');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchCompanies();
  }, [fetchCompanies]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  const nameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const c of companies) {
      if (c.id != null) map.set(c.id, c.name);
    }
    return map;
  }, [companies]);

  const openPay = (bill: Bill) => {
    setPaying(bill);
    setAmount(String(bill.total));
    setDate(new Date().toISOString().slice(0, 10));
    setReference('');
    setMethod('eft');
  };

  const submitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paying?.id || businessId == null) return;
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      toast.error('Enter a payment amount');
      return;
    }
    setSaving(true);
    try {
      await BillPaymentService.create({
        bill_id: paying.id,
        business_id: businessId,
        amount: value,
        currency: paying.currency ?? 'ZAR',
        date,
        reference: reference.trim() || undefined,
        payment_method: method,
      });
      toast.success('Payment recorded');
      setPaying(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to record payment');
    } finally {
      setSaving(false);
    }
  };

  const columns = useMemo<AppDataTableColumn<Bill>[]>(
    () => [
      {
        id: 'bill_number',
        header: 'Bill #',
        cellClassName: 'font-mono',
        render: (row) => row.bill_number,
      },
      {
        id: 'supplier',
        header: 'Supplier',
        render: (row) => (row.company_id != null ? nameById.get(row.company_id) : undefined) ?? '—',
      },
      {
        id: 'status',
        header: 'Status',
        render: (row) => (
          <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STATUS_CLASSES[row.status] ?? ''}`}>
            {row.status.replace('_', ' ')}
          </span>
        ),
      },
      {
        id: 'total',
        header: 'Total',
        align: 'right',
        render: (row) => formatCurrency(row.total, row.currency),
      },
      {
        id: 'pay',
        header: '',
        render: (row) =>
          row.status === 'paid' || row.status === 'cancelled' ? null : (
            <button
              type="button"
              className="text-xs font-medium text-indigo-600 dark:text-indigo-400"
              onClick={(e) => {
                e.stopPropagation();
                openPay(row);
              }}
            >
              Record payment
            </button>
          ),
      },
    ],
    [nameById],
  );

  return (
    <div className="space-y-4">
      <AppDataTable
        columns={columns}
        data={bills}
        getRowKey={(row) => String(row.id)}
        loading={loading}
        emptyMessage="No supplier bills yet. Receive a purchase order to create one."
      />

      {paying && (
        <form
          onSubmit={(e) => void submitPayment(e)}
          className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 space-y-3 max-w-lg"
        >
          <h2 className="text-sm font-semibold">
            Record payment — {paying.bill_number} ({formatCurrency(paying.total, paying.currency)})
          </h2>
          <AppInputLabeled label="Amount *" type="number" min={0.01} step={0.01} value={amount} onChange={(e) => setAmount(e.target.value)} required />
          <AppInputLabeled label="Date *" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          <AppLabeledSelectInput
            label="Method"
            value={method}
            options={PAYMENT_METHODS.map((m) => ({ value: m.value, label: m.label }))}
            onChange={(e) => setMethod(e.target.value)}
          />
          <AppInputLabeled label="Reference" value={reference} onChange={(e) => setReference(e.target.value)} />
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save payment'}
            </button>
            <button type="button" className="text-sm text-slate-500" onClick={() => setPaying(null)}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default BillsPage;
