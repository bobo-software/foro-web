import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AppPageHeader } from '@/components/ComponentsIndex';
import DeleteConfirmationModal from '@/components/modals/DeleteConfirmationModal';
import EmployeeService from '@/services/employeeService';
import BankingDetailsService from '@/services/bankingDetailsService';
import { useEmployeeStore } from '@/stores/data/EmployeeStore';
import type { BankingDetails } from '@/types/bankingDetails';
import type { Employee } from '@/types/employee';
import {
  EMPLOYEE_EMPLOYMENT_TYPE_OPTIONS,
  EMPLOYEE_PAY_FREQUENCY_OPTIONS,
  EMPLOYEE_STATUS_OPTIONS,
  employeeDisplayName,
} from '@/types/employee';
import { EmployeePayPackageTab } from './EmployeePayPackageTab';
import { formatCalendarDate } from '@/utils/recurrence';

function Field({ label, value }: { label: string; value?: string | number | null }) {
  if (value == null || value === '') return null;
  return (
    <div>
      <dt className="text-xs text-slate-400 dark:text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap">{value}</dd>
    </div>
  );
}

export function EmployeeDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const removeEmployee = useEmployeeStore((s) => s.removeEmployee);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [banking, setBanking] = useState<BankingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState<'summary' | 'package'>('summary');

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([
      EmployeeService.findById(Number(id)),
      BankingDetailsService.findByEmployeeId(Number(id)),
    ])
      .then(([data, bankingRows]) => {
        if (cancelled) return;
        setEmployee(data);
        setBanking(bankingRows[0] ?? null);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load employee');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleDelete = async () => {
    if (employee?.id == null) return;
    setDeleting(true);
    try {
      await removeEmployee(employee.id);
      toast.success('Employee moved to trash');
      navigate('/app/payroll/employees');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete employee');
      setDeleting(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-slate-500 dark:text-slate-400 py-6">Loading…</p>;
  }
  if (error || !employee) {
    return (
      <div className="space-y-4">
        <p className="text-red-600 dark:text-red-400">{error ?? 'Employee not found.'}</p>
        <Link to="/app/payroll/employees" className="text-indigo-600 dark:text-indigo-400 hover:underline no-underline">
          Back to employees
        </Link>
      </div>
    );
  }

  const typeLabel =
    EMPLOYEE_EMPLOYMENT_TYPE_OPTIONS.find((o) => o.value === employee.employment_type)?.label ??
    employee.employment_type;
  const statusLabel =
    EMPLOYEE_STATUS_OPTIONS.find((o) => o.value === employee.status)?.label ?? employee.status;
  const frequencyLabel =
    EMPLOYEE_PAY_FREQUENCY_OPTIONS.find((o) => o.value === employee.pay_frequency)?.label ??
    employee.pay_frequency;

  return (
    <div className="space-y-3">
      <AppPageHeader
        title={employeeDisplayName(employee)}
        subtitle={`${typeLabel} · ${statusLabel}`}
        showBackButton
        onBackClick={() => navigate('/app/payroll/employees')}
        showButton
        buttonText="Edit"
        onButtonClick={() => navigate(`/app/payroll/employees/${employee.id}/edit`)}
      />

      <div className="flex items-end border-b border-slate-200 dark:border-slate-700">
        <nav className="flex gap-0.5" aria-label="Employee sections">
          {(
            [
              { id: 'summary' as const, label: 'Summary' },
              { id: 'package' as const, label: 'Pay package' },
            ]
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2 text-xs font-medium rounded-t-md border-b-2 -mb-px transition-colors ${
                activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 bg-white dark:bg-slate-800'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'package' ? (
        <EmployeePayPackageTab employee={employee} />
      ) : (
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm divide-y divide-slate-100 dark:divide-slate-700">
        <div className="p-4">
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">
            Identity
          </p>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
            <Field label="First name" value={employee.first_name} />
            <Field label="Last name" value={employee.last_name} />
            <Field label="Known as" value={employee.known_as} />
            <Field label="ID number" value={employee.id_number} />
            <Field label="Passport" value={employee.passport_number} />
            <Field label="Nationality" value={employee.nationality} />
            <Field label="Date of birth" value={employee.date_of_birth ? formatCalendarDate(employee.date_of_birth) : null} />
            <Field label="Tax number" value={employee.tax_number} />
          </dl>
        </div>
        <div className="p-4">
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">
            Employment
          </p>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
            <Field label="Job title" value={employee.job_title} />
            <Field label="Type" value={typeLabel} />
            <Field label="Pay frequency" value={frequencyLabel} />
            <Field label="Start date" value={formatCalendarDate(employee.start_date)} />
            <Field label="End date" value={employee.end_date ? formatCalendarDate(employee.end_date) : null} />
            <Field label="UIF" value={employee.uif_eligible ? 'Eligible' : 'Not eligible'} />
            <Field label="PAYE" value={employee.paye_registered ? 'Withhold' : 'Do not withhold'} />
            <Field label="Medical aid members" value={employee.medical_aid_members} />
          </dl>
        </div>
        <div className="p-4">
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">
            Contact
          </p>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
            <Field label="Email" value={employee.email} />
            <Field label="Phone" value={employee.phone} />
            <Field label="Address" value={employee.address} />
            {!employee.email && !employee.phone && !employee.address && (
              <div className="col-span-4">
                <span className="text-sm text-slate-400 dark:text-slate-500">No contact details recorded.</span>
              </div>
            )}
          </dl>
        </div>
        <div className="p-4">
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">
            Banking
          </p>
          {banking ? (
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
              <Field label="Bank" value={banking.bank_name} />
              <Field label="Account holder" value={banking.account_holder} />
              <Field label="Account number" value={banking.account_number} />
              <Field label="Branch code" value={banking.branch_code} />
            </dl>
          ) : (
            <p className="text-sm text-slate-400 dark:text-slate-500">No salary account recorded.</p>
          )}
        </div>
        {employee.notes && (
          <div className="p-4">
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">
              Notes
            </p>
            <p className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap">{employee.notes}</p>
          </div>
        )}
      </div>
      )}

      <button
        type="button"
        onClick={() => setConfirmDelete(true)}
        className="text-sm text-red-600 dark:text-red-400 hover:underline"
      >
        Delete employee
      </button>

      <DeleteConfirmationModal
        isOpen={confirmDelete}
        title="Delete employee"
        message={`Move ${employeeDisplayName(employee)} to trash?`}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => void handleDelete()}
        isLoading={deleting}
      />
    </div>
  );
}

export default EmployeeDetailPage;
