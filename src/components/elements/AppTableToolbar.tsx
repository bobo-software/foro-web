import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { LuPlus, LuSearch } from 'react-icons/lu';

/**
 * Building blocks for `AppDataTable`'s `toolbar` slot: search and filters on the left,
 * row count and the "create" action pushed to the right.
 */

export function TableCount({ count, noun, loading = false }: { count: number; noun: string; loading?: boolean }) {
  return (
    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 tabular-nums">
      {loading ? 'Loading…' : `${count} ${noun}${count === 1 ? '' : 's'}`}
    </span>
  );
}

export function TableToolbarStart({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2">{children}</div>;
}

export function TableToolbarEnd({ children }: { children: ReactNode }) {
  return <div className="ml-auto flex flex-wrap items-center gap-3">{children}</div>;
}

const createButtonClass =
  'inline-flex items-center gap-1 shrink-0 rounded-md bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white no-underline hover:bg-indigo-500 disabled:opacity-50';

/** Navigates with `to`, or runs `onClick` for in-place create flows (e.g. an inline form). */
export function TableCreateButton({
  label,
  ...action
}: { label: string } & ({ to: string } | { onClick: () => void; disabled?: boolean })) {
  if ('to' in action) {
    return (
      <Link to={action.to} className={createButtonClass}>
        <LuPlus size={13} />
        {label}
      </Link>
    );
  }
  return (
    <button type="button" onClick={action.onClick} disabled={action.disabled} className={createButtonClass}>
      <LuPlus size={13} />
      {label}
    </button>
  );
}

export function TableFilterSelect({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  options: readonly { value: string; label: string }[];
  ariaLabel: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-indigo-400"
      aria-label={ariaLabel}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function TableSearchInput({
  value,
  onChange,
  placeholder = 'Search…',
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel: string;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
        <LuSearch size={13} />
      </span>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-56 rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 py-1 pl-7 pr-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        aria-label={ariaLabel}
      />
    </div>
  );
}

/** Case-insensitive "any field contains the query" match; empty query matches everything. */
export function matchesSearch(query: string, fields: (string | null | undefined)[]): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return fields.some((f) => f?.toLowerCase().includes(q));
}
