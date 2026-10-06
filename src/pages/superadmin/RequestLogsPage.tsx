import { useEffect, useMemo, useState } from 'react';
import { AppDataTable, type AppDataTableColumn } from '@/components/elements/AppDataTable';
import {
  TableCount,
  TableFilterSelect,
  TableSearchInput,
  TableToolbarEnd,
  TableToolbarStart,
  matchesSearch,
} from '@/components/elements/AppTableToolbar';
import { useRequestLogStore } from '@/stores/data/RequestLogStore';
import type { RequestLogRow } from '@/services/requestLogService';
import { RequestLogDetailModal } from './RequestLogDetailModal';

const FETCH_LIMIT = 200;

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: '2xx', label: 'Success' },
  { value: '3xx', label: 'Redirect' },
  { value: '4xx', label: 'Client error' },
  { value: '5xx', label: 'Server error' },
] as const;

const columns: AppDataTableColumn<RequestLogRow>[] = [
  {
    id: 'createdAt',
    header: 'Time',
    render: (row) => new Date(`${row.createdAt.replace(' ', 'T')}Z`).toLocaleString(),
  },
  { id: 'method', header: 'Method', render: (row) => row.method },
  { id: 'url', header: 'URL', render: (row) => row.url },
  {
    id: 'statusCode',
    header: 'Status',
    align: 'right',
    render: (row) => (
      <span className={row.statusCode >= 400 ? 'text-red-600 dark:text-red-400 font-medium' : ''}>
        {row.statusCode}
      </span>
    ),
  },
  { id: 'durationMs', header: 'Duration', align: 'right', render: (row) => `${row.durationMs} ms` },
  { id: 'companyId', header: 'Company', render: (row) => row.companyId ?? '—' },
  {
    id: 'user',
    header: 'User',
    render: (row) => row.userEmail ?? (row.userId ? `#${row.userId}` : '—'),
  },
];

function statusGroup(code: number): string {
  if (code >= 500) return '5xx';
  if (code >= 400) return '4xx';
  if (code >= 300) return '3xx';
  return '2xx';
}

export function RequestLogsPage() {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const rows = useRequestLogStore((s) => s.rows);
  const loading = useRequestLogStore((s) => s.loading);
  const error = useRequestLogStore((s) => s.error);
  const fetchLogs = useRequestLogStore((s) => s.fetchLogs);

  useEffect(() => {
    void fetchLogs({ limit: FETCH_LIMIT });
  }, [fetchLogs]);

  const filteredRows = useMemo(
    () =>
      rows.filter(
        (row) =>
          (filterStatus === 'all' || statusGroup(row.statusCode) === filterStatus) &&
          matchesSearch(search, [
            row.method,
            row.url,
            String(row.statusCode),
            row.userEmail,
            row.userId != null ? String(row.userId) : undefined,
            row.companyId != null ? String(row.companyId) : undefined,
          ]),
      ),
    [rows, filterStatus, search],
  );

  return (
    <>
      <AppDataTable
        toolbar={
          <>
            <TableToolbarStart>
              <TableSearchInput
                value={search}
                onChange={setSearch}
                placeholder="Search method, URL, user…"
                ariaLabel="Search request logs"
              />
              <TableFilterSelect
                value={filterStatus}
                onChange={setFilterStatus}
                options={STATUS_FILTER_OPTIONS}
                ariaLabel="Filter by status"
              />
            </TableToolbarStart>
            <TableToolbarEnd>
              <TableCount count={filteredRows.length} noun="request" loading={loading} />
            </TableToolbarEnd>
          </>
        }
        columns={columns}
        data={filteredRows}
        getRowKey={(row) => row.id}
        onRowClick={(row) => setSelectedId(row.id)}
        loading={loading}
        error={error}
        emptyMessage={
          search.trim() || filterStatus !== 'all'
            ? 'No requests match your filters.'
            : 'No requests yet.'
        }
        pageSize={20}
        pageSizeOptions={[10, 20, 50]}
      />

      {selectedId != null && (
        <RequestLogDetailModal id={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </>
  );
}

export default RequestLogsPage;
