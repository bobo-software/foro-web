import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppDataTable, type AppDataTableColumn } from '@/components/elements/AppDataTable';
import ReceivedDocumentsService from '@/services/receivedDocumentsService';
import { formatCurrency } from '@/utils/currency';
import type { Company } from '@/types/company';
import { formatDate } from './types';

export type ReceivedKind = 'invoices' | 'quotations';

interface ReceivedRow {
  id: number;
  number: string;
  issueDate: string;
  dueOrValid?: string;
  status: string;
  total: number;
  currency?: string;
}

/**
 * Read-only list of what the linked Foro business behind `company` issued to
 * you. Drafts and trashed documents stay hidden on their side.
 */
export function CompanyReceivedTab({ company, kind }: { company: Company; kind: ReceivedKind }) {
  const navigate = useNavigate();
  const [rows, setRows] = useState<ReceivedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const load =
      kind === 'invoices'
        ? ReceivedDocumentsService.listInvoices(company.id!).then((list) =>
            list.map((inv) => ({
              id: inv.id!,
              number: inv.invoice_number,
              issueDate: inv.issue_date,
              dueOrValid: inv.due_date,
              status: inv.status,
              total: inv.total,
              currency: inv.currency,
            })),
          )
        : ReceivedDocumentsService.listQuotations(company.id!).then((list) =>
            list.map((q) => ({
              id: q.id!,
              number: q.quotation_number,
              issueDate: q.issue_date,
              dueOrValid: q.valid_until,
              status: q.status,
              total: q.total,
              currency: q.currency,
            })),
          );
    load
      .then((data) => {
        if (!cancelled) setRows(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load documents');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [company.id, kind]);

  const columns = useMemo<AppDataTableColumn<ReceivedRow>[]>(
    () => [
      {
        id: 'number',
        header: kind === 'invoices' ? 'Invoice' : 'Quotation',
        cellClassName: 'font-medium text-slate-800 dark:text-slate-100',
        render: (row) => row.number || '—',
      },
      {
        id: 'issue_date',
        header: 'Date',
        cellClassName: 'text-slate-600 dark:text-slate-300',
        render: (row) => (row.issueDate ? formatDate(row.issueDate) : '—'),
      },
      {
        id: 'due',
        header: kind === 'invoices' ? 'Due' : 'Valid until',
        cellClassName: 'text-slate-600 dark:text-slate-300',
        render: (row) => (row.dueOrValid ? formatDate(row.dueOrValid) : '—'),
      },
      {
        id: 'status',
        header: 'Status',
        render: (row) => row.status.charAt(0).toUpperCase() + row.status.slice(1),
      },
      {
        id: 'total',
        header: 'Total',
        align: 'right',
        cellClassName: 'font-medium text-slate-800 dark:text-slate-100',
        render: (row) => formatCurrency(Number(row.total), row.currency),
      },
    ],
    [kind],
  );

  const noun = kind === 'invoices' ? 'invoices' : 'quotations';

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
          Received {noun} ({rows.length})
        </h2>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
          {kind === 'invoices' ? 'Invoices and credit notes' : 'Quotations'} {company.name} has sent you on Foro.
          Read-only.
        </p>
      </div>
      <AppDataTable<ReceivedRow>
        embedded
        columns={columns}
        data={rows}
        getRowKey={(row) => row.id}
        onRowClick={(row) => navigate(`/app/companies/${company.id}/received/${kind}/${row.id}`)}
        loading={loading}
        error={error}
        emptyMessage={`${company.name} hasn't sent you any ${noun} yet.`}
      />
    </div>
  );
}
