import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { LuTrash2 } from 'react-icons/lu';
import { AppDataTable, type AppDataTableColumn } from '@/components/elements/AppDataTable';
import {
  TableCount,
  TableCreateButton,
  TableSearchInput,
  TableToolbarEnd,
  TableToolbarStart,
  matchesSearch,
} from '@/components/elements/AppTableToolbar';
import AppInputLabeled from '@/components/forms/AppLabledInput';
import SupplierItemService from '@/services/supplierItemService';
import { formatCurrency } from '@/utils/currency';
import type { CreateSupplierItemDto, SupplierItem } from '@/types/supplier';
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

export function SupplierItemsTab({ supplier, items, loading, onItemsChange }: SupplierTabProps) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState(blankDraft);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  const filtered = useMemo(
    () => items.filter((item) => matchesSearch(search, [item.sku, item.name, item.description])),
    [items, search],
  );

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

  const columns: AppDataTableColumn<SupplierItem>[] = [
    {
      id: 'sku',
      header: 'SKU',
      cellClassName: 'font-mono text-slate-500 dark:text-slate-400',
      render: (item) => item.sku || '—',
    },
    {
      id: 'name',
      header: 'Name',
      cellClassName: 'font-medium text-slate-800 dark:text-slate-100',
      render: (item) => item.name,
    },
    {
      id: 'cost_price',
      header: 'Cost price',
      align: 'right',
      cellClassName: 'tabular-nums',
      render: (item) => formatCurrency(item.cost_price, item.currency),
    },
    {
      id: 'moq',
      header: 'MOQ',
      cellClassName: 'text-slate-600 dark:text-slate-300',
      render: (item) => item.moq ?? '—',
    },
    {
      id: 'lead_time',
      header: 'Lead time',
      cellClassName: 'text-slate-600 dark:text-slate-300',
      render: (item) => (item.lead_time_days != null ? `${item.lead_time_days}d` : '—'),
    },
    {
      id: 'actions',
      header: '',
      align: 'right',
      render: (item) => (
        <button
          type="button"
          disabled={deletingId === item.id}
          onClick={() => item.id != null && void handleDelete(item.id)}
          className="text-slate-400 hover:text-red-600 disabled:opacity-50"
          aria-label={`Remove ${item.name}`}
        >
          <LuTrash2 size={14} />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      {adding && (
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm p-4 space-y-3">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">New supplier item</h2>
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

      <AppDataTable<SupplierItem>
        toolbar={
          <>
            <TableToolbarStart>
              <TableSearchInput
                value={search}
                onChange={setSearch}
                placeholder="Search SKU, name…"
                ariaLabel="Search supplier items"
              />
            </TableToolbarStart>
            <TableToolbarEnd>
              <TableCount count={filtered.length} noun="item" loading={loading} />
              <TableCreateButton label="Add item" onClick={() => setAdding(true)} disabled={adding} />
            </TableToolbarEnd>
          </>
        }
        columns={columns}
        data={filtered}
        getRowKey={(row, index) => row.id ?? `item-${index}`}
        loading={loading}
        emptyMessage={search.trim() ? 'No items match your search.' : 'No items added for this supplier yet.'}
        pageSize={20}
        pageSizeOptions={[10, 20, 50]}
      />
    </div>
  );
}

export default SupplierItemsTab;
