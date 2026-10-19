import type { SigningDocumentStatus } from '../../../types/signingDocument';

const STATUS: Record<SigningDocumentStatus, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' },
  sent: { label: 'Awaiting signature', className: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  signed: { label: 'Signed', className: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  voided: { label: 'Voided', className: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
};

export function SigningStatusBadge({ status }: { status: SigningDocumentStatus }) {
  const s = STATUS[status] ?? STATUS.draft;
  return (
    <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${s.className}`}>
      {s.label}
    </span>
  );
}
