import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppDataTable, type AppDataTableColumn } from '@/components/elements/AppDataTable';
import AppLabeledSelectInput from '@/components/forms/AppLabledSelectInput';
import { useBusinessStore } from '@/stores/data/BusinessStore';
import { useReceivedDocumentsStore } from '@/stores/data/ReceivedDocumentsStore';
import type { ReceivedDocumentKind, ReceivedDocumentSummary } from '@/services/receivedDocumentsService';
import { formatCurrency } from '@/utils/currency';
import { formatDate } from '@/pages/admin/companies/companyPage/tabs/types';

type KindFilter = 'all' | ReceivedDocumentKind;

const KIND_OPTIONS: { value: KindFilter; label: string }[] = [
  { value: 'all', label: 'All documents' },
  { value: 'quotation', label: 'Quotations' },
  { value: 'invoice', label: 'Invoices' },
];

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * Read-only quotations and invoices that linked Foro businesses have sent the
 * current business, across every sender. Rows open the per-company received view.
 */
export function ReceivedDocumentsTab() {
  const navigate = useNavigate();
  const businessId = useBusinessStore((s) => s.currentBusiness?.id);
  const documents = useReceivedDocumentsStore((s) => s.documents);
  const loading = useReceivedDocumentsStore((s) => s.loading);
  const error = useReceivedDocumentsStore((s) => s.error);
  const fetchAll = useReceivedDocumentsStore((s) => s.fetchAll);
  const [kind, setKind] = useState<KindFilter>('all');

  useEffect(() => {
    void fetchAll(kind === 'all' ? undefined : kind);
  }, [businessId, kind, fetchAll]);

  const columns = useMemo<AppDataTableColumn<ReceivedDocumentSummary>[]>(
    () => [
      {
        id: 'sender',
        header: 'From',
        cellClassName: 'font-medium text-slate-800 dark:text-slate-100',
        render: (row) => row.senderName,
      },
      {
        id: 'kind',
        header: 'Type',
        cellClassName: 'text-slate-600 dark:text-slate-300',
        render: (row) => capitalize(row.kind),
      },
      {
        id: 'number',
        header: 'Number',
        cellClassName: 'text-slate-700 dark:text-slate-200',
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
        header: 'Due / valid until',
        cellClassName: 'text-slate-600 dark:text-slate-300',
        render: (row) => (row.dueDate ? formatDate(row.dueDate) : '—'),
      },
      {
        id: 'status',
        header: 'Status',
        render: (row) => capitalize(row.status),
      },
      {
        id: 'total',
        header: 'Total',
        align: 'right',
        cellClassName: 'font-medium text-slate-800 dark:text-slate-100',
        render: (row) => formatCurrency(Number(row.total), row.currency),
      },
    ],
    [],
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Quotations and invoices other Foro businesses have sent you. Read-only.
        </p>
        <AppLabeledSelectInput
          label="Type"
          value={kind}
          options={KIND_OPTIONS}
          onChange={(e) => setKind(e.target.value as KindFilter)}
          className="sm:w-48"
        />
      </div>
      <AppDataTable<ReceivedDocumentSummary>
        columns={columns}
        data={documents}
        getRowKey={(row) => `${row.kind}-${row.id}`}
        onRowClick={(row) =>
          navigate(`/app/companies/${row.companyId}/received/${row.kind === 'quotation' ? 'quotations' : 'invoices'}/${row.id}`)
        }
        loading={loading}
        error={error}
        emptyMessage="Nothing received yet. When a linked business sends you a quotation or invoice, it shows up here."
      />
    </div>
  );
}

export default ReceivedDocumentsTab;
