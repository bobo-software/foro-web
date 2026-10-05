import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AppDataTable, type AppDataTableColumn } from '@/components/elements/AppDataTable';
import AppInputLabeled from '@/components/forms/AppLabledInput';
import AppLabeledSelectInput from '@/components/forms/AppLabledSelectInput';
import { useBusinessStore } from '@/stores/data/BusinessStore';
import { useCompanyStore } from '@/stores/data/CompanyStore';
import { useSupplierStore } from '@/stores/data/SupplierStore';
import { useBillStore } from '@/stores/data/BillStore';
import { BillPaymentService } from '@/services/billService';
import type { Bill } from '@/types/purchase';
import type { Supplier } from '@/types/supplier';
import { formatCurrency } from '@/utils/currency';
import { PAYMENT_METHODS } from '@/types/payment';
import { localDateISO } from '@/utils/localDateISO';
import { formatCalendarDate, RECURRENCE_INTERVAL_OPTIONS } from '@/utils/recurrence';

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
  const suppliers = useSupplierStore((s) => s.suppliers);
  const fetchSuppliers = useSupplierStore((s) => s.fetchSuppliers);
  const bills = useBillStore((s) => s.bills);
  const loading = useBillStore((s) => s.loading);
  const error = useBillStore((s) => s.error);
  const fetchBills = useBillStore((s) => s.fetchBills);
  const recordPayment = useBillStore((s) => s.recordPayment);
  const [paying, setPaying] = useState<Bill | null>(null);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState('');
  const [method, setMethod] = useState('eft');
  const [saving, setSaving] = useState(false);
  const [referencesByBill, setReferencesByBill] = useState<Map<number, string[]>>(new Map());

  useEffect(() => {
    void fetchCompanies();
    void fetchSuppliers();
  }, [fetchCompanies, fetchSuppliers]);

  useEffect(() => {
    void fetchBills();
  }, [fetchBills, businessId]);

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  // Payment references live on bill_payments; refetch when bills change (e.g. after recording a payment).
  useEffect(() => {
    if (businessId == null) return;
    let cancelled = false;
    BillPaymentService.findAll({ where: { business_id: businessId } })
      .then((payments) => {
        if (cancelled) return;
        const map = new Map<number, string[]>();
        for (const p of payments) {
          const ref = p.reference?.trim();
          if (!ref) continue;
          const refs = map.get(p.bill_id) ?? [];
          if (!refs.includes(ref)) refs.push(ref);
          map.set(p.bill_id, refs);
        }
        setReferencesByBill(map);
      })
      .catch(() => {
        if (!cancelled) setReferencesByBill(new Map());
      });
    return () => {
      cancelled = true;
    };
  }, [businessId, bills]);

  const companyNameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const c of companies) {
      if (c.id != null) map.set(c.id, c.name);
    }
    return map;
  }, [companies]);

  const supplierNameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const s of suppliers) {
      if (s.id != null) map.set(s.id, s.name);
    }
    return map;
  }, [suppliers]);

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
      await recordPayment({
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
        id: 'date',
        header: 'Date',
        cellClassName: 'whitespace-nowrap',
        render: (row) => (row.issue_date ? formatCalendarDate(row.issue_date) : '—'),
      },
      {
        id: 'supplier',
        header: 'Supplier',
        render: (row) =>
          (row.supplier_id != null ? supplierNameById.get(row.supplier_id) : undefined) ??
          (row.company_id != null ? companyNameById.get(row.company_id) : undefined) ??
          '—',
      },
      {
        id: 'reference',
        header: 'Reference',
        render: (row) => (row.id != null ? referencesByBill.get(row.id)?.join(', ') : undefined) || '—',
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
    [companyNameById, supplierNameById, referencesByBill],
  );

  const today = localDateISO();
  const upcoming = useMemo(
    () =>
      suppliers
        .filter((s) => Boolean(s.next_expected_payment_date))
        .sort((a, b) =>
          (a.next_expected_payment_date ?? '').localeCompare(b.next_expected_payment_date ?? ''),
        ),
    [suppliers],
  );

  const upcomingColumns = useMemo<AppDataTableColumn<Supplier>[]>(
    () => [
      {
        id: 'name',
        header: 'Supplier',
        cellClassName: 'font-medium text-slate-800 dark:text-slate-100',
        render: (row) => row.name,
      },
      {
        id: 'next',
        header: 'Next expected payment',
        render: (row) => {
          const date = row.next_expected_payment_date;
          if (!date) return '—';
          const overdue = date < today;
          const dueToday = date === today;
          return (
            <span className={overdue ? 'font-medium text-red-700 dark:text-red-300' : dueToday ? 'font-medium text-amber-700 dark:text-amber-300' : ''}>
              {formatCalendarDate(date)}
              {overdue ? ' · overdue' : dueToday ? ' · due today' : ''}
            </span>
          );
        },
      },
      {
        id: 'amount',
        header: 'Expected amount',
        align: 'right',
        render: (row) =>
          row.expected_amount != null ? formatCurrency(row.expected_amount, row.currency) : '—',
      },
      {
        id: 'repeats',
        header: 'Repeats',
        render: (row) =>
          RECURRENCE_INTERVAL_OPTIONS.find((o) => o.value === row.recurrence_interval)?.label ?? '—',
      },
      {
        id: 'record',
        header: '',
        render: (row) =>
          row.id != null ? (
            <Link
              to={`/app/purchasing/bills/record-expense?supplierId=${row.id}`}
              className="text-xs font-medium text-indigo-600 dark:text-indigo-400 no-underline"
              onClick={(e) => e.stopPropagation()}
            >
              Record supplier bill
            </Link>
          ) : null,
      },
    ],
    [today],
  );

  return (
    <div className="space-y-4">
      {upcoming.length > 0 && (
        <AppDataTable
          title="Upcoming expected payments"
          columns={upcomingColumns}
          data={upcoming}
          getRowKey={(row, index) => row.id ?? `upcoming-${index}`}
          getRowClassName={(row) =>
            row.next_expected_payment_date && row.next_expected_payment_date < today
              ? 'bg-red-50/50 dark:bg-red-900/10'
              : row.next_expected_payment_date === today
                ? 'bg-amber-50/50 dark:bg-amber-900/10'
                : ''
          }
          emptyMessage="No upcoming expected payments."
        />
      )}

      <AppDataTable
        columns={columns}
        data={bills}
        getRowKey={(row) => String(row.id)}
        loading={loading}
        emptyMessage="No supplier bills yet. Record a supplier bill or receive a purchase order."
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
