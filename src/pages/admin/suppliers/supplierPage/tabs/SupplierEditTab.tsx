import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LuTrash2 } from 'react-icons/lu';
import toast from 'react-hot-toast';
import AppInputLabeled from '@/components/forms/AppLabledInput';
import AppLabledAutocomplete from '@/components/forms/AppLabledAutocomplete';
import AppLabeledPhoneInput from '@/components/forms/AppLabeledPhoneInput';
import AppLabeledSelectInput from '@/components/forms/AppLabledSelectInput';
import AppLabeledAreaInput from '@/components/forms/AppLabledAreaInput';
import { CompanyBankingFields } from '@/pages/admin/companies/CompanyBankingFields';
import SupplierService from '@/services/supplierService';
import BankingDetailsService from '@/services/bankingDetailsService';
import { useSupplierStore } from '@/stores/data/SupplierStore';
import { useKnownCompanyStore } from '@/stores/data/KnownCompanyStore';
import { AppButton, DeleteConfirmationModal } from '@/components/ComponentsIndex';
import { bankingDetailsSchema, supplierSchema } from '@/validation/schemas';
import type { CreateSupplierDto, SupplierCostType } from '@/types/supplier';
import { SUPPLIER_COST_TYPE_OPTIONS } from '@/types/supplier';
import type { BankingDetails, CreateBankingDetailsDto } from '@/types/bankingDetails';
import type { KnownCompany } from '@/types/knownCompany';
import type { SupplierTabProps } from './types';
import { SupplierRecurrenceFields } from '../../SupplierRecurrenceFields';

const emptyBanking: CreateBankingDetailsDto = {
  bank_name: '',
  account_number: '',
  account_holder: '',
  account_type: 'cheque',
  branch_code: '',
  swift_code: '',
};

function normalizeWebsite(raw: string | undefined): string | undefined {
  const trimmed = raw?.trim();
  if (!trimmed) return undefined;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function SupplierEditTab({ supplier, onSupplierUpdate }: SupplierTabProps) {
  const navigate = useNavigate();
  const removeSupplier = useSupplierStore((s) => s.removeSupplier);
  const upsertSupplier = useSupplierStore((s) => s.upsertSupplier);
  const knownCompanies = useKnownCompanyStore((s) => s.knownCompanies);
  const fetchKnownCompanies = useKnownCompanyStore((s) => s.fetchKnownCompanies);
  const [form, setForm] = useState<Omit<CreateSupplierDto, 'business_id'>>({
    name: supplier.name,
    contact_person: supplier.contact_person ?? '',
    email: supplier.email ?? '',
    phone: supplier.phone ?? '',
    website: supplier.website ?? '',
    address: supplier.address ?? '',
    vat_number: supplier.vat_number ?? '',
    registration_number: supplier.registration_number ?? '',
    cost_type: supplier.cost_type ?? null,
    payment_terms_days: supplier.payment_terms_days ?? 30,
    currency: supplier.currency ?? 'ZAR',
    recurrence_interval: supplier.recurrence_interval ?? null,
    next_expected_payment_date: supplier.next_expected_payment_date ?? null,
    expected_amount: supplier.expected_amount ?? null,
    notes: supplier.notes ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [includeBankingDetails, setIncludeBankingDetails] = useState(false);
  const [bankingForm, setBankingForm] = useState<CreateBankingDetailsDto>(emptyBanking);
  const [existingBanking, setExistingBanking] = useState<BankingDetails | null>(null);

  useEffect(() => {
    void fetchKnownCompanies();
  }, [fetchKnownCompanies]);

  useEffect(() => {
    if (!supplier.id) return;
    let cancelled = false;
    BankingDetailsService.findBySupplierId(supplier.id)
      .then((rows) => {
        if (cancelled) return;
        const banking = rows[0] ?? null;
        setExistingBanking(banking);
        if (banking) {
          setIncludeBankingDetails(true);
          setBankingForm({
            bank_name: banking.bank_name,
            account_number: banking.account_number,
            account_holder: banking.account_holder ?? '',
            account_type: banking.account_type ?? 'cheque',
            branch_code: banking.branch_code ?? '',
            branch_name: banking.branch_name ?? '',
            swift_code: banking.swift_code ?? '',
            label: banking.label ?? '',
          });
        }
      })
      .catch(() => {
        /* optional section — leave form usable without banking */
      });
    return () => {
      cancelled = true;
    };
  }, [supplier.id]);

  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const applyKnownCompany = (company: KnownCompany) => {
    setForm((prev) => ({
      ...prev,
      name: company.name,
      website: company.website ?? prev.website,
      phone: company.phone ?? prev.phone,
      email: company.email ?? prev.email,
      address: company.address ?? prev.address,
      vat_number: company.vat_number ?? prev.vat_number,
      registration_number: company.registration_number ?? prev.registration_number,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplier.id) return;
    const website = normalizeWebsite(form.website);
    const validation = supplierSchema.safeParse({ ...form, website: website ?? '' });
    if (!validation.success) {
      toast.error(validation.error.issues[0]?.message ?? 'Please check your input');
      return;
    }
    setSaving(true);
    try {
      const updated = await SupplierService.update(supplier.id, {
        ...form,
        name: form.name.trim(),
        contact_person: form.contact_person?.trim() || undefined,
        email: form.email?.trim() || undefined,
        phone: form.phone?.trim() || undefined,
        website,
        address: form.address?.trim() || undefined,
        vat_number: form.vat_number?.trim() || undefined,
        registration_number: form.registration_number?.trim() || undefined,
        cost_type: form.cost_type || null,
        recurrence_interval: form.recurrence_interval || null,
        next_expected_payment_date: form.recurrence_interval
          ? form.next_expected_payment_date || null
          : null,
        expected_amount: form.recurrence_interval ? form.expected_amount ?? null : null,
        notes: form.notes?.trim() || undefined,
      });
      if (includeBankingDetails) {
        const bankValidation = bankingDetailsSchema.safeParse(bankingForm);
        if (!bankValidation.success) {
          throw new Error(bankValidation.error.issues[0]?.message ?? 'Banking details are invalid');
        }
        const bankingPayload: CreateBankingDetailsDto = {
          ...bankingForm,
          supplier_id: supplier.id,
          label: bankingForm.label?.trim() || 'Primary Account',
          bank_name: bankingForm.bank_name.trim(),
          account_holder: bankingForm.account_holder?.trim() || undefined,
          account_number: bankingForm.account_number.trim(),
          branch_code: bankingForm.branch_code?.trim() || undefined,
          branch_name: bankingForm.branch_name?.trim() || undefined,
          swift_code: bankingForm.swift_code?.trim() || undefined,
          is_primary: true,
          is_active: true,
        };
        if (existingBanking?.id) {
          await BankingDetailsService.update(existingBanking.id, bankingPayload);
        } else {
          const created = await BankingDetailsService.create(bankingPayload);
          setExistingBanking(created);
        }
      }
      toast.success('Supplier updated');
      upsertSupplier(updated);
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
            <AppLabledAutocomplete
              label="Supplier name *"
              required
              options={knownCompanies}
              accessor="name"
              valueAccessor="id"
              displayValue={form.name}
              onSelect={applyKnownCompany}
              onChange={(name) => update('name', name)}
              onClear={() => update('name', '')}
              disabled={saving}
              placeholder="Search known companies or type a name…"
            />
          </div>
          <AppLabeledSelectInput
            label="Cost type"
            value={form.cost_type ?? ''}
            onChange={(e) =>
              update('cost_type', (e.target.value || null) as SupplierCostType | null)
            }
            disabled={saving}
            options={SUPPLIER_COST_TYPE_OPTIONS}
            placeholder="Select cost type…"
          />
          <AppInputLabeled
            label="Website"
            type="text"
            value={form.website ?? ''}
            onChange={(e) => update('website', e.target.value)}
            disabled={saving}
            placeholder="https://example.com"
          />
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
          <AppLabeledPhoneInput
            label="Phone"
            value={form.phone ?? ''}
            onChange={(phone) => update('phone', phone)}
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
          <SupplierRecurrenceFields
            interval={form.recurrence_interval ?? null}
            nextExpectedPaymentDate={form.next_expected_payment_date ?? null}
            expectedAmount={form.expected_amount ?? null}
            onIntervalChange={(value) => update('recurrence_interval', value)}
            onNextDateChange={(value) => update('next_expected_payment_date', value)}
            onExpectedAmountChange={(value) => update('expected_amount', value)}
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

        <CompanyBankingFields
          includeBankingDetails={includeBankingDetails}
          onToggle={setIncludeBankingDetails}
          bankingForm={bankingForm}
          onBankingFormChange={(updates) => setBankingForm((prev) => ({ ...prev, ...updates }))}
          disabled={saving}
        />

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
