import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LuLandmark } from 'react-icons/lu';
import AppText from '@/components/text/AppText';
import { useCanManagePayroll } from '@/hooks/useBusinessRole';
import { useBusinessStore } from '@/stores/data/BusinessStore';
import { useBusinessTaxStore } from '@/stores/data/BusinessTaxStore';
import { localIsoDate, nextProvisionalPayment, taxYearLabel } from '@/utils/businessTax';
import { formatCurrency } from '@/utils/currency';
import { formatCalendarDate } from '@/utils/recurrence';

/** Owner/admin-only dashboard summary: projected tax this year and the next IRP6 payment. */
export function DashboardTaxTile() {
  const businessId = useBusinessStore((s) => s.currentBusiness?.id);
  const { canManage } = useCanManagePayroll(businessId);
  const estimate = useBusinessTaxStore((s) => s.estimate);
  const fetchEstimate = useBusinessTaxStore((s) => s.fetchEstimate);

  useEffect(() => {
    if (canManage && businessId != null) void fetchEstimate();
  }, [canManage, businessId, fetchEstimate]);

  if (!canManage) return null;

  const current = estimate?.business_id === businessId ? estimate : null;
  const fullYear = current ? (current.projected ?? current.actual) : null;
  const next = current ? nextProvisionalPayment(current.provisional, localIsoDate()) : null;

  return (
    <Link
      to="/app/tax"
      className="block no-underline text-inherit bg-white dark:bg-slate-800 rounded-lg border border-slate-200/80 dark:border-slate-700 shadow-sm px-3 py-3 hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
    >
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-1.5 rounded-md shrink-0 bg-sky-100 dark:bg-sky-900/40 text-sky-600 dark:text-sky-300 [&>svg]:w-4 [&>svg]:h-4">
            <LuLandmark />
          </div>
          <div className="min-w-0">
            <AppText
              variant="label"
              className="text-xs"
              text={current ? `Projected tax · ${taxYearLabel(current.year_of_assessment.code)}` : 'Projected tax'}
            />
            <AppText variant="value" className="text-base leading-tight font-semibold">
              {fullYear ? formatCurrency(fullYear.tax.tax_liability) : '—'}
            </AppText>
          </div>
        </div>
        <div className="min-w-0">
          <AppText variant="label" className="text-xs" text="Next provisional tax (IRP6)" />
          <AppText variant="value" className="text-base leading-tight font-semibold">
            {next
              ? `${next.suggested_payment != null ? formatCurrency(next.suggested_payment) : 'Top-up'} by ${formatCalendarDate(next.due_date)}`
              : '—'}
          </AppText>
        </div>
        <p className="ml-auto text-[11px] text-slate-400 dark:text-slate-500">Estimate, not tax advice · open Tax</p>
      </div>
    </Link>
  );
}

export default DashboardTaxTile;
