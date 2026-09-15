import { useState } from 'react';
import toast from 'react-hot-toast';
import { LuPlus, LuTrash2 } from 'react-icons/lu';
import AppInputLabeled from '@/components/forms/AppLabledInput';
import SupplierItemService from '@/services/supplierItemService';
import { formatCurrency } from '@/utils/currency';
import type { CreateSupplierItemDto } from '@/types/supplier';
import type { SupplierTabProps } from './types';

const blankDraft: Omit<CreateSupplierItemDto, 'supplier_id'> = {
  sku: '',
  name: '',
  description: '',
  cost_price: 0,
  currency: 'ZAR',
  moq: undefined,
  lead_time_days: undefined,
  unit_type: 'qty',
};

export function SupplierItemsTab({ supplier, items, onItemsChange }: SupplierTabProps) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState(blankDraft);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const update = <K extends keyof typeof blankDraft>(key: K, value: (typeof blankDraft)[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const handleAdd = async () => {
    if (!draft.name.trim()) {
      toast.error('Item name is required');
      return;
    }
    if (!supplier.id) return;
    setSaving(true);
    try {
      await SupplierItemService.create({
        ...draft,
        supplier_id: supplier.id,
        name: draft.name.trim(),
        sku: draft.sku?.trim() || undefined,
        description: draft.description?.trim() || undefined,
      });
      toast.success('Item added');
      setDraft(blankDraft);
      setAdding(false);
      onItemsChange?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add item');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await SupplierItemService.delete(id);
      toast.success('Item removed');
      onItemsChange?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove item');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Supplier item catalog</h2>
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400"
          >
            <LuPlus size={14} /> Add item
          </button>
        )}
      </div>

      {items.length === 0 && !adding && (
        <p className="text-sm text-slate-400 dark:text-slate-500">No items added for this supplier yet.</p>
      )}

      {items.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 dark:text-slate-400">
              <th className="py-1 font-medium">SKU</th>
              <th className="py-1 font-medium">Name</th>
              <th className="py-1 font-medium text-right">Cost price</th>
              <th className="py-1 font-medium">MOQ</th>
              <th className="py-1 font-medium">Lead time</th>
              <th className="py-1" />
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t border-slate-100 dark:border-slate-700">
                <td className="py-2 text-slate-500 dark:text-slate-400">{item.sku ?? '—'}</td>
                <td className="py-2 font-medium text-slate-800 dark:text-slate-100">{item.name}</td>
                <td className="py-2 text-right">{formatCurrency(item.cost_price, item.currency)}</td>
                <td className="py-2 text-slate-600 dark:text-slate-300">{item.moq ?? '—'}</td>
                <td className="py-2 text-slate-600 dark:text-slate-300">
                  {item.lead_time_days != null ? `${item.lead_time_days}d` : '—'}
                </td>
                <td className="py-2 text-right">
                  <button
                    type="button"
                    disabled={deletingId === item.id}
                    onClick={() => item.id != null && void handleDelete(item.id)}
                    className="text-slate-400 hover:text-red-600 disabled:opacity-50"
                  >
                    <LuTrash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {adding && (
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <AppInputLabeled label="Item name *" required value={draft.name} onChange={(e) => update('name', e.target.value)} />
            <AppInputLabeled label="SKU" value={draft.sku ?? ''} onChange={(e) => update('sku', e.target.value)} />
            <AppInputLabeled
              label="Cost price"
              type="number"
              min={0}
              step={0.01}
              value={String(draft.cost_price)}
              onChange={(e) => update('cost_price', Number(e.target.value) || 0)}
            />
            <AppInputLabeled
              label="MOQ"
              type="number"
              min={1}
              step={1}
              value={draft.moq != null ? String(draft.moq) : ''}
              onChange={(e) => update('moq', e.target.value ? Number(e.target.value) : undefined)}
            />
            <AppInputLabeled
              label="Lead time (days)"
              type="number"
              min={0}
              step={1}
              value={draft.lead_time_days != null ? String(draft.lead_time_days) : ''}
              onChange={(e) => update('lead_time_days', e.target.value ? Number(e.target.value) : undefined)}
            />
            <div className="sm:col-span-2">
              <AppInputLabeled
                label="Description"
                value={draft.description ?? ''}
                onChange={(e) => update('description', e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleAdd()}
              className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save item'}
            </button>
            <button
              type="button"
              onClick={() => {
                setAdding(false);
                setDraft(blankDraft);
              }}
              className="text-xs text-slate-500"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default SupplierItemsTab;
