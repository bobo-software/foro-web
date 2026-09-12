import type { BillingPeriod, SubscriptionTier } from '@/types/subscription';

export interface PricingTierFeature {
  label: string;
  included: boolean;
}

export interface PricingTierLimits {
  /** Max client companies (companies with is_owner_company=false) per business. */
  companies: number;
  /** Max active team memberships per business. */
  teamMembers: number;
  /** Max invoices (document_kind='invoice') created per calendar month. null = unlimited. */
  invoices: number | null;
}

export interface PricingTier {
  id: SubscriptionTier;
  name: string;
  price: string;
  amount: number;
  period: string;
  /** Annual price, discounted YEARLY_DISCOUNT_PERCENT off the monthly rate paid for 12 months. */
  yearlyPrice: string;
  yearlyAmount: number;
  /** What the yearly plan works out to per month, for the "≈ Rxx/mo" subtext. */
  yearlyMonthlyEquivalent: string;
  /** The full undiscounted annual cost (amount * 12), shown struck through next to yearlyPrice. */
  yearlyStrikePrice: string;
  description: string;
  highlight: boolean;
  badge: string | null;
  limits: PricingTierLimits;
  features: PricingTierFeature[];
  /**
   * Paystack plan code — the amounts below are only a fallback used until the
   * live price is fetched from Paystack (the actual billing system, and the
   * single source of truth for pricing). See usePricingStore + withLivePricing.
   */
  planCode?: string;
  providerId?: number;
}

/** How much cheaper the yearly rate is vs. paying monthly for 12 months. */
export const YEARLY_DISCOUNT_PERCENT = 35;

export function formatZar(amount: number): string {
  return `R${Math.round(amount).toLocaleString('en-ZA')}`;
}

function yearlyPricing(monthlyAmount: number) {
  const yearlyAmount = Math.round(monthlyAmount * 12 * (1 - YEARLY_DISCOUNT_PERCENT / 100));
  return {
    yearlyAmount,
    yearlyPrice: formatZar(yearlyAmount),
    yearlyMonthlyEquivalent: `${formatZar(yearlyAmount / 12)}/mo`,
    yearlyStrikePrice: formatZar(monthlyAmount * 12),
  };
}

function buildFeatures(limits: PricingTierLimits, rest: PricingTierFeature[]): PricingTierFeature[] {
  return [
    { label: `${limits.companies} companies`, included: true },
    { label: `${limits.teamMembers} team members`, included: true },
    {
      label: limits.invoices == null ? 'Unlimited invoices' : `${limits.invoices} invoices/month`,
      included: true,
    },
    ...rest,
  ];
}

export const PRICING_TIERS: PricingTier[] = [
  {
    id: 'free',
    name: 'Free',
    price: 'R0',
    amount: 0,
    period: '/mo',
    yearlyPrice: 'R0',
    yearlyAmount: 0,
    yearlyMonthlyEquivalent: 'R0/mo',
    yearlyStrikePrice: 'R0',
    description: 'Get started at no cost. No credit card required.',
    highlight: false,
    badge: null,
    limits: { companies: 7, teamMembers: 2, invoices: 5 },
    features: buildFeatures({ companies: 7, teamMembers: 2, invoices: 5 }, [
      { label: 'Quotations & invoices', included: true },
      { label: 'Payments & statements', included: true },
      { label: 'PDF downloads', included: true },
      { label: 'Items catalog', included: true },
      { label: 'Project tasks (list view)', included: true },
      { label: 'Time tracking', included: false },
      { label: 'Custom branding', included: false },
      { label: 'Client portal', included: false },
      { label: 'Priority support', included: false },
    ]),
  },
  {
    id: 'bronze',
    name: 'Bronze',
    price: 'R149',
    amount: 149,
    period: '/mo',
    ...yearlyPricing(149),
    description: 'For growing small businesses.',
    highlight: false,
    badge: null,
    limits: { companies: 10, teamMembers: 5, invoices: 10 },
    features: buildFeatures({ companies: 10, teamMembers: 5, invoices: 10 }, [
      { label: 'Quotations & invoices', included: true },
      { label: 'Payments & statements', included: true },
      { label: 'PDF downloads', included: true },
      { label: 'Items catalog', included: true },
      { label: 'Kanban & timeline views', included: true },
      { label: 'Time tracking & budgets', included: true },
      { label: 'Custom branding', included: true },
      { label: 'Client portal', included: false },
      { label: 'Priority support', included: false },
      { label: 'Upload proof of payment when tracking payments', included: false },
    ]),
    planCode: 'PLN_edbry63aywhyi08',
    providerId: 1,
  },
  {
    id: 'silver',
    name: 'Silver',
    price: 'R249',
    amount: 249,
    period: '/mo',
    ...yearlyPricing(249),
    description: 'For teams managing more clients.',
    highlight: true,
    badge: 'Most popular',
    limits: { companies: 18, teamMembers: 10, invoices: 20 },
    features: buildFeatures({ companies: 18, teamMembers: 10, invoices: 20 }, [
      { label: 'Quotations & invoices', included: true },
      { label: 'Payments & statements', included: true },
      { label: 'Kanban & timeline views', included: true },
      { label: 'Time tracking & budgets', included: true },
      { label: 'Custom branding', included: true },
      { label: 'Client portal', included: true },
      { label: 'Project automation', included: true },
      { label: 'Priority support', included: true },
      { label: 'Bulk operations', included: true },
      { label: 'Upload proof of payment when tracking payments', included: true },
    ]),
    planCode: 'PLN_jcgk9rclblm91m5',
    providerId: 1,
  },
  {
    id: 'gold',
    name: 'Gold',
    price: 'R349',
    amount: 349,
    period: '/mo',
    ...yearlyPricing(349),
    description: 'Full power for larger operations.',
    highlight: false,
    badge: null,
    limits: { companies: 25, teamMembers: 15, invoices: null },
    features: buildFeatures({ companies: 25, teamMembers: 15, invoices: null }, [
      { label: 'Quotations & invoices', included: true },
      { label: 'Payments & statements', included: true },
      { label: 'Kanban & timeline views', included: true },
      { label: 'Time tracking & budgets', included: true },
      { label: 'Custom branding', included: true },
      { label: 'Client portal', included: true },
      { label: 'Project automation', included: true },
      { label: 'Priority support', included: true },
      { label: 'Bulk operations', included: true },
      { label: 'API access', included: true },
      { label: 'Upload proof of payment when tracking payments', included: true },
    ]),
    planCode: 'PLN_1l4or6hfzzvmf3y',
    providerId: 1,
  },
];

/**
 * Recomputes a tier's displayed price (and derived yearly figures) from live
 * amounts fetched from Paystack. Free (amount 0) is never overridden — it
 * isn't a Paystack plan. Pass `liveAmounts` from usePricingStore.
 *
 * The monthly amount always overrides `amount`/`price`. The yearly figures
 * prefer a real live annual plan amount when one exists (so "Save X%" always
 * reflects what Paystack would actually charge); if no annual plan is live
 * yet, they fall back to the computed YEARLY_DISCOUNT_PERCENT off whatever
 * monthly amount resolved (live or static).
 */
export function withLivePricing(
  tiers: PricingTier[],
  liveAmounts: Partial<Record<SubscriptionTier, Partial<Record<BillingPeriod, number>>>>,
): PricingTier[] {
  return tiers.map((tier) => {
    if (tier.amount === 0) return tier;
    const live = liveAmounts[tier.id];
    const monthlyAmount = live?.monthly ?? tier.amount;
    const yearlyAmount = live?.annually;

    return {
      ...tier,
      amount: monthlyAmount,
      price: formatZar(monthlyAmount),
      ...(yearlyAmount != null
        ? {
            yearlyAmount,
            yearlyPrice: formatZar(yearlyAmount),
            yearlyMonthlyEquivalent: `${formatZar(yearlyAmount / 12)}/mo`,
            yearlyStrikePrice: formatZar(monthlyAmount * 12),
          }
        : yearlyPricing(monthlyAmount)),
    };
  });
}

export function getPricingTier(id: SubscriptionTier): PricingTier {
  const tier = PRICING_TIERS.find((t) => t.id === id);
  if (!tier) throw new Error(`Unknown pricing tier: ${id}`);
  return tier;
}
