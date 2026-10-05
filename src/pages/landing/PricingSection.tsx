import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { LuCheck, LuX } from 'react-icons/lu';
import { usePricingStore } from '../../stores/data/PricingStore';
import { PRICING_TIERS, YEARLY_DISCOUNT_PERCENT, withLivePricing } from '../../config/pricingTiers';
import { EASE, Reveal, fadeUp, stagger } from './motionPrimitives';

type BillingPeriod = 'monthly' | 'yearly';

const MotionLink = motion.create(Link);

export function PricingSection() {
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly');
  const liveAmounts = usePricingStore((s) => s.liveAmounts);
  const fetchLivePricing = usePricingStore((s) => s.fetchLivePricing);
  const pricingTiers = useMemo(() => withLivePricing(PRICING_TIERS, liveAmounts), [liveAmounts]);

  useEffect(() => {
    void fetchLivePricing();
  }, [fetchLivePricing]);

  return (
    <section id="pricing" className="max-w-6xl mx-auto w-full mt-32 sm:mt-40 scroll-mt-24">
      <Reveal className="text-center mb-12">
        <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white tracking-tight mb-4">
          Simple, transparent pricing
        </h2>
        <p className="text-lg text-slate-600 dark:text-slate-400">Start free. Upgrade as you grow.</p>

        <div className="mt-8 inline-flex items-center gap-1 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 p-1">
          {(['monthly', 'yearly'] as const).map((period) => {
            const active = billingPeriod === period;
            return (
              <button
                key={period}
                type="button"
                onClick={() => setBillingPeriod(period)}
                className={`relative inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  active ? 'text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="billing-period-pill"
                    className="absolute inset-0 rounded-full bg-slate-900 dark:bg-indigo-600"
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  />
                )}
                <span className="relative">{period === 'monthly' ? 'Monthly' : 'Yearly'}</span>
                {period === 'yearly' && (
                  <span
                    className={`relative rounded-full px-2 py-0.5 text-xs font-semibold ${
                      active
                        ? 'bg-white/20 text-white'
                        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                    }`}
                  >
                    Save {YEARLY_DISCOUNT_PERCENT}%
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </Reveal>

      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-80px' }}
        variants={stagger(0.1)}
      >
        {pricingTiers.map((tier) => (
          <motion.div
            key={tier.id}
            variants={fadeUp}
            whileHover={{ y: -8, transition: { type: 'spring', stiffness: 300, damping: 20 } }}
            className={`relative flex flex-col rounded-2xl border p-6 transition-[box-shadow,border-color] ${
              tier.highlight
                ? 'border-indigo-500 bg-indigo-600 shadow-xl shadow-indigo-500/25 hover:shadow-2xl hover:shadow-indigo-500/40'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 shadow-sm hover:shadow-lg hover:border-indigo-200 dark:hover:border-indigo-900/50'
            }`}
          >
            {tier.highlight && (
              // Periodic shimmer sweep across the featured plan.
              <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
                <motion.div
                  className="absolute inset-y-0 -left-1/2 w-1/2 bg-gradient-to-r from-transparent via-white/15 to-transparent skew-x-[-20deg]"
                  animate={{ x: ['0%', '400%'] }}
                  transition={{ duration: 2.2, repeat: Infinity, repeatDelay: 3, ease: 'easeInOut' }}
                />
              </div>
            )}

            {tier.badge && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center rounded-full bg-indigo-500 px-3 py-1 text-xs font-semibold text-white ring-2 ring-indigo-600">
                {tier.badge}
              </span>
            )}

            <div className="relative mb-6">
              <h3 className={`text-lg font-bold mb-1 ${tier.highlight ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                {tier.name}
              </h3>
              <p className={`text-sm mb-4 ${tier.highlight ? 'text-indigo-200' : 'text-slate-500 dark:text-slate-400'}`}>
                {tier.description}
              </p>

              <div className="min-h-[4.25rem]">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={billingPeriod}
                    initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
                    transition={{ duration: 0.25, ease: EASE }}
                  >
                    <div className="flex items-end gap-1">
                      <span
                        className={`text-4xl font-extrabold tracking-tight ${tier.highlight ? 'text-white' : 'text-slate-900 dark:text-white'}`}
                      >
                        {billingPeriod === 'monthly' ? tier.price : tier.yearlyPrice}
                      </span>
                      <span className={`text-sm mb-1 ${tier.highlight ? 'text-indigo-200' : 'text-slate-500 dark:text-slate-400'}`}>
                        {billingPeriod === 'monthly' ? tier.period : '/yr'}
                      </span>
                    </div>
                    {billingPeriod === 'yearly' && tier.amount > 0 && (
                      <div
                        className={`mt-1 flex items-center gap-2 text-xs ${tier.highlight ? 'text-indigo-200' : 'text-slate-500 dark:text-slate-400'}`}
                      >
                        <span className="line-through opacity-70">{tier.yearlyStrikePrice}</span>
                        <span
                          className={`rounded-full px-2 py-0.5 font-semibold ${
                            tier.highlight
                              ? 'bg-white/20 text-white'
                              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                          }`}
                        >
                          Save {YEARLY_DISCOUNT_PERCENT}%
                        </span>
                        <span>· {tier.yearlyMonthlyEquivalent}</span>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            <ul className="relative flex-1 space-y-3 mb-8">
              {tier.features.map((f) => (
                <li key={f.label} className="flex items-center gap-2.5 text-sm">
                  {f.included ? (
                    <LuCheck
                      size={16}
                      strokeWidth={2.5}
                      className={tier.highlight ? 'text-indigo-200 shrink-0' : 'text-indigo-500 shrink-0'}
                    />
                  ) : (
                    <LuX
                      size={16}
                      strokeWidth={2.5}
                      className={tier.highlight ? 'text-indigo-300/50 shrink-0' : 'text-slate-300 dark:text-slate-600 shrink-0'}
                    />
                  )}
                  <span
                    className={
                      f.included
                        ? tier.highlight
                          ? 'text-indigo-100'
                          : 'text-slate-700 dark:text-slate-300'
                        : tier.highlight
                          ? 'text-indigo-300/50'
                          : 'text-slate-400 dark:text-slate-600'
                    }
                  >
                    {f.label}
                  </span>
                </li>
              ))}
            </ul>

            <MotionLink
              to="/register"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className={`relative inline-flex items-center justify-center rounded-xl px-6 py-3 text-sm font-semibold transition-colors no-underline ${
                tier.highlight
                  ? 'bg-white text-indigo-600 hover:bg-indigo-50 shadow-sm'
                  : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-sm shadow-indigo-500/20'
              }`}
            >
              Get started
            </MotionLink>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
