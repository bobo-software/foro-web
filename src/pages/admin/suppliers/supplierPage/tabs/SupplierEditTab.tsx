import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LuTrash2 } from 'react-icons/lu';
import toast from 'react-hot-toast';
import AppInputLabeled from '@/components/forms/AppLabledInput';
import AppLabeledAreaInput from '@/components/forms/AppLabledAreaInput';
import SupplierService from '@/services/supplierService';
import { useSupplierStore } from '@/stores/data/SupplierStore';
import { AppButton, DeleteConfirmationModal } from '@/components/ComponentsIndex';
import type { CreateSupplierDto } from '@/types/supplier';
import type { SupplierTabProps } from './types';

export function SupplierEditTab({ supplier, onSupplierUpdate }: SupplierTabProps) {
  const navigate = useNavigate();
  const removeSupplier = useSupplierStore((s) => s.removeSupplier);
  const [form, setForm] = useState<Omit<CreateSupplierDto, 'business_id'>>({
    name: supplier.name,
    contact_person: supplier.contact_person ?? '',
    email: supplier.email ?? '',
    phone: supplier.phone ?? '',
    address: supplier.address ?? '',
    vat_number: supplier.vat_number ?? '',
    registration_number: supplier.registration_number ?? '',
    payment_terms_days: supplier.payment_terms_days ?? 30,
    currency: supplier.currency ?? 'ZAR',
    notes: supplier.notes ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Supplier name is required');
      return;
    }
    if (!supplier.id) return;
    setSaving(true);
    try {
      const updated = await SupplierService.update(supplier.id, {
        ...form,
        name: form.name.trim(),
        contact_person: form.contact_person?.trim() || undefined,
        email: form.email?.trim() || undefined,
        phone: form.phone?.trim() || undefined,
        address: form.address?.trim() || undefined,
        vat_number: form.vat_number?.trim() || undefined,
        registration_number: form.registration_number?.trim() || undefined,
        notes: form.notes?.trim() || undefined,
      });
      toast.success('Supplier updated');
      onSupplierUpdate?.(updated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update supplier');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!supplier.id) return;
    setDeleting(true);
    try {
      await removeSupplier(supplier.id);
      toast.success('Supplier deleted');
      setShowDeleteModal(false);
      navigate('/app/purchasing/suppliers', { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete supplier');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Edit supplier details</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <AppInputLabeled
              label="Supplier name *"
              required
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              disabled={saving}
            />
          </div>
          <AppInputLabeled
            label="Contact person"
            value={form.contact_person ?? ''}
            onChange={(e) => update('contact_person', e.target.value)}
            disabled={saving}
          />
          <AppInputLabeled
            label="Email"
            type="email"
            value={form.email ?? ''}
            onChange={(e) => update('email', e.target.value)}
            disabled={saving}
          />
          <AppInputLabeled
            label="Phone"
            value={form.phone ?? ''}
            onChange={(e) => update('phone', e.target.value)}
            disabled={saving}
          />
          <AppInputLabeled
            label="Payment terms (days)"
            type="number"
            min={0}
            step={1}
            value={String(form.payment_terms_days ?? 30)}
            onChange={(e) => update('payment_terms_days', Number(e.target.value) || 0)}
            disabled={saving}
          />
          <div className="sm:col-span-2">
            <AppInputLabeled
              label="Address"
              value={form.address ?? ''}
              onChange={(e) => update('address', e.target.value)}
              disabled={saving}
            />
          </div>
          <AppInputLabeled
            label="VAT number"
            value={form.vat_number ?? ''}
            onChange={(e) => update('vat_number', e.target.value)}
            disabled={saving}
          />
          <AppInputLabeled
            label="Registration number"
            value={form.registration_number ?? ''}
            onChange={(e) => update('registration_number', e.target.value)}
            disabled={saving}
          />
        </div>

        <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
          <AppLabeledAreaInput
            label="Notes"
            rows={4}
            value={form.notes ?? ''}
            onChange={(e) => update('notes', e.target.value)}
            disabled={saving}
          />
        </div>

        <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>

      <div className="mt-6 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-900/10 p-6">
        <h3 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-2">Danger Zone</h3>
        <p className="text-sm text-red-600 dark:text-red-400/80 mb-4">
          Deleting this supplier is permanent and cannot be undone.
        </p>
        <AppButton
          icon={<LuTrash2 className="w-4 h-4" />}
          label="Delete supplier"
          variant="red"
          onClick={() => setShowDeleteModal(true)}
        />
      </div>

      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete Supplier"
        message={`Are you sure you want to delete "${supplier.name}"? This action cannot be undone.`}
        itemName={supplier.name}
        isLoading={deleting}
        confirmButtonText="Delete Supplier"
      />
    </div>
  );
}

export default SupplierEditTab;
