import type { TaxReturnStatus } from '@/types/businessTax';

export function TaxReturnStatusBadge({ status }: { status: TaxReturnStatus }) {
  const submitted = status === 'submitted';
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${
        submitted
          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
          : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
      }`}
    >
      {submitted ? 'Submitted' : 'Draft'}
    </span>
  );
}
