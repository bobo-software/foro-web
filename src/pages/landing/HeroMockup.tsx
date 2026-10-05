import type { MouseEvent, ReactNode } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import { LuArrowRight, LuCircleCheck, LuFileText, LuSend } from 'react-icons/lu';
import { formatZar } from '../../config/pricingTiers';
import { CountUp, EASE } from './motionPrimitives';

const LINE_ITEMS = [
  { label: 'Website redesign', qty: 1, amount: 8500 },
  { label: 'Monthly hosting', qty: 3, amount: 1200 },
  { label: 'Support hours', qty: 6, amount: 2700 },
];
const TOTAL = LINE_ITEMS.reduce((sum, l) => sum + l.amount, 0);

/** Illustrative invoice card for the hero: tilts toward the cursor and "gets paid" on load. */
export function HeroMockup() {
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const rotateX = useSpring(useTransform(py, [-0.5, 0.5], [9, -9]), { stiffness: 150, damping: 18 });
  const rotateY = useSpring(useTransform(px, [-0.5, 0.5], [-12, 12]), { stiffness: 150, damping: 18 });

  function handleMove(e: MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    px.set((e.clientX - rect.left) / rect.width - 0.5);
    py.set((e.clientY - rect.top) / rect.height - 0.5);
  }

  function handleLeave() {
    px.set(0);
    py.set(0);
  }

  return (
    <div
      className="relative mx-auto w-full max-w-md [perspective:1200px]"
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      aria-hidden
    >
      <motion.div
        style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
        initial={{ opacity: 0, y: 40, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.9, delay: 0.3, ease: EASE }}
        className="relative rounded-2xl border border-slate-200/80 dark:border-slate-700/70 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl p-6 shadow-2xl shadow-indigo-500/10 dark:shadow-indigo-500/20"
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Invoice</p>
            <p className="text-lg font-bold text-slate-900 dark:text-white">INV-0042</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500 dark:text-slate-400">Billed to</p>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Acme Holdings</p>
          </div>
        </div>

        {/* Line items */}
        <motion.ul
          className="space-y-3 border-y border-slate-100 dark:border-slate-800 py-4"
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.18, delayChildren: 0.8 } } }}
        >
          {LINE_ITEMS.map((l) => (
            <motion.li
              key={l.label}
              variants={{ hidden: { opacity: 0, x: -16 }, show: { opacity: 1, x: 0, transition: { ease: EASE } } }}
              className="flex items-center justify-between text-sm"
            >
              <span className="text-slate-600 dark:text-slate-300">
                {l.label} <span className="text-slate-400 dark:text-slate-500">× {l.qty}</span>
              </span>
              <span className="font-medium tabular-nums text-slate-900 dark:text-white">{formatZar(l.amount)}</span>
            </motion.li>
          ))}
        </motion.ul>

        {/* Total */}
        <div className="flex items-end justify-between pt-4">
          <span className="text-sm text-slate-500 dark:text-slate-400">Total due</span>
          <span className="text-3xl font-extrabold tracking-tight tabular-nums text-slate-900 dark:text-white">
            <CountUp to={TOTAL} format={formatZar} delay={1.4} />
          </span>
        </div>

        {/* Progress → paid */}
        <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <motion.div
            className="h-full origin-left rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-emerald-500"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 1.2, delay: 2.2, ease: EASE }}
          />
        </div>

        {/* Paid stamp — sits in the empty gutter between item labels and amounts */}
        <div className="pointer-events-none absolute inset-x-0 top-[40%] flex justify-center" style={{ transform: 'translateZ(40px)' }}>
          <motion.div
            className="rounded-lg border-[3px] border-emerald-500 bg-white/70 dark:bg-slate-900/70 px-3 py-1 text-xl font-black uppercase tracking-widest text-emerald-500 backdrop-blur-[1px]"
            initial={{ opacity: 0, scale: 2.4, rotate: -24 }}
            animate={{ opacity: 1, scale: 1, rotate: -12 }}
            transition={{ type: 'spring', stiffness: 260, damping: 14, delay: 3.4 }}
          >
            Paid
          </motion.div>
        </div>
      </motion.div>

      {/* Floating chips */}
      <FloatingChip
        className="-left-6 sm:-left-16 -top-6"
        delay={1.1}
        bob={5}
        icon={<LuFileText size={16} />}
        iconClass="bg-indigo-500/15 text-indigo-600 dark:text-indigo-400"
      >
        QT-0018 <LuArrowRight size={12} className="inline" /> Invoice
      </FloatingChip>
      <FloatingChip
        className="-right-4 sm:-right-12 -bottom-6"
        delay={3.6}
        bob={6}
        icon={<LuCircleCheck size={16} />}
        iconClass="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
      >
        +{formatZar(TOTAL)} received
      </FloatingChip>
      <FloatingChip
        className="-left-4 sm:-left-10 -bottom-10"
        delay={4.2}
        bob={4}
        icon={<LuSend size={14} />}
        iconClass="bg-violet-500/15 text-violet-600 dark:text-violet-400"
      >
        Statement sent
      </FloatingChip>
    </div>
  );
}

function FloatingChip({
  children,
  className,
  delay,
  bob,
  icon,
  iconClass,
}: {
  children: ReactNode;
  className: string;
  delay: number;
  bob: number;
  icon: ReactNode;
  iconClass: string;
}) {
  return (
    <motion.div
      className={`absolute z-10 ${className}`}
      initial={{ opacity: 0, scale: 0.6, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 18, delay }}
    >
      <motion.div
        animate={{ y: [0, -bob, 0] }}
        transition={{ duration: 3 + bob / 3, repeat: Infinity, ease: 'easeInOut', delay: delay + 0.6 }}
        className="flex items-center gap-2 rounded-xl border border-slate-200/80 dark:border-slate-700/70 bg-white/95 dark:bg-slate-900/95 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-lg backdrop-blur"
      >
        <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${iconClass}`}>{icon}</span>
        <span className="whitespace-nowrap">{children}</span>
      </motion.div>
    </motion.div>
  );
}
