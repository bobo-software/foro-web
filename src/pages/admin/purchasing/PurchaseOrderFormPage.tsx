import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import AppInputLabeled from '@/components/forms/AppLabledInput';
import AppLabeledSelectInput from '@/components/forms/AppLabledSelectInput';
import AppLabeledAreaInput from '@/components/forms/AppLabledAreaInput';
import AppLabledAutocomplete from '@/components/forms/AppLabledAutocomplete';
import { useBusinessStore } from '@/stores/data/BusinessStore';
import { useCompanyStore } from '@/stores/data/CompanyStore';
import ItemService from '@/services/itemService';
import PurchaseOrderService from '@/services/purchaseOrderService';
import type { Company } from '@/types/company';
import { isSupplierCompany } from '@/types/company';
import type { Item } from '@/types/item';
import type { CreatePurchaseOrderDto, PurchaseOrderStatus } from '@/types/purchase';

interface LineDraft {
  key: string;
  item_id?: number;
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

export function PurchaseOrderFormPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const businessId = useBusinessStore((s) => s.currentBusiness?.id);
  const companies = useCompanyStore((s) => s.companies);
  const fetchCompanies = useCompanyStore((s) => s.fetchCompanies);
  const [items, setItems] = useState<Item[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [poNumber, setPoNumber] = useState('');
  const [status, setStatus] = useState<PurchaseOrderStatus>('draft');
  const [issueDate, setIssueDate] = useState(todayIso());
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [taxRate, setTaxRate] = useState('0');
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [lines, setLines] = useState<LineDraft[]>([
    { key: '1', description: '', quantity: 1, unit_cost: 0 },
  ]);

  const suppliers = useMemo(
    () => companies.filter((c) => !c.is_owner_company && isSupplierCompany(c)),
    [companies],
  );
  const companyChoices = suppliers.length > 0 ? suppliers : companies.filter((c) => !c.is_owner_company);

  useEffect(() => {
    void fetchCompanies();
  }, [fetchCompanies]);

  useEffect(() => {
    if (businessId == null) return;
    void ItemService.findAll({ where: { business_id: businessId } }).then(setItems).catch(() => setItems([]));
  }, [businessId]);

  useEffect(() => {
    if (isEdit || businessId == null) return;
    void PurchaseOrderService.nextNumber(businessId).then(setPoNumber).catch(() => setPoNumber('PO-0001'));
  }, [isEdit, businessId]);

  useEffect(() => {
    const companyId = Number(searchParams.get('company_id'));
    if (!companyId || selectedCompany) return;
    const match = companies.find((c) => c.id === companyId);
    if (match) setSelectedCompany(match);
  }, [searchParams, companies, selectedCompany]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([PurchaseOrderService.findById(Number(id)), PurchaseOrderService.findItems(Number(id))])
      .then(([po, poItems]) => {
        if (cancelled || !po) return;
        setPoNumber(po.po_number);
        setStatus(po.status);
        setIssueDate(po.issue_date?.slice(0, 10) ?? todayIso());
        setExpectedDeliveryDate(po.expected_delivery_date?.slice(0, 10) ?? '');
        setNotes(po.notes ?? '');
        setTaxRate(String(po.tax_rate ?? 0));
        if (po.company_id != null) {
          const match = companies.find((c) => c.id === po.company_id);
          if (match) setSelectedCompany(match);
        }
        if (poItems.length > 0) {
          setLines(
            poItems.map((line, index) => ({
              key: String(line.id ?? index),
              item_id: line.item_id ?? undefined,
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
  }, [id, companies]);

  const subtotal = useMemo(() => lines.reduce((sum, line) => sum + lineTotal(line), 0), [lines]);
  const taxAmount = useMemo(() => Math.round(subtotal * (Number(taxRate) || 0) / 100 * 100) / 100, [subtotal, taxRate]);
  const total = Math.round((subtotal + taxAmount) * 100) / 100;

  const updateLine = (key: string, patch: Partial<LineDraft>) => {
    setLines((prev) => prev.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (businessId == null) {
      toast.error('Select a business first');
      return;
    }
    if (!selectedCompany?.id) {
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
        company_id: selectedCompany.id,
        business_id: businessId,
        po_number: poNumber.trim(),
        status,
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
        description: line.description.trim(),
        quantity: Math.max(1, Math.round(line.quantity)),
        unit_cost: line.unit_cost,
        total: lineTotal({ ...line, quantity: Math.max(1, Math.round(line.quantity)) }),
        unit_type: 'qty' as const,
      }));
      let poId = id ? Number(id) : undefined;
      if (!poId) {
        const created = await PurchaseOrderService.create(header);
        poId = created.id;
      }
      if (!poId) throw new Error('Missing purchase order id');
      await PurchaseOrderService.updateFull(poId, header, apiLines);
      toast.success(isEdit ? 'Purchase order saved' : 'Purchase order created');
      navigate(`/app/purchasing/orders/${poId}`);
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
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <AppLabledAutocomplete
          label="Supplier *"
          options={companyChoices}
          value={selectedCompany?.id != null ? String(selectedCompany.id) : ''}
          displayValue={selectedCompany?.name ?? ''}
          accessor="name"
          valueAccessor="id"
          onSelect={(company) => setSelectedCompany(company as Company)}
          onClear={() => setSelectedCompany(null)}
          required
          placeholder="Search supplier…"
        />
        <AppInputLabeled label="PO number *" value={poNumber} onChange={(e) => setPoNumber(e.target.value)} required />
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
            <div className="sm:col-span-5">
              <AppLabledAutocomplete
                label="Stock item"
                options={items}
                value={line.item_id != null ? String(line.item_id) : ''}
                displayValue={line.description}
                accessor="name"
                valueAccessor="id"
                onSelect={(item) => {
                  const stock = item as Item;
                  updateLine(line.key, {
                    item_id: stock.id,
                    description: stock.name,
                    unit_cost: stock.cost_price ?? stock.unit_price ?? 0,
                  });
                }}
                onClear={() => updateLine(line.key, { item_id: undefined })}
                placeholder="Optional catalog item…"
              />
            </div>
            <div className="sm:col-span-3">
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
            <div className="sm:col-span-2">
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
