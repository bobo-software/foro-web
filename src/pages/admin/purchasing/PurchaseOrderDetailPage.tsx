import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import AppInputLabeled from '@/components/forms/AppLabledInput';
import { useCompanyStore } from '@/stores/data/CompanyStore';
import { useSupplierStore } from '@/stores/data/SupplierStore';
import PurchaseOrderService from '@/services/purchaseOrderService';
import { BillService } from '@/services/billService';
import type { Bill, PurchaseOrder, PurchaseOrderItem } from '@/types/purchase';
import { formatCurrency } from '@/utils/currency';

const APPROVAL_CLASSES: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  approved: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300',
};

export function PurchaseOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const companies = useCompanyStore((s) => s.companies);
  const fetchCompanies = useCompanyStore((s) => s.fetchCompanies);
  const suppliers = useSupplierStore((s) => s.suppliers);
  const fetchSuppliers = useSupplierStore((s) => s.fetchSuppliers);
  const [po, setPo] = useState<PurchaseOrder | null>(null);
  const [lines, setLines] = useState<PurchaseOrderItem[]>([]);
  const [bill, setBill] = useState<Bill | null>(null);
  const [dueDate, setDueDate] = useState('');
  const [receiving, setReceiving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchCompanies();
    void fetchSuppliers();
  }, [fetchCompanies, fetchSuppliers]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([
      PurchaseOrderService.findById(Number(id)),
      PurchaseOrderService.findItems(Number(id)),
      BillService.findAll({ where: { purchase_order_id: Number(id) } }),
    ])
      .then(([header, items, bills]) => {
        if (cancelled) return;
        setPo(header);
        setLines(items);
        setBill(bills[0] ?? null);
      })
      .catch(() => toast.error('Failed to load purchase order'))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const supplierName =
    suppliers.find((s) => s.id === po?.supplier_id)?.name ??
    companies.find((c) => c.id === po?.company_id)?.name ??
    '—';
  const canReceive = po?.status === 'draft' || po?.status === 'sent';

  const handleApprove = async () => {
    if (!po?.id) return;
    setApproving(true);
    try {
      const updated = await PurchaseOrderService.update(po.id, { approval_status: 'approved' });
      setPo(updated);
      toast.success('Purchase order approved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to approve purchase order');
    } finally {
      setApproving(false);
    }
  };

  const handleReceive = async () => {
    if (!po?.id) return;
    setReceiving(true);
    try {
      const result = await PurchaseOrderService.receive(po.id, dueDate || undefined);
      setPo(result.purchaseOrder);
      toast.success('Purchase order received — a bill was created');
      navigate('/app/purchasing/bills');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not receive this purchase order');
    } finally {
      setReceiving(false);
    }
  };

  if (loading) return <p className="text-sm text-slate-500 py-6">Loading…</p>;
  if (!po) return <p className="text-sm text-red-600 py-6">Purchase order not found.</p>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link to="/app/purchasing/orders" className="text-sm text-indigo-600 dark:text-indigo-400 no-underline">
          ← Back
        </Link>
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">{po.po_number}</h1>
        <span className="text-xs uppercase tracking-wide text-slate-500">{po.status}</span>
        {po.approval_status && po.approval_status !== 'not_required' && (
          <span
            className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${APPROVAL_CLASSES[po.approval_status] ?? ''}`}
          >
            {po.approval_status === 'pending' ? 'Pending approval' : 'Approved'}
          </span>
        )}
        {po.approval_status === 'pending' && (
          <button
            type="button"
            disabled={approving}
            onClick={() => void handleApprove()}
            className="text-xs font-medium text-indigo-600 dark:text-indigo-400 disabled:opacity-50"
          >
            {approving ? 'Approving…' : 'Approve'}
          </button>
        )}
      </div>

      <dl className="grid gap-3 sm:grid-cols-2 text-sm">
        <div>
          <dt className="text-slate-500">Supplier</dt>
          <dd className="font-medium text-slate-800 dark:text-slate-100">{supplierName}</dd>
        </div>
        {po.quote_reference && (
          <div>
            <dt className="text-slate-500">Quote reference</dt>
            <dd className="font-medium text-slate-800 dark:text-slate-100">{po.quote_reference}</dd>
          </div>
        )}
        <div>
          <dt className="text-slate-500">Issued</dt>
          <dd>{po.issue_date ? new Date(po.issue_date).toLocaleDateString() : '—'}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Total</dt>
          <dd className="font-medium">{formatCurrency(po.total, po.currency)}</dd>
        </div>
        {bill?.id && (
          <div>
            <dt className="text-slate-500">Bill</dt>
            <dd>
              <Link className="text-indigo-600 no-underline" to="/app/purchasing/bills">
                {bill.bill_number} ({bill.status})
              </Link>
            </dd>
          </div>
        )}
      </dl>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-slate-500">
            <th className="py-1">Description</th>
            <th className="py-1">Qty</th>
            <th className="py-1">Cost</th>
            <th className="py-1 text-right">Line total</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => (
            <tr key={line.id} className="border-t border-slate-100 dark:border-slate-700">
              <td className="py-2">{line.description}</td>
              <td>{line.quantity}</td>
              <td>{formatCurrency(line.unit_cost, po.currency)}</td>
              <td className="text-right">{formatCurrency(line.total, po.currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {canReceive && (
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-3">
          <h2 className="text-sm font-semibold">Receive goods</h2>
          <p className="text-xs text-slate-500">
            Marks the PO received, increases stock for catalog lines, and creates an unpaid supplier bill.
          </p>
          <AppInputLabeled label="Bill due date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          <button
            type="button"
            disabled={receiving}
            onClick={() => void handleReceive()}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {receiving ? 'Receiving…' : 'Receive purchase order'}
          </button>
        </div>
      )}

      {po.status !== 'received' && po.status !== 'cancelled' && (
        <Link
          to={`/app/purchasing/orders/${po.id}/edit`}
          className="inline-block text-sm text-indigo-600 dark:text-indigo-400 no-underline"
        >
          Edit purchase order
        </Link>
      )}
    </div>
  );
}

export default PurchaseOrderDetailPage;
