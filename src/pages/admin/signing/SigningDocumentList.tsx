import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LuFilter } from 'react-icons/lu';
import { AppDataTable, type AppDataTableColumn } from '@/components/elements/AppDataTable';
import { useSigningDocumentStore } from '../../../stores/data/SigningDocumentStore';
import { useCompanyStore } from '../../../stores/data/CompanyStore';
import type { SigningDocument } from '../../../types/signingDocument';
import { SigningStatusBadge } from './SigningStatusBadge';

/** API datetimes are UTC wall-clock ("YYYY-MM-DD HH:mm:ss.SSS", no zone). */
function formatDate(value: string | null): string {
  return value ? new Date(`${value.replace(' ', 'T')}Z`).toLocaleDateString() : '—';
}

export function SigningDocumentList() {
  const navigate = useNavigate();
  const { documents, loading, error, fetchDocuments } = useSigningDocumentStore();
  const companies = useCompanyStore((s) => s.companies);
  const fetchCompanies = useCompanyStore((s) => s.fetchCompanies);
  const [filterStatus, setFilterStatus] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchDocuments({ status: filterStatus });
  }, [fetchDocuments, filterStatus]);

  useEffect(() => {
    if (companies.length === 0) fetchCompanies();
  }, [companies.length, fetchCompanies]);

  const companyNames = useMemo(() => new Map(companies.map((c) => [c.id, c.name])), [companies]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return documents;
    return documents.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        (companyNames.get(d.company_id) ?? '').toLowerCase().includes(q) ||
        (d.recipient_name ?? '').toLowerCase().includes(q),
    );
  }, [documents, search, companyNames]);

  const columns = useMemo<AppDataTableColumn<SigningDocument>[]>(
    () => [
      {
        id: 'title',
        header: 'Title',
        cellClassName: 'text-slate-800 dark:text-slate-100 font-medium',
        render: (row) => row.title,
      },
      {
        id: 'company',
        header: 'Company',
        cellClassName: 'text-slate-600 dark:text-slate-300',
        render: (row) => companyNames.get(row.company_id) ?? '—',
      },
      {
        id: 'recipient',
        header: 'Recipient',
        cellClassName: 'text-slate-500 dark:text-slate-400',
        render: (row) => row.recipient_name ?? '—',
      },
      {
        id: 'status',
        header: 'Status',
        render: (row) => <SigningStatusBadge status={row.status} />,
      },
      {
        id: 'sent_at',
        header: 'Sent',
        cellClassName: 'text-slate-500 dark:text-slate-400 whitespace-nowrap',
        render: (row) => formatDate(row.sent_at),
      },
      {
        id: 'signed_at',
        header: 'Signed',
        cellClassName: 'text-slate-500 dark:text-slate-400 whitespace-nowrap',
        render: (row) => formatDate(row.recipient_signed_at),
      },
    ],
    [companyNames],
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-indigo-400"
        >
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="sent">Awaiting signature</option>
          <option value="signed">Signed</option>
          <option value="voided">Voided</option>
        </select>
        <div className="relative ml-auto">
          <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
            <LuFilter size={13} />
          </span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            className="rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 py-1 pl-7 pr-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-44"
            aria-label="Search signing documents"
          />
        </div>
      </div>

      {loading ? (
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 text-center text-xs text-slate-500 dark:text-slate-400">
          Loading documents…
        </div>
      ) : (
        <AppDataTable<SigningDocument>
          columns={columns}
          data={filtered}
          getRowKey={(row) => row.id}
          onRowClick={(row) => navigate(`/app/documents/signing/${row.id}`)}
          error={error}
          emptyMessage="No documents yet. Create one to send for signature."
          pageSize={20}
          pageSizeOptions={[10, 20, 50]}
        />
      )}
    </div>
  );
}

export default SigningDocumentList;
