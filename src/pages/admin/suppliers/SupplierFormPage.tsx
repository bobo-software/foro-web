import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import AppInputLabeled from '@/components/forms/AppLabledInput';
import AppLabeledAreaInput from '@/components/forms/AppLabledAreaInput';
import SupplierService from '@/services/supplierService';
import { useBusinessStore } from '@/stores/data/BusinessStore';
import { useSupplierStore } from '@/stores/data/SupplierStore';
import { supplierSchema } from '@/validation/schemas';
import type { CreateSupplierDto } from '@/types/supplier';

const initial: Omit<CreateSupplierDto, 'business_id'> = {
  name: '',
  contact_person: '',
  email: '',
  phone: '',
  address: '',
  vat_number: '',
  registration_number: '',
  payment_terms_days: 30,
  currency: 'ZAR',
  notes: '',
};

export function SupplierFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);
  const businessId = useBusinessStore((s) => s.currentBusiness?.id);
  const fetchSuppliers = useSupplierStore((s) => s.fetchSuppliers);
  const [form, setForm] = useState(initial);
  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    SupplierService.findById(Number(id))
      .then((data) => {
        if (cancelled || !data) return;
        setForm({
          name: data.name,
          contact_person: data.contact_person ?? '',
          email: data.email ?? '',
          phone: data.phone ?? '',
          address: data.address ?? '',
          vat_number: data.vat_number ?? '',
          registration_number: data.registration_number ?? '',
          payment_terms_days: data.payment_terms_days ?? 30,
          currency: data.currency ?? 'ZAR',
          notes: data.notes ?? '',
        });
      })
      .catch(() => toast.error('Failed to load supplier'))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const update = <K extends keyof typeof initial>(key: K, value: (typeof initial)[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = supplierSchema.safeParse(form);
    if (!validation.success) {
      toast.error(validation.error.issues[0]?.message ?? 'Please check your input');
      return;
    }
    if (!isEditMode && businessId == null) {
      toast.error('Select a business first');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        name: form.name.trim(),
        contact_person: form.contact_person?.trim() || undefined,
        email: form.email?.trim() || undefined,
        phone: form.phone?.trim() || undefined,
        address: form.address?.trim() || undefined,
        vat_number: form.vat_number?.trim() || undefined,
        registration_number: form.registration_number?.trim() || undefined,
        notes: form.notes?.trim() || undefined,
      };
      if (isEditMode) {
        await SupplierService.update(Number(id), payload);
        toast.success('Supplier updated');
        navigate(`/app/purchasing/suppliers/${id}`);
      } else {
        const created = await SupplierService.create({ ...payload, business_id: businessId! });
        await fetchSuppliers();
        toast.success('Supplier created');
        navigate(`/app/purchasing/suppliers/${created.id}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Failed to ${isEditMode ? 'update' : 'create'} supplier`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-slate-500 dark:text-slate-400 py-6">Loading…</p>;
  }

  return (
    <div className="flex min-h-0 flex-col">
      <div className="flex shrink-0 items-center gap-3">
        <Link
          to={isEditMode ? `/app/purchasing/suppliers/${id}` : '/app/purchasing/suppliers'}
          className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 no-underline"
        >
          ← {isEditMode ? 'Back to supplier' : 'Back to suppliers'}
        </Link>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
          {isEditMode ? 'Edit supplier' : 'Add supplier'}
        </h1>
      </div>
      <form
        onSubmit={handleSubmit}
        className="mt-6 flex min-h-0 flex-1 flex-col rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm lg:p-8"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <AppInputLabeled
              label="Supplier name *"
              required
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              disabled={saving}
              placeholder="e.g. Acme Supplies"
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
          <div className="sm:col-span-2">
            <AppLabeledAreaInput
              label="Notes"
              rows={3}
              value={form.notes ?? ''}
              onChange={(e) => update('notes', e.target.value)}
              disabled={saving}
            />
          </div>
        </div>

        <div className="mt-8 flex shrink-0 gap-3 border-t border-slate-200 dark:border-slate-700 pt-6">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {saving ? 'Saving…' : isEditMode ? 'Save changes' : 'Add supplier'}
          </button>
          <Link
            to={isEditMode ? `/app/purchasing/suppliers/${id}` : '/app/purchasing/suppliers'}
            className="rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 no-underline hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

export default SupplierFormPage;
