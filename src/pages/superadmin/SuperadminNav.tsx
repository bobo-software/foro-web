import { Link, useLocation } from 'react-router-dom';

const LINKS = [
  { to: '/superadmin/known-companies', label: 'Known companies' },
  { to: '/superadmin/request-logs', label: 'Request logs' },
] as const;

/** Minimal top nav shared by standalone superadmin pages (outside AppLayout). */
export function SuperadminNav() {
  const location = useLocation();
  return (
    <header className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <Link
          to="/app/dashboard"
          className="text-sm font-medium text-slate-500 dark:text-slate-400 no-underline hover:text-indigo-600 dark:hover:text-indigo-400"
        >
          ← App
        </Link>
        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">Superadmin</span>
        <nav className="flex gap-2">
          {LINKS.map((link) => {
            const active = location.pathname.startsWith(link.to);
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`rounded-md px-3 py-1.5 text-sm no-underline ${
                  active
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
