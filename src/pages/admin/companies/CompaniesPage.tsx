import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LuFilter, LuUsers } from 'react-icons/lu';
import { AppDataTable, type AppDataTableColumn } from '@/components/elements/AppDataTable';
import AppLabeledSelectInput from '@/components/forms/AppLabledSelectInput';
import { CompanyLogo } from '@/components/elements/CompanyLogo';
import { useCompanyStore } from '@/stores/data/CompanyStore';
import { useBusinessStore } from '@/stores/data/BusinessStore';
import { useAutoRefresh, useProjectId, useSubscriptionLimits } from '@/hooks';
import type { Company, CompanyType } from '@/types/company';
import { COMPANY_TYPE_LABELS } from '@/types/company';

const companyColumns: AppDataTableColumn<Company>[] = [
  {
    id: 'name',
    header: 'Name',
    cellClassName: 'font-medium text-slate-800 dark:text-slate-100',
    render: (c) => (
      <span className="inline-flex items-center gap-2.5">
        <CompanyLogo path={c.logo_url} name={c.name} size="sm" />
        <span>{c.name}</span>
      </span>
    ),
  },
  {
    id: 'email',
    header: 'Email',
    cellClassName: 'text-slate-600 dark:text-slate-300',
    render: (c) => c.email ?? '—',
  },
  {
    id: 'phone',
    header: 'Phone',
    cellClassName: 'text-slate-600 dark:text-slate-300',
    render: (c) => c.phone ?? '—',
  },
  {
    id: 'tax_id',
    header: 'Tax ID',
    cellClassName: 'text-slate-600 dark:text-slate-300',
    render: (c) => c.tax_id ?? '—',
  },
  {
    id: 'company_type',
    header: 'Type',
    cellClassName: 'text-slate-600 dark:text-slate-300',
    render: (c) => COMPANY_TYPE_LABELS[(c.company_type ?? 'customer') as CompanyType],
  },
];

export function CompaniesPage() {
  const navigate = useNavigate();
  const { companies, loading, error, fetchCompanies } = useCompanyStore();
  const businessId = useBusinessStore((s) => s.currentBusiness?.id);
  const projectId = useProjectId();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | CompanyType>('all');
  const { tier, limits } = useSubscriptionLimits();

  const clientCompanyCount = useMemo(
    () => companies.filter((c) => !c.is_owner_company).length,
    [companies]
  );
  const atCompanyLimit = clientCompanyCount >= limits.companies;

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies, businessId]);

  useAutoRefresh(projectId, 'companies', fetchCompanies);

  const filteredCompanies = useMemo(() => {
    return companies.filter((c) => {
      if (typeFilter !== 'all') {
        const type = c.company_type ?? 'customer';
        if (typeFilter === 'customer' && type !== 'customer' && type !== 'both') return false;
        if (typeFilter === 'supplier' && type !== 'supplier' && type !== 'both') return false;
        if (typeFilter === 'both' && type !== 'both') return false;
      }
      if (!search.trim()) return true;
      const q = search.trim().toLowerCase();
      return (
        c.name?.toLowerCase().includes(q) ||
        c.company_name?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q) ||
        c.tax_id?.toLowerCase().includes(q)
      );
    });
  }, [companies, search, typeFilter]);

  const companiesEmptyMessage = search.trim() ? 'No companies match your search.' : 'No companies yet.';

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Companies</h1>
          <p className="text-slate-500 dark:text-slate-400">Manage your companies</p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-8 text-center text-slate-500 dark:text-slate-400">
          Loading companies…
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Companies</h1>
        <p className="text-slate-500 dark:text-slate-400">Manage your companies</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="w-48 shrink-0">
          <AppLabeledSelectInput
            label="Type"
            labelHidden
            value={typeFilter}
            options={[
              { value: 'all', label: 'All types' },
              { value: 'customer', label: 'Customers' },
              { value: 'supplier', label: 'Suppliers' },
              { value: 'both', label: 'Both' },
            ]}
            onChange={(e) => setTypeFilter(e.target.value as 'all' | CompanyType)}
          />
        </div>
        <div className="relative min-w-0 flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
            <LuFilter size={18} />
          </span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search companies…"
            className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 py-2 pl-9 pr-3 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            aria-label="Search companies"
          />
        </div>
        {atCompanyLimit ? (
          <Link
            to="/app/settings/billing"
            title={`${tier === 'free' ? 'Free' : tier} plan is limited to ${limits.companies} companies — upgrade to add more`}
            className="shrink-0 rounded-lg bg-slate-200 dark:bg-slate-700 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 no-underline hover:bg-slate-300 dark:hover:bg-slate-600"
          >
            Limit reached — upgrade
          </Link>
        ) : (
          <Link
            to="/app/companies/create"
            className="shrink-0 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white no-underline hover:bg-indigo-500"
          >
            + Add company
          </Link>
        )}
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        {clientCompanyCount} of {limits.companies} companies used on your plan.
      </p>

      <AppDataTable<Company>
        title="Companies"
        titleIcon={<LuUsers />}
        columns={companyColumns}
        data={filteredCompanies}
        getRowKey={(row, index) => row.id ?? `company-${index}`}
        onRowClick={(c) => {
          if (c.id != null) navigate(`/app/companies/${c.id}`);
        }}
        error={error}
        emptyMessage={companiesEmptyMessage}
      />
    </div>
  );
}
