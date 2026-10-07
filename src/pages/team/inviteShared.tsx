import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { InvitePreview } from '@/types/team';

export const ROLE_INFO: Record<string, { label: string; description: string }> = {
  owner: { label: 'Owner', description: 'Full control, including billing and team management.' },
  admin: { label: 'Admin', description: 'Manage the team, settings and all business records.' },
  member: { label: 'Member', description: 'Create and edit day-to-day records like quotes and invoices.' },
  viewer: { label: 'Viewer', description: 'Read-only access to business records.' },
};

export function roleInfo(roleKey: string) {
  return (
    ROLE_INFO[roleKey] ?? {
      label: roleKey.charAt(0).toUpperCase() + roleKey.slice(1),
      description: 'Access as configured by the business owner.',
    }
  );
}

/** foro-api returns MySQL datetimes like `2026-10-13 11:36:10.668000`, which Safari can't parse. */
export function parseInviteDate(value: string): Date {
  const normalized = value.includes('T') ? value : value.replace(' ', 'T');
  const date = new Date(normalized.replace(/(\.\d{3})\d+/, '$1'));
  return Number.isNaN(date.getTime()) ? new Date(value) : date;
}

export function formatRelativeExpiry(date: Date): string {
  const diffMs = date.getTime() - Date.now();
  if (diffMs <= 0) return 'Expired';
  const hours = Math.round(diffMs / 3_600_000);
  if (hours < 1) return 'Expires in less than an hour';
  if (hours < 24) return `Expires in ${hours} hour${hours === 1 ? '' : 's'}`;
  const days = Math.round(hours / 24);
  return `Expires in ${days} day${days === 1 ? '' : 's'}`;
}

export type InvalidReason = 'expired' | 'revoked' | 'accepted' | 'unavailable';

export function invalidReason(preview: InvitePreview): InvalidReason | null {
  if (preview.valid) return null;
  if (preview.status === 'accepted') return 'accepted';
  if (preview.status === 'revoked') return 'revoked';
  if (preview.status === 'expired' || parseInviteDate(preview.expires_at).getTime() <= Date.now()) return 'expired';
  return 'unavailable';
}

export function InviteShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 px-4 py-10">
      <Link
        to="/"
        className="mb-8 inline-flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-white no-underline"
      >
        <img src="/favicon.png" alt="" className="h-10 w-10 rounded-lg object-contain" />
        Foro
      </Link>
      <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
        {children}
      </div>
    </div>
  );
}

export function BusinessAvatar({ name }: { name: string }) {
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join('') || '?';
  return (
    <div
      aria-hidden
      className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 text-lg font-semibold text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300"
    >
      {initials}
    </div>
  );
}

export const primaryButtonClass =
  'inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white no-underline transition-colors hover:bg-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-800 disabled:cursor-not-allowed disabled:opacity-50';

export const secondaryButtonClass =
  'inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 no-underline transition-colors hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50';

const TONES = {
  rose: 'bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300',
  amber: 'bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300',
  indigo: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300',
} as const;

export function StatusPanel({
  icon,
  tone,
  title,
  body,
  children,
}: {
  icon: ReactNode;
  tone: keyof typeof TONES;
  title: string;
  body: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="px-6 py-8 text-center sm:px-8">
      <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${TONES[tone]}`}>{icon}</div>
      <h1 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h1>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{body}</p>
      {children && <div className="mt-6">{children}</div>}
    </div>
  );
}
