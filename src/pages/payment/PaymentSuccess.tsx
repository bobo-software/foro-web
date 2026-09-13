import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LuPartyPopper, LuSparkles } from 'react-icons/lu';
import useAuthStore from '@/stores/data/AuthStore';
import { useBusinessStore } from '@/stores/data/BusinessStore';
import { useSubscriptionStore } from '@/stores/data/SubscriptionStore';
import { getPricingTier } from '@/config/pricingTiers';
import { formatCurrency } from '@/utils/currency';

const MAX_POLL_ATTEMPTS = 12;
const POLL_INTERVAL_MS = 5000;
const CELEBRATION_REDIRECT_MS = 6000;

type ViewState = 'checking' | 'active' | 'failed' | 'timeout';

export function PaymentSuccess() {
  const navigate = useNavigate();
  const sessionUser = useAuthStore((s) => s.sessionUser);
  const currentBusiness = useBusinessStore((s) => s.currentBusiness);
  const fetchUserBusinesses = useBusinessStore((s) => s.fetchUserBusinesses);
  const fetchForBusiness = useSubscriptionStore((s) => s.fetchForBusiness);
  const reconcilePending = useSubscriptionStore((s) => s.reconcilePending);
  const currentSubscription = useSubscriptionStore((s) => s.currentSubscription);

  const [view, setView] = useState<ViewState>('checking');
  const attemptsRef = useRef(0);

  useEffect(() => {
    if (sessionUser?.id != null) {
      void fetchUserBusinesses(Number(sessionUser.id));
    }
  }, [sessionUser?.id, fetchUserBusinesses]);

  useEffect(() => {
    const businessId = currentBusiness?.id;
    if (businessId == null) return;

    let cancelled = false;

    const poll = async () => {
      await fetchForBusiness(businessId);
      const status = useSubscriptionStore.getState().currentSubscription?.status;

      if (cancelled) return;

      if (status === 'active') {
        setView('active');
        return;
      }
      if (status === 'past_due') {
        setView('failed');
        return;
      }

      await reconcilePending();
      const nextStatus = useSubscriptionStore.getState().currentSubscription?.status;
      if (cancelled) return;

      if (nextStatus === 'active') {
        setView('active');
        return;
      }
      if (nextStatus === 'past_due') {
        setView('failed');
        return;
      }

      attemptsRef.current += 1;
      if (attemptsRef.current >= MAX_POLL_ATTEMPTS) {
        setView('timeout');
        return;
      }
      setTimeout(poll, POLL_INTERVAL_MS);
    };

    void poll();

    return () => {
      cancelled = true;
    };
  }, [currentBusiness?.id, fetchForBusiness, reconcilePending]);

  useEffect(() => {
    if (view === 'active') {
      const timer = setTimeout(() => navigate('/app/dashboard', { replace: true }), CELEBRATION_REDIRECT_MS);
      return () => clearTimeout(timer);
    }
  }, [view, navigate]);

  const activeTier = currentSubscription && currentSubscription.tier !== 'free' ? getPricingTier(currentSubscription.tier) : null;
  const billedAnnually = currentSubscription?.billing_period === 'annually';
  const priceLabel =
    currentSubscription?.amount != null
      ? `${formatCurrency(currentSubscription.amount, currentSubscription.currency)} / ${billedAnnually ? 'yr' : 'mo'}`
      : activeTier
      ? billedAnnually
        ? `${activeTier.yearlyPrice} / yr`
        : `${activeTier.price}${activeTier.period}`
      : null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 px-4 py-12">
      <div className="w-full max-w-md text-center space-y-4 bg-white dark:bg-slate-800 rounded-xl p-8 border border-slate-200 dark:border-slate-700 shadow-sm">
        {view === 'checking' && (
          <>
            <div className="mx-auto animate-spin rounded-full h-8 w-8 border-2 border-slate-300 border-t-slate-600 dark:border-slate-600 dark:border-t-slate-300" />
            <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Confirming your payment…</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              This usually takes a few seconds. Please don&apos;t close this page.
            </p>
          </>
        )}

        {view === 'active' && (
          <>
            <div className="relative mx-auto flex h-20 w-20 items-center justify-center">
              <LuSparkles className="absolute -top-1 -left-3 h-5 w-5 text-amber-400 animate-pulse" />
              <LuSparkles className="absolute -bottom-1 -right-3 h-4 w-4 text-indigo-400 animate-pulse [animation-delay:300ms]" />
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/30">
                <LuPartyPopper className="h-9 w-9 text-white" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">You&apos;re all set! 🎉</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {activeTier ? (
                <>
                  Your business is now on the <span className="font-semibold text-slate-900 dark:text-white">{activeTier.name}</span> plan.
                </>
              ) : (
                'Your subscription is active.'
              )}
            </p>
            {priceLabel && (
              <div className="mx-auto inline-flex items-center gap-2 rounded-full bg-indigo-50 dark:bg-indigo-900/30 px-4 py-1.5 text-sm font-medium text-indigo-700 dark:text-indigo-300">
                Now billing {priceLabel}
              </div>
            )}
            <p className="text-xs text-slate-400 dark:text-slate-500">
              A confirmation email is on its way. We&apos;ll take you to your dashboard in a moment.
            </p>
            <button
              type="button"
              onClick={() => navigate('/app/dashboard', { replace: true })}
              className="inline-block rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 transition"
            >
              Continue to dashboard
            </button>
          </>
        )}

        {view === 'failed' && (
          <>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Payment failed</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              We couldn&apos;t confirm your payment. Please try again.
            </p>
            <Link to="/app/billing" className="inline-block text-sm text-indigo-600 hover:text-indigo-500 underline">
              Back to plans
            </Link>
          </>
        )}

        {view === 'timeout' && (
          <>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Still processing</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Your payment is taking longer than expected to confirm. We&apos;ll update your plan automatically
              once it clears — check back shortly.
            </p>
            <Link to="/app/dashboard" className="inline-block text-sm text-indigo-600 hover:text-indigo-500 underline">
              Continue
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default PaymentSuccess;
