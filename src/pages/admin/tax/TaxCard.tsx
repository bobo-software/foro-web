export function TaxCard({ title, value, hint }: { title: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
      <p className="text-[11px] uppercase tracking-wide text-slate-400">{title}</p>
      <p className="mt-1 text-base font-semibold text-slate-800 dark:text-slate-100">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{hint}</p> : null}
    </div>
  );
}
