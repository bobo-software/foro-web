import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { LuCheck } from 'react-icons/lu';
import { ThemeToggleButton } from '@/components/elements/ThemeToggleButton';
import type { CompanyInvitePreview } from '@/services/companyInviteService';

export const PRIMARY_BUTTON =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white no-underline hover:bg-indigo-500 transition shadow-sm shadow-indigo-500/25 disabled:opacity-50 disabled:cursor-not-allowed';
export const SECONDARY_BUTTON =
  'inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 no-underline hover:bg-slate-50 dark:hover:bg-slate-800 transition disabled:opacity-50';

/** Public invite chrome: sticky Foro header, then a centred column. */
export function CompanyInviteShell({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <header className="border-b border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2.5 text-slate-900 dark:text-white no-underline">
            <img src="/favicon.png" alt="" className="h-9 w-9 rounded-lg object-contain" />
            <span className="text-xl font-bold tracking-tight">Foro</span>
          </Link>
          <ThemeToggleButton />
        </div>
      </header>
      <main className={`flex-1 mx-auto w-full px-4 sm:px-6 py-12 sm:py-16 ${wide ? 'max-w-2xl' : 'max-w-md'}`}>
        {children}
      </main>
    </div>
  );
}

/** Indigo eyebrow with the inviting business, above the page title. */
export function InviteHeading({ businessName, title, children }: { businessName?: string; title: string; children?: ReactNode }) {
  return (
    <div>
      {businessName && (
        <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">{businessName}</p>
      )}
      <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{title}</h1>
      {children && <div className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{children}</div>}
    </div>
  );
}

const STEPS = ['Your company', 'Login', 'Done'] as const;

/** 1 Your company · 2 Login (optional, said in the page copy) · 3 Done — `current` is 0-based. */
export function InviteSteps({ current }: { current: 0 | 1 | 2 }) {
  return (
    <ol className="mb-8 flex items-center gap-2 text-xs font-medium" aria-label="Progress">
      {STEPS.map((label, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <li key={label} className="flex flex-1 items-center gap-2" aria-current={active ? 'step' : undefined}>
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                done
                  ? 'bg-indigo-600 text-white'
                  : active
                    ? 'bg-indigo-100 text-indigo-700 ring-2 ring-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300'
                    : 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
              }`}
            >
              {done ? <LuCheck size={14} /> : index + 1}
            </span>
            <span className={`whitespace-nowrap ${active ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>
              {label}
            </span>
            {index < STEPS.length - 1 && <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" aria-hidden />}
          </li>
        );
      })}
    </ol>
  );
}

export function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="mt-6 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 px-3 py-2 text-sm text-red-700 dark:text-red-300">
      {message}
    </div>
  );
}

export function relationshipLabel(type: CompanyInvitePreview['company_type']): string {
  if (type === 'supplier') return 'a supplier';
  if (type === 'both') return 'a customer and supplier';
  return 'a customer';
}

export function invalidCopy(reason: CompanyInvitePreview['reason'] | 'not-found'): { title: string; body: string } {
  switch (reason) {
    case 'expired':
      return { title: 'This invite has expired', body: 'Ask the business that invited you to send a new link.' };
    case 'revoked':
      return { title: 'This invite was withdrawn', body: 'Ask the business that invited you if they still want to link.' };
    case 'accepted':
      return {
        title: 'This invite has already been used',
        body: 'Your companies are already linked. Sign in to see the quotations and invoices they send you.',
      };
    default:
      return { title: 'Link unavailable', body: 'This invite link is invalid. Check that you copied the whole link.' };
  }
}
