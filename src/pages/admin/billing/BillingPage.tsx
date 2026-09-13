import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { LuBuilding2, LuCheck, LuFileText, LuUsers } from 'react-icons/lu';
import { useBusinessStore } from '@/stores/data/BusinessStore';
import { useSubscriptionStore } from '@/stores/data/SubscriptionStore';
import { usePricingStore } from '@/stores/data/PricingStore';
import { useIsBusinessOwner } from '@/hooks/useBusinessRole';
import { useSubscriptionUsage, type UsageMetric } from '@/hooks/useSubscriptionUsage';
import useAuthStore from '@/stores/data/AuthStore';
import {
  PRICING_TIERS,
  YEARLY_DISCOUNT_PERCENT,
  classifyPlanChange,
  getPricingTier,
  withLivePricing,
} from '@/config/pricingTiers';
import { ConfirmPlanChangeModal } from '@/components/modals/ConfirmPlanChangeModal';
import type { ChangePlanResult } from '@/services/subscriptionService';
import type { BillingPeriod, SubscriptionTier } from '@/types/subscription';

const STATUS_LABEL: Record<string, string> = {
  active: 'Active',
  pending: 'Payment pending',
  past_due: 'Payment failed',
  cancelled: 'Cancelled',
};

const STATUS_CLASS: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  past_due: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  cancelled: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

function UsageRow({ icon, metric }: { icon: React.ReactNode; metric: UsageMetric }) {
  const { label, used, limit } = metric;
  const pct = limit != null && limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const atLimit = limit != null && used >= limit;
  const remaining = limit != null ? Math.max(0, limit - used) : null;
  return (
    <div className="flex items-center gap-4 py-4">
      <div className="shrink-0 w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-3 mb-1.5">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</span>
          <span
            className={`text-sm font-semibold ${atLimit ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-white'}`}
          >
            {limit != null ? `${used} / ${limit}` : used}
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${atLimit ? 'bg-red-500' : 'bg-indigo-500'}`}
            style={{ width: limit != null ? `${pct}%` : '100%' }}
          />
        </div>
        <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
          {limit == null
            ? 'Unlimited on your current plan'
            : atLimit
              ? 'Limit reached — upgrade to add more'
              : `${remaining} remaining`}
        </p>
      </div>
    </div>
  );
}

export function BillingPage() {
  const sessionUser = useAuthStore((s) => s.sessionUser);
  const currentBusiness = useBusinessStore((s) => s.currentBusiness);
  const currentSubscription = useSubscriptionStore((s) => s.currentSubscription);
  const fetchForBusiness = useSubscriptionStore((s) => s.fetchForBusiness);
  const selectFreeTier = useSubscriptionStore((s) => s.selectFreeTier);
  const startPaidCheckout = useSubscriptionStore((s) => s.startPaidCheckout);

  const businessId = currentBusiness?.id ?? null;
  const { isOwner } = useIsBusinessOwner(businessId);
  const usage = useSubscriptionUsage();
  const [pendingTier, setPendingTier] = useState<SubscriptionTier | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly');
  const [changeModalTarget, setChangeModalTarget] = useState<SubscriptionTier | null>(null);
  const liveAmounts = usePricingStore((s) => s.liveAmounts);
  const fetchLivePricing = usePricingStore((s) => s.fetchLivePricing);
  const pricingTiers = useMemo(() => withLivePricing(PRICING_TIERS, liveAmounts), [liveAmounts]);

  useEffect(() => {
    if (businessId != null) void fetchForBusiness(businessId);
  }, [businessId, fetchForBusiness]);

  useEffect(() => {
    void fetchLivePricing();
  }, [fetchLivePricing]);

  const currentTier = currentSubscription ? getPricingTier(currentSubscription.tier) : null;
  const currentPeriod: BillingPeriod = currentSubscription?.billing_period ?? 'monthly';
  // Already paying for something — switching tiers goes through the password-confirmed
  // change-plan flow (prorated upgrade or a scheduled downgrade) rather than a fresh checkout.
  const hasActivePaidPlan = currentSubscription?.tier !== 'free' && currentSubscription?.status === 'active';

  const handleChangePlan = async (tier: SubscriptionTier) => {
    if (!businessId) return;
    if (hasActivePaidPlan) {
      setChangeModalTarget(tier);
      return;
    }
    setPendingTier(tier);
    try {
      if (tier === 'free') {
        await selectFreeTier(businessId);
        toast.success('Switched to the Free plan');
        return;
      }
      const email = sessionUser?.email;
      if (!email) {
        toast.error('Your account has no email on file');
        return;
      }
      const paymentUrl = await startPaidCheckout(businessId, tier, email, billingPeriod);
      if (!paymentUrl) {
        const reason = useSubscriptionStore.getState().error;
        toast.error(reason || 'Failed to start checkout. Please try again.');
        return;
      }
      window.location.href = paymentUrl;
    } finally {
      setPendingTier(null);
    }
  };

  const handlePlanChangeSuccess = (result: ChangePlanResult) => {
    const targetName = changeModalTarget ? getPricingTier(changeModalTarget).name : 'your new plan';
    setChangeModalTarget(null);

    if (result.changeType === 'upgrade') {
      const amount = result.chargedAmount;
      toast.success(
        amount
          ? `Upgraded to ${targetName} — charged ${result.subscription.currency ?? 'ZAR'} ${amount.toFixed(2)}.`
          : `Upgraded to ${targetName}.`
      );
      return;
    }

    const effectiveLabel =
      result.effectiveAt !== 'immediate'
        ? new Date(result.effectiveAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
        : 'the end of your current billing period';
    toast.success(`You'll stay on ${currentTier?.name ?? 'your current plan'} until ${effectiveLabel}, then move to ${targetName}.`);
  };

  if (!isOwner) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Only the account owner can manage billing for this business.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Billing</h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">Manage your subscription plan and usage.</p>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">Current plan</h3>
            <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">
              {currentTier?.name ?? 'No plan selected'}
              {currentTier && currentTier.amount > 0 && (
                <span className="ml-2 text-sm font-normal text-slate-500 dark:text-slate-400">
                  · billed {currentPeriod === 'annually' ? 'annually' : 'monthly'}
                </span>
              )}
            </p>
          </div>
          {currentSubscription?.status && (
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                STATUS_CLASS[currentSubscription.status] ?? STATUS_CLASS.cancelled
              }`}
            >
              {STATUS_LABEL[currentSubscription.status] ?? currentSubscription.status}
            </span>
          )}
        </div>

        <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-700">
          <UsageRow icon={<LuBuilding2 className="w-5 h-5" />} metric={usage.companies} />
          <UsageRow icon={<LuUsers className="w-5 h-5" />} metric={usage.teamMembers} />
          <UsageRow icon={<LuFileText className="w-5 h-5" />} metric={usage.invoicesThisMonth} />
        </div>

        {currentSubscription?.tier !== 'free' && currentSubscription?.status === 'active' && (
          currentSubscription?.subscription_token ? (
            <button
              type="button"
              onClick={() => setChangeModalTarget('free')}
              className="mt-4 text-sm text-red-600 hover:text-red-500 underline"
            >
              Switch to Free
            </button>
          ) : (
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
              Confirming your subscription with the payment provider — cancellation will be available shortly.
            </p>
          )
        )}
      </div>

      <div>
        <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
          <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">Change plan</h3>
          <div className="inline-flex items-center gap-1 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-1">
            <button
              type="button"
              onClick={() => setBillingPeriod('monthly')}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                billingPeriod === 'monthly'
                  ? 'bg-slate-900 dark:bg-indigo-600 text-white'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBillingPeriod('annually')}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition ${
                billingPeriod === 'annually'
                  ? 'bg-slate-900 dark:bg-indigo-600 text-white'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              Yearly
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                  billingPeriod === 'annually'
                    ? 'bg-white/20 text-white'
                    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                }`}
              >
                -{YEARLY_DISCOUNT_PERCENT}%
              </span>
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {pricingTiers.map((tier) => {
            const effectivePeriod = tier.amount === 0 ? 'monthly' : billingPeriod;
            const isCurrent =
              currentSubscription?.tier === tier.id &&
              currentSubscription?.status === 'active' &&
              (tier.amount === 0 || currentPeriod === effectivePeriod);
            const changeType = classifyPlanChange(currentSubscription?.tier ?? 'free', currentPeriod, tier.id, effectivePeriod);
            const actionLabel = changeType === 'upgrade' ? 'Upgrade' : 'Downgrade';
            const includedFeatures = tier.features.filter((f) => f.included);
            return (
              <div
                key={tier.id}
                className={`flex flex-col h-full rounded-xl border p-4 ${
                  isCurrent
                    ? 'border-indigo-500 ring-1 ring-indigo-500'
                    : 'border-slate-200 dark:border-slate-700'
                }`}
              >
                <p className="font-semibold text-slate-900 dark:text-white">{tier.name}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                  {effectivePeriod === 'annually' ? `${tier.yearlyPrice}/yr` : `${tier.price}${tier.period}`}
                </p>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
                  What you&apos;ll get
                </p>
                <ul className="flex-1 space-y-1.5 mb-4">
                  {includedFeatures.map((feature) => (
                    <li
                      key={feature.label}
                      className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400"
                    >
                      <LuCheck className="w-3.5 h-3.5 mt-0.5 text-emerald-500 shrink-0" />
                      <span>{feature.label}</span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  disabled={isCurrent || pendingTier !== null}
                  onClick={() => handleChangePlan(tier.id)}
                  className="w-full rounded-lg bg-slate-900 dark:bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:hover:bg-indigo-500 disabled:opacity-50 transition"
                >
                  {isCurrent ? 'Current plan' : pendingTier === tier.id ? 'Please wait…' : actionLabel}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {changeModalTarget && currentSubscription && businessId != null && (
        <ConfirmPlanChangeModal
          isOpen={true}
          onClose={() => setChangeModalTarget(null)}
          businessId={businessId}
          customerEmail={sessionUser?.email ?? null}
          currentTier={currentSubscription.tier}
          currentTierName={currentTier?.name ?? currentSubscription.tier}
          currentPeriod={currentPeriod}
          currentPeriodEnd={currentSubscription.current_period_end ?? null}
          targetTier={changeModalTarget}
          targetTierName={getPricingTier(changeModalTarget).name}
          targetPeriod={changeModalTarget === 'free' ? 'monthly' : billingPeriod}
          onSuccess={handlePlanChangeSuccess}
        />
      )}
    </div>
  );
}

export default BillingPage;
