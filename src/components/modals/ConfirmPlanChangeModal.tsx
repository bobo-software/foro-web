import { useEffect, useState } from 'react';
import { LuCheck, LuEye, LuEyeOff } from 'react-icons/lu';
import { AppModal } from './AppModal';
import { useSubscriptionStore } from '@/stores/data/SubscriptionStore';
import { classifyPlanChange, getPricingTier } from '@/config/pricingTiers';
import type { ChangePlanResult } from '@/services/subscriptionService';
import type { BillingPeriod, SubscriptionTier } from '@/types/subscription';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

export interface ConfirmPlanChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  businessId: number;
  customerEmail: string | null;
  currentTier: SubscriptionTier;
  currentTierName: string;
  currentPeriod: BillingPeriod;
  currentPeriodEnd: string | null;
  targetTier: SubscriptionTier;
  targetTierName: string;
  targetPeriod: BillingPeriod;
  onSuccess: (result: ChangePlanResult) => void;
}

export function ConfirmPlanChangeModal({
  isOpen,
  onClose,
  businessId,
  customerEmail,
  currentTier,
  currentTierName,
  currentPeriod,
  currentPeriodEnd,
  targetTier,
  targetTierName,
  targetPeriod,
  onSuccess,
}: ConfirmPlanChangeModalProps) {
  const changePlan = useSubscriptionStore((s) => s.changePlan);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setShowPassword(false);
      setError(null);
      setSubmitting(false);
    }
  }, [isOpen]);

  const changeType = classifyPlanChange(currentTier, currentPeriod, targetTier, targetPeriod);
  const targetFeatures = getPricingTier(targetTier).features.filter((f) => f.included);

  const handleConfirm = async () => {
    if (submitting) return;
    if (!password) {
      setError('Please enter your password to continue');
      return;
    }
    if (!customerEmail) {
      setError('Your account has no email on file');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const result = await changePlan(businessId, targetTier, targetPeriod, customerEmail, password);
      if (!result) {
        setError(useSubscriptionStore.getState().error || 'Failed to change your plan. Please try again.');
        return;
      }
      onSuccess(result);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppModal
      isOpen={isOpen}
      onClose={onClose}
      title={changeType === 'upgrade' ? 'Confirm upgrade' : 'Confirm downgrade'}
      size="md"
      closeOnBackdrop={!submitting}
      showCloseButton={!submitting}
      buttons={[
        { label: 'Cancel', variant: 'secondary', onClick: onClose, disabled: submitting },
        {
          label: changeType === 'upgrade' ? 'Upgrade & pay now' : 'Confirm downgrade',
          variant: 'primary',
          onClick: handleConfirm,
          loading: submitting,
          loadingLabel: 'Confirming…',
        },
      ]}
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void handleConfirm();
        }}
      >
        <p className="text-sm text-slate-700 dark:text-slate-300">
          You&apos;re switching from <span className="font-semibold">{currentTierName}</span> to{' '}
          <span className="font-semibold">{targetTierName}</span>
          {targetTier !== 'free' ? (targetPeriod === 'annually' ? ' (billed annually)' : ' (billed monthly)') : ''}.
        </p>

        {changeType === 'upgrade' ? (
          <p className="text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3">
            You&apos;ll be charged a prorated amount right now for the days remaining in your current billing
            period, and your new plan starts immediately.
          </p>
        ) : (
          <p className="text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3">
            No charge today. You&apos;ll keep your <span className="font-medium">{currentTierName}</span> plan and
            features until{' '}
            <span className="font-medium">
              {currentPeriodEnd ? formatDate(currentPeriodEnd) : 'the end of your current billing period'}
            </span>
            , then you&apos;ll move to <span className="font-medium">{targetTierName}</span>.
          </p>
        )}

        <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            What you&apos;ll get with {targetTierName}
          </p>
          <ul className="space-y-1.5">
            {targetFeatures.map((feature) => (
              <li key={feature.label} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                <LuCheck className="w-4 h-4 mt-0.5 text-emerald-500 shrink-0" />
                <span>{feature.label}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <label
            htmlFor="plan-change-password"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
          >
            Confirm your password to continue
          </label>
          <div className="relative">
            <input
              id="plan-change-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
              autoFocus
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 pr-10 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button
              type="button"
              onClick={() => setShowPassword((p) => !p)}
              disabled={submitting}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors disabled:opacity-50"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <LuEyeOff size={18} /> : <LuEye size={18} />}
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3">
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}
      </form>
    </AppModal>
  );
}

export default ConfirmPlanChangeModal;
