import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import AppInputLabeled from '@/components/forms/AppLabledInput';
import AppLabeledAreaInput from '@/components/forms/AppLabledAreaInput';
import AppLabeledCheckbox from '@/components/forms/AppLabeledCheckbox';
import AppLabeledSelectInput from '@/components/forms/AppLabledSelectInput';
import { useBusinessStore } from '@/stores/data/BusinessStore';
import { useBusinessTaxStore } from '@/stores/data/BusinessTaxStore';
import { BUSINESS_TAX_ENTITY_LABELS, MONTH_LABELS, type BusinessTaxEntityType } from '@/types/businessTax';
import { businessTaxProfileSchema } from '@/validation/schemas';

const ENTITY_OPTIONS = (Object.keys(BUSINESS_TAX_ENTITY_LABELS) as BusinessTaxEntityType[]).map((value) => ({
  value,
  label: BUSINESS_TAX_ENTITY_LABELS[value],
}));

const MONTH_OPTIONS = MONTH_LABELS.map((label, index) => ({ value: String(index + 1), label }));

export function TaxProfilePage() {
  const navigate = useNavigate();
  const businessId = useBusinessStore((s) => s.currentBusiness?.id);
  const businessVatNumber = useBusinessStore((s) => s.currentBusiness?.vat_number);
  const profile = useBusinessTaxStore((s) => s.profile);
  const loading = useBusinessTaxStore((s) => s.profileLoading);
  const saving = useBusinessTaxStore((s) => s.saving);
  const error = useBusinessTaxStore((s) => s.error);
  const fetchProfile = useBusinessTaxStore((s) => s.fetchProfile);
  const saveProfile = useBusinessTaxStore((s) => s.saveProfile);

  const [entityType, setEntityType] = useState<BusinessTaxEntityType>('company');
  const [taxReference, setTaxReference] = useState('');
  const [yearEndMonth, setYearEndMonth] = useState('2');
  const [vatRegistered, setVatRegistered] = useState(false);
  const [ownerDateOfBirth, setOwnerDateOfBirth] = useState('');
  const [basicAmount, setBasicAmount] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile, businessId]);

  useEffect(() => {
    setEntityType(profile?.entity_type ?? 'company');
    setTaxReference(profile?.tax_reference ?? '');
    setYearEndMonth(String(profile?.financial_year_end_month ?? 2));
    setVatRegistered(profile ? profile.vat_registered : Boolean(businessVatNumber?.trim()));
    setOwnerDateOfBirth(profile?.owner_date_of_birth ?? '');
    setBasicAmount(profile?.basic_amount ?? '');
    setNotes(profile?.notes ?? '');
  }, [profile, businessVatNumber]);

  const isSoleProp = entityType === 'sole_prop';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const month = isSoleProp ? 2 : Number(yearEndMonth);
    const validation = businessTaxProfileSchema.safeParse({
      entity_type: entityType,
      tax_reference: taxReference,
      financial_year_end_month: month,
      vat_registered: vatRegistered,
      owner_date_of_birth: ownerDateOfBirth,
      basic_amount: basicAmount,
      notes,
    });
    if (!validation.success) {
      toast.error(validation.error.issues[0]?.message ?? 'Please check your input');
      return;
    }
    try {
      await saveProfile({
        entity_type: entityType,
        tax_reference: taxReference.trim() || null,
        financial_year_end_month: month,
        vat_registered: vatRegistered,
        owner_date_of_birth: isSoleProp && ownerDateOfBirth ? ownerDateOfBirth : null,
        basic_amount: basicAmount.trim() || null,
        notes: notes.trim() || undefined,
      });
      toast.success('Tax profile saved');
      navigate('/app/tax/overview');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save the tax profile');
    }
  };

  if (loading) {
    return <p className="text-sm text-slate-500 dark:text-slate-400 py-6">Loading tax profile…</p>;
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm"
    >
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
        How SARS taxes this business. Foro uses this to pick the right tax tables and year of assessment.
      </p>
      {error && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <AppLabeledSelectInput
          label="Taxpayer type"
          value={entityType}
          options={ENTITY_OPTIONS}
          onChange={(e) => setEntityType(e.target.value as BusinessTaxEntityType)}
          disabled={saving}
          required
        />
        <AppLabeledSelectInput
          label="Financial year ends in"
          value={isSoleProp ? '2' : yearEndMonth}
          options={MONTH_OPTIONS}
          onChange={(e) => setYearEndMonth(e.target.value)}
          disabled={saving || isSoleProp}
        />
        <AppInputLabeled
          label="SARS income tax reference"
          value={taxReference}
          onChange={(e) => setTaxReference(e.target.value)}
          disabled={saving}
          placeholder="10 digits"
        />
        <AppInputLabeled
          label="Last assessed taxable income (basic amount)"
          type="number"
          min={0}
          step={0.01}
          value={basicAmount}
          onChange={(e) => setBasicAmount(e.target.value)}
          disabled={saving}
          placeholder="Optional — used for provisional tax"
        />
        {isSoleProp && (
          <AppInputLabeled
            label="Owner's date of birth"
            type="date"
            value={ownerDateOfBirth}
            onChange={(e) => setOwnerDateOfBirth(e.target.value)}
            disabled={saving}
          />
        )}
        <div className="sm:col-span-2">
          <AppLabeledCheckbox
            label="Registered for VAT"
            checked={vatRegistered}
            onChange={setVatRegistered}
            disabled={saving}
            helperText="VAT-registered businesses are taxed on amounts excluding VAT."
          />
        </div>
        {isSoleProp && (
          <p className="sm:col-span-2 text-xs text-slate-500 dark:text-slate-400">
            Sole proprietors are taxed as individuals: the year runs March to February and the owner&apos;s age
            decides the rebates.
          </p>
        )}
        {entityType === 'sbc' && (
          <p className="sm:col-span-2 text-xs text-slate-500 dark:text-slate-400">
            Small business corporations need gross income of R20 million or less and shareholders who are natural
            persons holding no shares in other companies.
          </p>
        )}
        <div className="sm:col-span-2">
          <AppLabeledAreaInput
            label="Notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={saving}
          />
        </div>
      </div>
      <div className="mt-6">
        <button
          type="submit"
          disabled={saving || businessId == null}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save tax profile'}
        </button>
      </div>
    </form>
  );
}

export default TaxProfilePage;
