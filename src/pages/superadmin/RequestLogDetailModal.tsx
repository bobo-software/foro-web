import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  LuBuilding2,
  LuCalendar,
  LuCheck,
  LuCircleAlert,
  LuClock,
  LuCopy,
  LuGlobe,
  LuUser,
} from 'react-icons/lu';
import { AppModal } from '@/components/modals/AppModal';
import { useRequestLogStore } from '@/stores/data/RequestLogStore';

interface RequestLogDetailModalProps {
  id: number;
  onClose: () => void;
}

function statusHeaderClass(status: number): string {
  if (status >= 500) return 'bg-red-600 text-white';
  if (status >= 400) return 'bg-amber-500 text-white';
  if (status >= 300) return 'bg-slate-600 text-white';
  return 'bg-green-600 text-white';
}

function formatTimestamp(raw: string): string {
  return new Date(`${raw.replace(' ', 'T')}Z`).toLocaleString();
}

function prettyBody(raw: string | null): { text: string; truncated: boolean } {
  if (!raw) return { text: '', truncated: false };
  const truncated = raw.endsWith('...[truncated]');
  const candidate = truncated ? raw.slice(0, -'...[truncated]'.length) : raw;
  try {
    return { text: JSON.stringify(JSON.parse(candidate), null, 2), truncated };
  } catch {
    return { text: raw, truncated };
  }
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </div>
      <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 break-all">
        {value}
      </div>
    </div>
  );
}

function MetaTile({
  label,
  value,
  icon,
  mono = false,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/40 px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        <span className="text-slate-400 dark:text-slate-500">{icon}</span>
        {label}
      </div>
      <div className={`mt-1 text-sm text-slate-800 dark:text-slate-100 truncate ${mono ? 'font-mono text-xs' : 'font-medium'}`}>
        {value}
      </div>
    </div>
  );
}

function CodeBlock({ title, raw }: { title: string; raw: string | null }) {
  const [copied, setCopied] = useState(false);
  const { text, truncated } = prettyBody(raw);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Could not copy');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <h3 className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{title}</h3>
        {text && (
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          >
            {copied ? <LuCheck className="w-3.5 h-3.5" /> : <LuCopy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        )}
      </div>
      {text ? (
        <div>
          <pre className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 text-slate-800 dark:text-slate-100 text-xs p-3 overflow-auto max-h-64 font-mono leading-relaxed">
            {text}
          </pre>
          {truncated && (
            <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">Truncated for storage — payload was larger than the logged limit.</p>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 px-3 py-2 text-xs text-slate-400 dark:text-slate-500 italic">
          No body
        </div>
      )}
    </div>
  );
}

export function RequestLogDetailModal({ id, onClose }: RequestLogDetailModalProps) {
  const detail = useRequestLogStore((s) => s.detail);
  const loading = useRequestLogStore((s) => s.detailLoading);
  const error = useRequestLogStore((s) => s.detailError);
  const fetchDetail = useRequestLogStore((s) => s.fetchDetail);
  const clearDetail = useRequestLogStore((s) => s.clearDetail);

  useEffect(() => {
    void fetchDetail(id);
    return () => {
      clearDetail();
    };
  }, [id, fetchDetail, clearDetail]);

  const ready = detail != null && detail.id === id;

  return (
    <AppModal
      isOpen
      onClose={onClose}
      title={ready ? `${detail.method} ${detail.statusCode}` : 'Request details'}
      subtitle={ready ? String(detail.id) : undefined}
      titleIcon={
        ready ? (
          detail.statusCode >= 400 ? <LuCircleAlert className="w-4 h-4" /> : <LuCheck className="w-4 h-4" />
        ) : undefined
      }
      headerClassName={ready ? statusHeaderClass(detail.statusCode) : undefined}
      size="2xl"
      footer={null}
    >
      {loading && <p className="text-sm text-slate-500 dark:text-slate-400 py-8 text-center">Loading…</p>}
      {error && <p className="text-sm text-red-600 dark:text-red-400 py-8 text-center">{error}</p>}

      {ready && (
        <div className="space-y-5">
          <Field label="URL" value={detail.url} />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <MetaTile label="Duration" value={`${detail.durationMs} ms`} icon={<LuClock className="w-3.5 h-3.5" />} />
            <MetaTile label="Timestamp" value={formatTimestamp(detail.createdAt)} icon={<LuCalendar className="w-3.5 h-3.5" />} />
            <MetaTile label="IP address" value={detail.ipAddress ?? '—'} icon={<LuGlobe className="w-3.5 h-3.5" />} mono />
            <MetaTile
              label="User"
              value={detail.userEmail ?? (detail.userId ? `#${detail.userId}` : 'Anonymous')}
              icon={<LuUser className="w-3.5 h-3.5" />}
            />
            <MetaTile
              label="Company"
              value={detail.companyId != null ? String(detail.companyId) : '—'}
              icon={<LuBuilding2 className="w-3.5 h-3.5" />}
            />
          </div>

          <CodeBlock title="Request payload" raw={detail.requestBody} />
          <CodeBlock title="Response data" raw={detail.responseBody} />
          <Field label="User agent" value={detail.userAgent ?? '—'} />
        </div>
      )}
    </AppModal>
  );
}

export default RequestLogDetailModal;
