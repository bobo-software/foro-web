import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { AppDataTable, type AppDataTableColumn } from '@/components/elements/AppDataTable';
import AppButton from '@/components/buttons/AppButton';
import AppInputLabeled from '@/components/forms/AppLabledInput';
import AppLabeledPhoneInput from '@/components/forms/AppLabeledPhoneInput';
import AppLabeledAreaInput from '@/components/forms/AppLabledAreaInput';
import { AppModal } from '@/components/modals/AppModal';
import KnownCompanyService from '@/services/knownCompanyService';
import { useKnownCompanyStore } from '@/stores/data/KnownCompanyStore';
import type { CreateKnownCompanyDto, KnownCompany } from '@/types/knownCompany';
import { SuperadminNav } from './SuperadminNav';

const emptyForm: CreateKnownCompanyDto = {
  name: '',
  website: '',
  phone: '',
  email: '',
  address: '',
  vat_number: '',
  registration_number: '',
  notes: '',
  active: true,
  country: 'ZA',
};

function normalizeWebsite(raw: string | undefined): string | undefined {
  const trimmed = raw?.trim();
  if (!trimmed) return undefined;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function KnownCompaniesPage() {
  const knownCompanies = useKnownCompanyStore((s) => s.knownCompanies);
  const loading = useKnownCompanyStore((s) => s.loading);
  const error = useKnownCompanyStore((s) => s.error);
  const fetchAllKnownCompanies = useKnownCompanyStore((s) => s.fetchAllKnownCompanies);
  const upsertLocal = useKnownCompanyStore((s) => s.upsertLocal);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<KnownCompany | null>(null);
  const [form, setForm] = useState<CreateKnownCompanyDto>(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void fetchAllKnownCompanies();
  }, [fetchAllKnownCompanies]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (row: KnownCompany) => {
    setEditing(row);
    setForm({
      name: row.name,
      website: row.website ?? '',
      phone: row.phone ?? '',
      email: row.email ?? '',
      address: row.address ?? '',
      vat_number: row.vat_number ?? '',
      registration_number: row.registration_number ?? '',
      notes: row.notes ?? '',
      active: row.active,
      country: row.country || 'ZA',
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Name is required');
      return;
    }
    setSaving(true);
    try {
      const payload: CreateKnownCompanyDto = {
        name: form.name.trim(),
        website: normalizeWebsite(form.website),
        phone: form.phone?.trim() || undefined,
        email: form.email?.trim() || undefined,
        address: form.address?.trim() || undefined,
        vat_number: form.vat_number?.trim() || undefined,
        registration_number: form.registration_number?.trim() || undefined,
        notes: form.notes?.trim() || undefined,
        country: form.country || 'ZA',
        active: form.active ?? true,
      };
      const saved = editing
        ? await KnownCompanyService.update(editing.id, payload)
        : await KnownCompanyService.create(payload);
      upsertLocal(saved);
      toast.success(editing ? 'Company updated' : 'Company added');
      setModalOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (row: KnownCompany) => {
    try {
      const updated = row.active
        ? await KnownCompanyService.deactivate(row.id)
        : await KnownCompanyService.activate(row.id);
      upsertLocal(updated);
      toast.success(row.active ? 'Deactivated' : 'Activated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  const columns: AppDataTableColumn<KnownCompany>[] = [
    {
      id: 'name',
      header: 'Name',
      cellClassName: 'font-medium text-slate-800 dark:text-slate-100',
      render: (row) => row.name,
    },
    {
      id: 'website',
      header: 'Website',
      render: (row) => row.website ?? '—',
    },
    {
      id: 'phone',
      header: 'Phone',
      render: (row) => row.phone ?? '—',
    },
    {
      id: 'active',
      header: 'Status',
      render: (row) => (
        <span
          className={
            row.active
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-slate-400 dark:text-slate-500'
          }
        >
          {row.active ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      render: (row) => (
        <button
          type="button"
          className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
          onClick={(e) => {
            e.stopPropagation();
            void toggleActive(row);
          }}
        >
          {row.active ? 'Deactivate' : 'Activate'}
        </button>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <SuperadminNav />
      <main className="mx-auto max-w-6xl space-y-4 px-4 py-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Known companies</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Shared catalog used to autofill supplier contact details for all tenants.
            </p>
          </div>
          <AppButton label="Add company" variant="blue" onClick={openCreate} />
        </div>

        <AppDataTable
          embedded
          columns={columns}
          data={knownCompanies}
          getRowKey={(row) => row.id}
          onRowClick={openEdit}
          loading={loading && knownCompanies.length === 0}
          error={error}
          emptyMessage="No known companies yet."
        />
      </main>

      <AppModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit known company' : 'Add known company'}
        size="lg"
        buttons={[
          { label: 'Cancel', variant: 'secondary', onClick: () => setModalOpen(false) },
          {
            label: 'Save',
            variant: 'primary',
            onClick: () => void handleSave(),
            disabled: saving,
            loading: saving,
            loadingLabel: 'Saving…',
          },
        ]}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <AppInputLabeled
              label="Name *"
              required
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              disabled={saving}
            />
          </div>
          <AppInputLabeled
            label="Website"
            value={form.website ?? ''}
            onChange={(e) => setForm((p) => ({ ...p, website: e.target.value }))}
            disabled={saving}
            placeholder="https://example.com"
          />
          <AppLabeledPhoneInput
            label="Phone"
            value={form.phone ?? ''}
            onChange={(phone) => setForm((p) => ({ ...p, phone }))}
            disabled={saving}
          />
          <AppInputLabeled
            label="Email"
            type="email"
            value={form.email ?? ''}
            onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            disabled={saving}
          />
          <AppInputLabeled
            label="Country"
            value={form.country ?? 'ZA'}
            onChange={(e) => setForm((p) => ({ ...p, country: e.target.value }))}
            disabled={saving}
          />
          <div className="sm:col-span-2">
            <AppInputLabeled
              label="Address"
              value={form.address ?? ''}
              onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
              disabled={saving}
            />
          </div>
          <AppInputLabeled
            label="VAT number"
            value={form.vat_number ?? ''}
            onChange={(e) => setForm((p) => ({ ...p, vat_number: e.target.value }))}
            disabled={saving}
          />
          <AppInputLabeled
            label="Registration number"
            value={form.registration_number ?? ''}
            onChange={(e) => setForm((p) => ({ ...p, registration_number: e.target.value }))}
            disabled={saving}
          />
          <div className="sm:col-span-2">
            <AppLabeledAreaInput
              label="Notes"
              rows={2}
              value={form.notes ?? ''}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              disabled={saving}
            />
          </div>
        </div>
      </AppModal>
    </div>
  );
}

export default KnownCompaniesPage;
