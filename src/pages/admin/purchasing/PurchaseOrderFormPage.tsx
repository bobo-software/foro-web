import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import AppInputLabeled from '@/components/forms/AppLabledInput';
import AppLabeledSelectInput from '@/components/forms/AppLabledSelectInput';
import AppLabeledAreaInput from '@/components/forms/AppLabledAreaInput';
import AppLabledAutocomplete from '@/components/forms/AppLabledAutocomplete';
import { useBusinessStore } from '@/stores/data/BusinessStore';
import { useSupplierStore } from '@/stores/data/SupplierStore';
import ItemService from '@/services/itemService';
import SupplierItemService from '@/services/supplierItemService';
import PurchaseOrderService from '@/services/purchaseOrderService';
import type { Supplier, SupplierItem } from '@/types/supplier';
import type { Item } from '@/types/item';
import type { CreatePurchaseOrderDto, PurchaseOrderApprovalStatus, PurchaseOrderStatus } from '@/types/purchase';

interface LineDraft {
  key: string;
  item_id?: number;
  supplier_item_id?: number;
  description: string;
  quantity: number;
  unit_cost: number;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function lineTotal(line: LineDraft): number {
  return Math.round(line.quantity * line.unit_cost * 100) / 100;
}

const APPROVAL_LABELS: Record<PurchaseOrderApprovalStatus, string> = {
  not_required: '',
  pending: 'Pending approval',
  approved: 'Approved',
};

const APPROVAL_CLASSES: Record<PurchaseOrderApprovalStatus, string> = {
  not_required: '',
  pending: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  approved: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300',
};

export function PurchaseOrderFormPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const businessId = useBusinessStore((s) => s.currentBusiness?.id);
  const suppliers = useSupplierStore((s) => s.suppliers);
  const fetchSuppliers = useSupplierStore((s) => s.fetchSuppliers);
  const [items, setItems] = useState<Item[]>([]);
  const [supplierItems, setSupplierItems] = useState<SupplierItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [poId, setPoId] = useState<number | undefined>(id ? Number(id) : undefined);
  const [poNumber, setPoNumber] = useState('');
  const [approvalStatus, setApprovalStatus] = useState<PurchaseOrderApprovalStatus>('not_required');
  const [status, setStatus] = useState<PurchaseOrderStatus>('draft');
  const [quoteReference, setQuoteReference] = useState('');
  const [issueDate, setIssueDate] = useState(todayIso());
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [taxRate, setTaxRate] = useState('0');
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [lines, setLines] = useState<LineDraft[]>([
    { key: '1', description: '', quantity: 1, unit_cost: 0 },
  ]);

  useEffect(() => {
    void fetchSuppliers();
  }, [fetchSuppliers]);

  useEffect(() => {
    if (businessId == null) return;
    void ItemService.findAll({ where: { business_id: businessId } }).then(setItems).catch(() => setItems([]));
  }, [businessId]);

  useEffect(() => {
    if (!selectedSupplier?.id) {
      setSupplierItems([]);
      return;
    }
    void SupplierItemService.findAll({ where: { supplier_id: selectedSupplier.id } })
      .then(setSupplierItems)
      .catch(() => setSupplierItems([]));
  }, [selectedSupplier?.id]);

  useEffect(() => {
    const supplierId = Number(searchParams.get('supplier_id'));
    if (!supplierId || selectedSupplier) return;
    const match = suppliers.find((s) => s.id === supplierId);
    if (match) setSelectedSupplier(match);
  }, [searchParams, suppliers, selectedSupplier]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([PurchaseOrderService.findById(Number(id)), PurchaseOrderService.findItems(Number(id))])
      .then(([po, poItems]) => {
        if (cancelled || !po) return;
        setPoNumber(po.po_number);
        setApprovalStatus(po.approval_status ?? 'not_required');
        setStatus(po.status);
        setQuoteReference(po.quote_reference ?? '');
        setIssueDate(po.issue_date?.slice(0, 10) ?? todayIso());
        setExpectedDeliveryDate(po.expected_delivery_date?.slice(0, 10) ?? '');
        setNotes(po.notes ?? '');
        setTaxRate(String(po.tax_rate ?? 0));
        if (po.supplier_id != null) {
          const match = suppliers.find((s) => s.id === po.supplier_id);
          if (match) setSelectedSupplier(match);
        }
        if (poItems.length > 0) {
          setLines(
            poItems.map((line, index) => ({
              key: String(line.id ?? index),
              item_id: line.item_id ?? undefined,
              supplier_item_id: line.supplier_item_id ?? undefined,
              description: line.description,
              quantity: line.quantity,
              unit_cost: line.unit_cost,
            })),
          );
        }
      })
      .catch(() => toast.error('Failed to load purchase order'))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, suppliers]);

  const subtotal = useMemo(() => lines.reduce((sum, line) => sum + lineTotal(line), 0), [lines]);
  const taxAmount = useMemo(() => Math.round(subtotal * (Number(taxRate) || 0) / 100 * 100) / 100, [subtotal, taxRate]);
  const total = Math.round((subtotal + taxAmount) * 100) / 100;

  const updateLine = (key: string, patch: Partial<LineDraft>) => {
    setLines((prev) => prev.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  };

  const handleApprove = async () => {
    if (!poId) return;
    setApproving(true);
    try {
      const updated = await PurchaseOrderService.update(poId, { approval_status: 'approved' });
      setApprovalStatus(updated.approval_status ?? 'approved');
      toast.success('Purchase order approved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to approve purchase order');
    } finally {
      setApproving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (businessId == null) {
      toast.error('Select a business first');
      return;
    }
    if (!selectedSupplier?.id) {
      toast.error('Choose a supplier');
      return;
    }
    const usable = lines.filter((line) => line.description.trim() && line.quantity > 0);
    if (usable.length === 0) {
      toast.error('Add at least one line');
      return;
    }
    setSaving(true);
    try {
      const header: CreatePurchaseOrderDto = {
        supplier_id: selectedSupplier.id,
        business_id: businessId,
        status,
        quote_reference: quoteReference.trim() || undefined,
        issue_date: issueDate,
        expected_delivery_date: expectedDeliveryDate || undefined,
        subtotal,
        tax_rate: Number(taxRate) || 0,
        tax_amount: taxAmount,
        total,
        currency: 'ZAR',
        notes: notes.trim() || undefined,
      };
      const apiLines = usable.map((line) => ({
        item_id: line.item_id,
        supplier_item_id: line.supplier_item_id,
        description: line.description.trim(),
        quantity: Math.max(1, Math.round(line.quantity)),
        unit_cost: line.unit_cost,
        total: lineTotal({ ...line, quantity: Math.max(1, Math.round(line.quantity)) }),
        unit_type: 'qty' as const,
      }));
      let currentId = poId;
      if (!currentId) {
        const created = await PurchaseOrderService.create(header);
        currentId = created.id;
        setPoId(currentId);
        setPoNumber(created.po_number);
        setApprovalStatus(created.approval_status ?? 'not_required');
      }
      if (!currentId) throw new Error('Missing purchase order id');
      await PurchaseOrderService.updateFull(currentId, header, apiLines);
      toast.success(isEdit ? 'Purchase order saved' : 'Purchase order created');
      navigate(`/app/purchasing/orders/${currentId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save purchase order');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-slate-500 py-6">Loading…</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link to="/app/purchasing/orders" className="text-sm text-indigo-600 dark:text-indigo-400 no-underline">
          ← Back
        </Link>
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
          {isEdit ? 'Edit purchase order' : 'New purchase order'}
        </h1>
        {poNumber && (
          <span className="font-mono text-sm text-slate-500 dark:text-slate-400">{poNumber}</span>
        )}
        {approvalStatus !== 'not_required' && (
          <span
            className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${APPROVAL_CLASSES[approvalStatus]}`}
          >
            {APPROVAL_LABELS[approvalStatus]}
          </span>
        )}
        {approvalStatus === 'pending' && poId && (
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

      <div className="grid gap-4 sm:grid-cols-2">
        <AppLabledAutocomplete
          label="Supplier *"
          options={suppliers}
          value={selectedSupplier?.id != null ? String(selectedSupplier.id) : ''}
          displayValue={selectedSupplier?.name ?? ''}
          accessor="name"
          valueAccessor="id"
          onSelect={(supplier) => setSelectedSupplier(supplier as Supplier)}
          onClear={() => setSelectedSupplier(null)}
          required
          placeholder="Search supplier…"
        />
        <AppInputLabeled
          label="Quote reference"
          value={quoteReference}
          onChange={(e) => setQuoteReference(e.target.value)}
          placeholder="Supplier's quote number"
        />
        <AppLabeledSelectInput
          label="Status"
          value={status}
          options={[
            { value: 'draft', label: 'Draft' },
            { value: 'sent', label: 'Sent' },
            { value: 'cancelled', label: 'Cancelled' },
          ]}
          onChange={(e) => setStatus(e.target.value as PurchaseOrderStatus)}
        />
        <AppInputLabeled label="Issue date" type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} required />
        <AppInputLabeled
          label="Expected delivery"
          type="date"
          value={expectedDeliveryDate}
          onChange={(e) => setExpectedDeliveryDate(e.target.value)}
        />
        <AppInputLabeled
          label="Tax %"
          type="number"
          value={taxRate}
          onChange={(e) => setTaxRate(e.target.value)}
          onFocus={() => {
            if (Number(taxRate) === 0) setTaxRate('15');
          }}
          min={0}
          step={0.01}
        />
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Lines</h2>
        {lines.map((line) => (
          <div key={line.key} className="grid gap-2 sm:grid-cols-12 items-end">
            <div className="sm:col-span-4">
              <AppLabledAutocomplete
                label="Supplier item"
                options={supplierItems}
                value={line.supplier_item_id != null ? String(line.supplier_item_id) : ''}
                displayValue={line.supplier_item_id != null ? line.description : ''}
                accessor="name"
                valueAccessor="id"
                onSelect={(item) => {
                  const si = item as SupplierItem;
                  updateLine(line.key, {
                    supplier_item_id: si.id,
                    item_id: undefined,
                    description: si.name,
                    unit_cost: si.cost_price,
                  });
                }}
                onClear={() => updateLine(line.key, { supplier_item_id: undefined })}
                placeholder={selectedSupplier ? "Supplier's catalog…" : 'Choose a supplier first'}
                disabled={!selectedSupplier}
              />
            </div>
            <div className="sm:col-span-3">
              <AppLabledAutocomplete
                label="Stock item"
                options={items}
                value={line.item_id != null ? String(line.item_id) : ''}
                displayValue={line.item_id != null ? line.description : ''}
                accessor="name"
                valueAccessor="id"
                onSelect={(item) => {
                  const stock = item as Item;
                  updateLine(line.key, {
                    item_id: stock.id,
                    supplier_item_id: undefined,
                    description: stock.name,
                    unit_cost: stock.cost_price ?? stock.unit_price ?? 0,
                  });
                }}
                onClear={() => updateLine(line.key, { item_id: undefined })}
                placeholder="Optional catalog item…"
              />
            </div>
            <div className="sm:col-span-2">
              <AppInputLabeled
                label="Description *"
                value={line.description}
                onChange={(e) => updateLine(line.key, { description: e.target.value })}
                required
              />
            </div>
            <div className="sm:col-span-1">
              <AppInputLabeled
                label="Qty"
                type="number"
                min={1}
                step={1}
                value={String(line.quantity)}
                onChange={(e) => updateLine(line.key, { quantity: Number(e.target.value) || 0 })}
              />
            </div>
            <div className="sm:col-span-1">
              <AppInputLabeled
                label="Unit cost"
                type="number"
                min={0}
                step={0.01}
                value={String(line.unit_cost)}
                onChange={(e) => updateLine(line.key, { unit_cost: Number(e.target.value) || 0 })}
              />
            </div>
            <button
              type="button"
              className="sm:col-span-1 text-xs text-slate-500 hover:text-red-600"
              onClick={() => setLines((prev) => (prev.length === 1 ? prev : prev.filter((l) => l.key !== line.key)))}
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          className="text-sm text-indigo-600 dark:text-indigo-400"
          onClick={() =>
            setLines((prev) => [...prev, { key: String(Date.now()), description: '', quantity: 1, unit_cost: 0 }])
          }
        >
          + Add line
        </button>
      </section>

      <p className="text-sm text-slate-600 dark:text-slate-300">
        Subtotal {subtotal.toFixed(2)} · Tax {taxAmount.toFixed(2)} · <strong>Total {total.toFixed(2)} ZAR</strong>
      </p>
      <AppLabeledAreaInput label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save purchase order'}
        </button>
        <button
          type="button"
          className="text-sm text-slate-500"
          onClick={() => navigate('/app/purchasing/orders')}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export default PurchaseOrderFormPage;
