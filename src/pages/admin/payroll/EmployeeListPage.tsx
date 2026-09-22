import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LuUsers } from 'react-icons/lu';
import { AppDataTable, type AppDataTableColumn } from '@/components/elements/AppDataTable';
import AppInputLabeled from '@/components/forms/AppLabledInput';
import AppLabeledSelectInput from '@/components/forms/AppLabledSelectInput';
import { useEmployeeStore } from '@/stores/data/EmployeeStore';
import { useBusinessStore } from '@/stores/data/BusinessStore';
import type { Employee, EmployeeEmploymentType, EmployeeStatus } from '@/types/employee';
import {
  EMPLOYEE_EMPLOYMENT_TYPE_OPTIONS,
  EMPLOYEE_STATUS_OPTIONS,
  employeeDisplayName,
} from '@/types/employee';

const columns: AppDataTableColumn<Employee>[] = [
  {
    id: 'name',
    header: 'Name',
    cellClassName: 'font-medium text-slate-800 dark:text-slate-100',
    render: (row) => employeeDisplayName(row),
  },
  {
    id: 'job_title',
    header: 'Job title',
    cellClassName: 'text-slate-600 dark:text-slate-300',
    render: (row) => row.job_title ?? '—',
  },
  {
    id: 'employment_type',
    header: 'Type',
    cellClassName: 'text-slate-600 dark:text-slate-300',
    render: (row) =>
      EMPLOYEE_EMPLOYMENT_TYPE_OPTIONS.find((o) => o.value === row.employment_type)?.label ?? row.employment_type,
  },
  {
    id: 'status',
    header: 'Status',
    cellClassName: 'text-slate-600 dark:text-slate-300',
    render: (row) =>
      EMPLOYEE_STATUS_OPTIONS.find((o) => o.value === row.status)?.label ?? row.status,
  },
  {
    id: 'email',
    header: 'Email',
    cellClassName: 'text-slate-600 dark:text-slate-300',
    render: (row) => row.email ?? '—',
  },
  {
    id: 'phone',
    header: 'Phone',
    cellClassName: 'text-slate-600 dark:text-slate-300',
    render: (row) => row.phone ?? '—',
  },
];

export function EmployeeListPage() {
  const navigate = useNavigate();
  const { employees, loading, error, fetchEmployees } = useEmployeeStore();
  const businessId = useBusinessStore((s) => s.currentBusiness?.id);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<EmployeeStatus | ''>('active');
  const [employmentType, setEmploymentType] = useState<EmployeeEmploymentType | ''>('');

  useEffect(() => {
    void fetchEmployees();
  }, [fetchEmployees, businessId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return employees.filter((row) => {
      if (status && row.status !== status) return false;
      if (employmentType && row.employment_type !== employmentType) return false;
      if (!q) return true;
      const haystack = [
        row.first_name,
        row.last_name,
        row.known_as,
        row.email,
        row.phone,
        row.job_title,
        row.id_number,
        row.tax_number,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [employees, search, status, employmentType]);

  const emptyMessage =
    employees.length === 0
      ? 'No employees yet. Add someone you pay, even if they never log into Foro.'
      : 'No employees match your filters.';

  if (loading) {
    return <p className="text-sm text-slate-500 dark:text-slate-400 py-6">Loading employees…</p>;
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <AppInputLabeled
          label="Search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search employees…"
        />
        <AppLabeledSelectInput
          label="Status"
          value={status}
          onChange={(e) => setStatus((e.target.value || '') as EmployeeStatus | '')}
          options={[{ value: '', label: 'All statuses' }, ...EMPLOYEE_STATUS_OPTIONS]}
        />
        <AppLabeledSelectInput
          label="Employment type"
          value={employmentType}
          onChange={(e) => setEmploymentType((e.target.value || '') as EmployeeEmploymentType | '')}
          options={[{ value: '', label: 'All types' }, ...EMPLOYEE_EMPLOYMENT_TYPE_OPTIONS]}
        />
      </div>

      <AppDataTable<Employee>
        title="Employees"
        titleIcon={<LuUsers />}
        columns={columns}
        data={filtered}
        getRowKey={(row, index) => row.id ?? `employee-${index}`}
        onRowClick={(row) => {
          if (row.id != null) navigate(`/app/payroll/employees/${row.id}`);
        }}
        error={error}
        emptyMessage={emptyMessage}
      />
    </div>
  );
}

export default EmployeeListPage;
