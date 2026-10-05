import { Link, Outlet, useLocation } from 'react-router-dom';

// Each tab's create action lives in its table toolbar.
const TABS = [
  { label: 'Purchase orders', path: '/app/purchasing/orders' },
  { label: 'Suppliers', path: '/app/purchasing/suppliers' },
  { label: 'Bills', path: '/app/purchasing/bills' },
  { label: 'Expenses', path: '/app/purchasing/expenses' },
] as const;

export function PurchasingPage() {
  const location = useLocation();

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <h1 className="flex-1 text-sm font-semibold text-slate-800 dark:text-slate-100 leading-none">
          Payments
        </h1>
      </div>
      <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-700">
        {TABS.map((tab) => {
          const isActive = location.pathname.startsWith(tab.path);
          return (
            <Link
              key={tab.path}
              to={tab.path}
              className={`px-3 py-1.5 text-xs font-medium border-b-2 -mb-px transition-colors no-underline ${
                isActive
                  ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
      <Outlet />
    </div>
  );
}

export default PurchasingPage;
