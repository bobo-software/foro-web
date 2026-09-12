/**
 * Pricing Store
 * Caches live per-tier, per-period pricing fetched from Paystack (via
 * /api/v1/payments/plans) — the single source of truth for what each plan
 * actually costs. Consumers merge this into the static PRICING_TIERS config
 * with withLivePricing().
 */

import { create } from 'zustand';
import SubscriptionService from '../../services/subscriptionService';
import type { BillingPeriod, SubscriptionTier } from '../../types/subscription';

export type LiveTierAmounts = Partial<Record<BillingPeriod, number>>;

interface PricingState {
  liveAmounts: Partial<Record<SubscriptionTier, LiveTierAmounts>>;
  loading: boolean;
  loaded: boolean;
  fetchLivePricing: () => Promise<void>;
}

export const usePricingStore = create<PricingState>((set, get) => ({
  liveAmounts: {},
  loading: false,
  loaded: false,

  fetchLivePricing: async () => {
    if (get().loaded || get().loading) return;
    set({ loading: true });
    try {
      const plans = await SubscriptionService.getPlans();
      const liveAmounts: Partial<Record<SubscriptionTier, LiveTierAmounts>> = {};
      for (const plan of plans) {
        if (plan.amount == null) continue;
        const tier = plan.tier as SubscriptionTier;
        liveAmounts[tier] = { ...liveAmounts[tier], [plan.period]: plan.amount };
      }
      set({ liveAmounts, loading: false, loaded: true });
    } catch {
      // Fail open — Landing/Billing fall back to the static prices in pricingTiers.ts.
      set({ loading: false, loaded: true });
    }
  },
}));

export default usePricingStore;
