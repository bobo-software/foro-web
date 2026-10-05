import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import AppInputLabeled from '@/components/forms/AppLabledInput';
import AppLabledAutocomplete from '@/components/forms/AppLabledAutocomplete';
import AppLabeledPhoneInput from '@/components/forms/AppLabeledPhoneInput';
import AppLabeledSelectInput from '@/components/forms/AppLabledSelectInput';
import AppLabeledAreaInput from '@/components/forms/AppLabledAreaInput';
import { CompanyBankingFields } from '@/pages/admin/companies/CompanyBankingFields';
import SupplierService from '@/services/supplierService';
import BankingDetailsService from '@/services/bankingDetailsService';
import { useBusinessStore } from '@/stores/data/BusinessStore';
import { useSupplierStore } from '@/stores/data/SupplierStore';
import { useKnownCompanyStore } from '@/stores/data/KnownCompanyStore';
import { bankingDetailsSchema, supplierSchema } from '@/validation/schemas';
import type { CreateSupplierDto, SupplierCostType } from '@/types/supplier';
import { SUPPLIER_COST_TYPE_OPTIONS } from '@/types/supplier';
import type { BankingDetails, CreateBankingDetailsDto } from '@/types/bankingDetails';
import type { KnownCompany } from '@/types/knownCompany';
import { SupplierRecurrenceFields } from './SupplierRecurrenceFields';

const initial: Omit<CreateSupplierDto, 'business_id'> = {
  name: '',
  contact_person: '',
  email: '',
  phone: '',
  website: '',
  address: '',
  vat_number: '',
  registration_number: '',
  cost_type: null,
  payment_terms_days: 30,
  currency: 'ZAR',
  recurrence_interval: null,
  next_expected_payment_date: null,
  expected_amount: null,
  notes: '',
};

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

export function SupplierFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);
  const businessId = useBusinessStore((s) => s.currentBusiness?.id);
  const fetchSuppliers = useSupplierStore((s) => s.fetchSuppliers);
  const knownCompanies = useKnownCompanyStore((s) => s.knownCompanies);
  const fetchKnownCompanies = useKnownCompanyStore((s) => s.fetchKnownCompanies);
  const [form, setForm] = useState(initial);
  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [includeBankingDetails, setIncludeBankingDetails] = useState(false);
  const [bankingForm, setBankingForm] = useState<CreateBankingDetailsDto>(emptyBanking);
  const [existingBanking, setExistingBanking] = useState<BankingDetails | null>(null);

  useEffect(() => {
    void fetchKnownCompanies();
  }, [fetchKnownCompanies]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([
      SupplierService.findById(Number(id)),
      BankingDetailsService.findBySupplierId(Number(id)),
    ])
      .then(([data, bankingRows]) => {
        if (cancelled || !data) return;
        setForm({
          name: data.name,
          contact_person: data.contact_person ?? '',
          email: data.email ?? '',
          phone: data.phone ?? '',
          website: data.website ?? '',
          address: data.address ?? '',
          vat_number: data.vat_number ?? '',
          registration_number: data.registration_number ?? '',
          cost_type: data.cost_type ?? null,
          payment_terms_days: data.payment_terms_days ?? 30,
          currency: data.currency ?? 'ZAR',
          recurrence_interval: data.recurrence_interval ?? null,
          next_expected_payment_date: data.next_expected_payment_date ?? null,
          expected_amount: data.expected_amount ?? null,
          notes: data.notes ?? '',
        });
        const banking = bankingRows[0] ?? null;
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

  const saveBanking = async (supplierId: number) => {
    if (!includeBankingDetails) return;
    const bankValidation = bankingDetailsSchema.safeParse(bankingForm);
    if (!bankValidation.success) {
      throw new Error(bankValidation.error.issues[0]?.message ?? 'Banking details are invalid');
    }
    const bankingPayload: CreateBankingDetailsDto = {
      ...bankingForm,
      supplier_id: supplierId,
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
      await BankingDetailsService.create(bankingPayload);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const website = normalizeWebsite(form.website);
    const validation = supplierSchema.safeParse({ ...form, website: website ?? '' });
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
      };
      if (isEditMode) {
        await SupplierService.update(Number(id), payload);
        await saveBanking(Number(id));
        await fetchSuppliers();
        toast.success('Supplier updated');
        navigate(`/app/purchasing/suppliers/${id}`);
      } else {
        const created = await SupplierService.create({ ...payload, business_id: businessId! });
        if (created.id) await saveBanking(created.id);
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
          <div className="sm:col-span-2">
            <AppLabeledAreaInput
              label="Notes"
              rows={3}
              value={form.notes ?? ''}
              onChange={(e) => update('notes', e.target.value)}
              disabled={saving}
            />
          </div>
          <div className="sm:col-span-2">
            <CompanyBankingFields
              includeBankingDetails={includeBankingDetails}
              onToggle={setIncludeBankingDetails}
              bankingForm={bankingForm}
              onBankingFormChange={(updates) => setBankingForm((prev) => ({ ...prev, ...updates }))}
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
