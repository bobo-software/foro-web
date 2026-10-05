import type { MouseEvent } from 'react';
import type { IconType } from 'react-icons';
import { motion, useMotionTemplate, useMotionValue, type Variants } from 'motion/react';
import { LuFileText, LuKanban, LuReceipt, LuTruck, LuUsers, LuWallet } from 'react-icons/lu';
import { Reveal, fadeUp, stagger } from './motionPrimitives';

const FEATURES: { icon: IconType; title: string; description: string }[] = [
  {
    icon: LuFileText,
    title: 'Quotes & Invoices',
    description: 'Create quotes, convert to invoices in one click. Download PDFs and track status.',
  },
  {
    icon: LuReceipt,
    title: 'Payments & Statements',
    description: 'Record payments by method—cash, EFT, card. Run statements with running balance.',
  },
  {
    icon: LuTruck,
    title: 'Purchasing & Suppliers',
    description: 'Raise purchase orders, receive stock and keep supplier bills in one ledger.',
  },
  {
    icon: LuWallet,
    title: 'Expenses',
    description: 'Log paid expenses—once-off or recurring—so your books reflect what actually left the account.',
  },
  {
    icon: LuKanban,
    title: 'Projects & Tasks',
    description: 'Manage work with list, kanban, and timeline views. Track time and budgets per project.',
  },
  {
    icon: LuUsers,
    title: 'Team & Portal',
    description: 'Invite team members with role-based access. Share project timelines with clients via portal.',
  },
];

const cardVariants: Variants = {
  ...fadeUp,
  hover: { y: -6, transition: { type: 'spring', stiffness: 300, damping: 20 } },
};

const iconVariants: Variants = {
  hover: { rotate: [0, -12, 10, 0], scale: 1.12, transition: { duration: 0.5 } },
};

export function FeaturesSection() {
  return (
    <section className="max-w-6xl mx-auto w-full mt-32 sm:mt-40">
      <Reveal className="text-center mb-14">
        <p className="text-sm font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-3">
          Everything in one place
        </p>
        <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
          Run the money side of your business
        </h2>
      </Reveal>

      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-80px' }}
        variants={stagger(0.08)}
      >
        {FEATURES.map((f) => (
          <SpotlightCard key={f.title} {...f} />
        ))}
      </motion.div>
    </section>
  );
}

/** Card with a soft radial glow that follows the cursor. */
function SpotlightCard({ icon: Icon, title, description }: (typeof FEATURES)[number]) {
  const mx = useMotionValue(-400);
  const my = useMotionValue(-400);
  const glow = useMotionTemplate`radial-gradient(280px circle at ${mx}px ${my}px, rgba(99,102,241,0.16), transparent 70%)`;

  function handleMove(e: MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    mx.set(e.clientX - rect.left);
    my.set(e.clientY - rect.top);
  }

  return (
    <motion.div
      variants={cardVariants}
      whileHover="hover"
      onMouseMove={handleMove}
      className="group relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-6 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 hover:border-indigo-200 dark:hover:border-indigo-900/60 transition-[box-shadow,border-color]"
    >
      <motion.div
        className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: glow }}
      />
      <motion.div
        variants={iconVariants}
        className="relative flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 mb-4"
      >
        <Icon size={24} strokeWidth={1.8} />
      </motion.div>
      <h3 className="relative text-lg font-semibold text-slate-900 dark:text-white mb-2">{title}</h3>
      <p className="relative text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{description}</p>
    </motion.div>
  );
}
