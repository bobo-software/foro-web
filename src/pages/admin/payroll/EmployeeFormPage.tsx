import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import AppInputLabeled from '@/components/forms/AppLabledInput';
import AppLabeledPhoneInput from '@/components/forms/AppLabeledPhoneInput';
import AppLabeledSelectInput from '@/components/forms/AppLabledSelectInput';
import AppLabeledAreaInput from '@/components/forms/AppLabledAreaInput';
import AppLabeledCheckbox from '@/components/forms/AppLabeledCheckbox';
import { CompanyBankingFields } from '@/pages/admin/companies/CompanyBankingFields';
import EmployeeService from '@/services/employeeService';
import BankingDetailsService from '@/services/bankingDetailsService';
import { useBusinessStore } from '@/stores/data/BusinessStore';
import { useEmployeeStore } from '@/stores/data/EmployeeStore';
import { useTeamStore } from '@/stores/data/TeamStore';
import { bankingDetailsSchema, employeeSchema } from '@/validation/schemas';
import type { CreateEmployeeDto, EmployeeEmploymentType, EmployeeStatus } from '@/types/employee';
import {
  EMPLOYEE_EMPLOYMENT_TYPE_OPTIONS,
  EMPLOYEE_PAY_FREQUENCY_OPTIONS,
  EMPLOYEE_STATUS_OPTIONS,
} from '@/types/employee';
import type { BankingDetails, CreateBankingDetailsDto } from '@/types/bankingDetails';
import { localDateISO } from '@/utils/localDateISO';

type FormState = Omit<CreateEmployeeDto, 'business_id'>;

const initial = (): FormState => ({
  first_name: '',
  last_name: '',
  known_as: '',
  id_number: '',
  passport_number: '',
  nationality: 'South Africa',
  date_of_birth: '',
  tax_number: '',
  email: '',
  phone: '',
  address: '',
  job_title: '',
  employment_type: 'permanent',
  start_date: localDateISO(),
  end_date: '',
  pay_frequency: 'monthly',
  status: 'active',
  uif_eligible: true,
  paye_registered: true,
  medical_aid_members: 0,
  user_id: null,
  notes: '',
});

const emptyBanking: CreateBankingDetailsDto = {
  bank_name: '',
  account_number: '',
  account_holder: '',
  account_type: 'cheque',
  branch_code: '',
  swift_code: '',
};

export function EmployeeFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);
  const businessId = useBusinessStore((s) => s.currentBusiness?.id);
  const fetchEmployees = useEmployeeStore((s) => s.fetchEmployees);
  const members = useTeamStore((s) => s.members);
  const fetchMembers = useTeamStore((s) => s.fetchMembers);
  const [form, setForm] = useState<FormState>(initial);
  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [includeBankingDetails, setIncludeBankingDetails] = useState(false);
  const [bankingForm, setBankingForm] = useState<CreateBankingDetailsDto>(emptyBanking);
  const [existingBanking, setExistingBanking] = useState<BankingDetails | null>(null);

  useEffect(() => {
    if (businessId != null) void fetchMembers(businessId);
  }, [businessId, fetchMembers]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([
      EmployeeService.findById(Number(id)),
      BankingDetailsService.findByEmployeeId(Number(id)),
    ])
      .then(([data, bankingRows]) => {
        if (cancelled || !data) return;
        setForm({
          first_name: data.first_name,
          last_name: data.last_name,
          known_as: data.known_as ?? '',
          id_number: data.id_number ?? '',
          passport_number: data.passport_number ?? '',
          nationality: data.nationality ?? '',
          date_of_birth: data.date_of_birth ?? '',
          tax_number: data.tax_number ?? '',
          email: data.email ?? '',
          phone: data.phone ?? '',
          address: data.address ?? '',
          job_title: data.job_title ?? '',
          employment_type: data.employment_type,
          start_date: data.start_date,
          end_date: data.end_date ?? '',
          pay_frequency: data.pay_frequency,
          status: data.status,
          uif_eligible: data.uif_eligible,
          paye_registered: data.paye_registered,
          medical_aid_members: data.medical_aid_members,
          user_id: data.user_id ?? null,
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
      .catch(() => toast.error('Failed to load employee'))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const memberOptions = useMemo(
    () => [
      { value: '', label: 'Not linked' },
      ...members
        .filter((m) => m.status === 'active')
        .map((m) => ({
          value: String(m.user_id),
          label: `User #${m.user_id} (${m.role_key})`,
        })),
    ],
    [members],
  );

  const saveBanking = async (employeeId: number) => {
    if (!includeBankingDetails) return;
    const bankValidation = bankingDetailsSchema.safeParse(bankingForm);
    if (!bankValidation.success) {
      throw new Error(bankValidation.error.issues[0]?.message ?? 'Banking details are invalid');
    }
    const bankingPayload: CreateBankingDetailsDto = {
      ...bankingForm,
      employee_id: employeeId,
      label: bankingForm.label?.trim() || 'Salary account',
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

  const handleEmploymentTypeChange = (value: EmployeeEmploymentType) => {
    setForm((prev) => ({
      ...prev,
      employment_type: value,
      uif_eligible: value !== 'contractor',
      paye_registered: value !== 'contractor',
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = employeeSchema.safeParse({
      ...form,
      id_number: form.id_number?.trim() ?? '',
      passport_number: form.passport_number?.trim() ?? '',
      end_date: form.end_date || '',
    });
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
      const payload: Omit<CreateEmployeeDto, 'business_id'> = {
        ...form,
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        known_as: form.known_as?.trim() || null,
        id_number: form.id_number?.trim() || null,
        passport_number: form.passport_number?.trim() || null,
        nationality: form.nationality?.trim() || null,
        date_of_birth: form.date_of_birth || null,
        tax_number: form.tax_number?.trim() || null,
        email: form.email?.trim() || undefined,
        phone: form.phone?.trim() || undefined,
        address: form.address?.trim() || undefined,
        job_title: form.job_title?.trim() || null,
        end_date: form.status === 'terminated' ? form.end_date || null : form.end_date || null,
        user_id: form.user_id ?? null,
        notes: form.notes?.trim() || undefined,
      };
      if (isEditMode) {
        await EmployeeService.update(Number(id), payload);
        await saveBanking(Number(id));
        await fetchEmployees();
        toast.success('Employee updated');
        navigate(`/app/payroll/employees/${id}`);
      } else {
        const created = await EmployeeService.create({ ...payload, business_id: businessId! });
        if (created.id) await saveBanking(created.id);
        await fetchEmployees();
        toast.success('Employee created');
        navigate(`/app/payroll/employees/${created.id}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Failed to ${isEditMode ? 'update' : 'create'} employee`);
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
          to={isEditMode ? `/app/payroll/employees/${id}` : '/app/payroll/employees'}
          className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 no-underline"
        >
          ← {isEditMode ? 'Back to employee' : 'Back to employees'}
        </Link>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
          {isEditMode ? 'Edit employee' : 'Add employee'}
        </h1>
      </div>
      <form
        onSubmit={handleSubmit}
        className="mt-6 flex min-h-0 flex-1 flex-col rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm lg:p-8"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <AppInputLabeled
            label="First name"
            required
            value={form.first_name}
            onChange={(e) => update('first_name', e.target.value)}
            disabled={saving}
          />
          <AppInputLabeled
            label="Last name"
            required
            value={form.last_name}
            onChange={(e) => update('last_name', e.target.value)}
            disabled={saving}
          />
          <AppInputLabeled
            label="Known as"
            value={form.known_as ?? ''}
            onChange={(e) => update('known_as', e.target.value)}
            disabled={saving}
          />
          <AppInputLabeled
            label="Job title"
            value={form.job_title ?? ''}
            onChange={(e) => update('job_title', e.target.value)}
            disabled={saving}
          />
          <AppInputLabeled
            label="ID number"
            value={form.id_number ?? ''}
            onChange={(e) => update('id_number', e.target.value)}
            disabled={saving}
            placeholder="13-digit SA ID"
          />
          <AppInputLabeled
            label="Passport number"
            value={form.passport_number ?? ''}
            onChange={(e) => update('passport_number', e.target.value)}
            disabled={saving}
          />
          <AppInputLabeled
            label="Nationality"
            value={form.nationality ?? ''}
            onChange={(e) => update('nationality', e.target.value)}
            disabled={saving}
          />
          <AppInputLabeled
            label="Date of birth"
            type="date"
            value={form.date_of_birth ?? ''}
            onChange={(e) => update('date_of_birth', e.target.value)}
            disabled={saving}
          />
          <AppInputLabeled
            label="Tax number"
            value={form.tax_number ?? ''}
            onChange={(e) => update('tax_number', e.target.value)}
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
          <AppLabeledSelectInput
            label="Employment type *"
            value={form.employment_type}
            onChange={(e) => handleEmploymentTypeChange(e.target.value as EmployeeEmploymentType)}
            options={EMPLOYEE_EMPLOYMENT_TYPE_OPTIONS}
            disabled={saving}
          />
          <AppLabeledSelectInput
            label="Pay frequency *"
            value={form.pay_frequency}
            onChange={(e) => update('pay_frequency', e.target.value as FormState['pay_frequency'])}
            options={EMPLOYEE_PAY_FREQUENCY_OPTIONS}
            disabled={saving}
          />
          <AppInputLabeled
            label="Start date"
            type="date"
            required
            value={form.start_date}
            onChange={(e) => update('start_date', e.target.value)}
            disabled={saving}
          />
          <AppLabeledSelectInput
            label="Status *"
            value={form.status}
            onChange={(e) => update('status', e.target.value as EmployeeStatus)}
            options={EMPLOYEE_STATUS_OPTIONS}
            disabled={saving}
          />
          {form.status === 'terminated' && (
            <AppInputLabeled
              label="End date"
              type="date"
              required
              value={form.end_date ?? ''}
              onChange={(e) => update('end_date', e.target.value)}
              disabled={saving}
            />
          )}
          <AppInputLabeled
            label="Medical aid members"
            type="number"
            min={0}
            max={20}
            value={String(form.medical_aid_members)}
            onChange={(e) => update('medical_aid_members', Number(e.target.value) || 0)}
            disabled={saving}
          />
          <AppLabeledSelectInput
            label="Link Foro user"
            value={form.user_id == null ? '' : String(form.user_id)}
            onChange={(e) => update('user_id', e.target.value ? Number(e.target.value) : null)}
            options={memberOptions}
            disabled={saving}
          />
          <AppLabeledCheckbox
            label="UIF eligible"
            checked={form.uif_eligible}
            onChange={(checked) => update('uif_eligible', checked)}
            disabled={saving}
          />
          <AppLabeledCheckbox
            label="Withhold PAYE"
            checked={form.paye_registered}
            onChange={(checked) => update('paye_registered', checked)}
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
            {saving ? 'Saving…' : isEditMode ? 'Save changes' : 'Add employee'}
          </button>
          <Link
            to={isEditMode ? `/app/payroll/employees/${id}` : '/app/payroll/employees'}
            className="rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 no-underline hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

export default EmployeeFormPage;
