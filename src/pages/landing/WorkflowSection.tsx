import { useRef } from 'react';
import { motion, useScroll, useSpring } from 'motion/react';
import { LuFileCheck, LuFileText, LuScrollText, LuWallet } from 'react-icons/lu';
import { Reveal, fadeUp, stagger } from './motionPrimitives';

const STEPS = [
  { icon: LuFileText, title: 'Quote', description: 'Price the job and send a branded PDF.' },
  { icon: LuFileCheck, title: 'Invoice', description: 'Accepted? Convert it in one click.' },
  { icon: LuWallet, title: 'Payment', description: 'Record cash, EFT or card against it.' },
  { icon: LuScrollText, title: 'Statement', description: 'Clients see a running balance, always current.' },
];

/** Quote → Invoice → Payment → Statement, with a connector line that draws as you scroll. */
export function WorkflowSection() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 85%', 'end 55%'] });
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });

  return (
    <section className="max-w-6xl mx-auto w-full mt-32 sm:mt-40">
      <Reveal className="text-center mb-14">
        <p className="text-sm font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-3">
          How it flows
        </p>
        <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
          From first quote to final statement
        </h2>
      </Reveal>

      <div ref={ref} className="relative">
        {/* Connector tracks (horizontal on desktop, vertical on mobile) */}
        <div className="hidden lg:block absolute left-[12.5%] right-[12.5%] top-8 h-0.5 bg-slate-200 dark:bg-slate-800">
          <motion.div
            className="h-full origin-left bg-gradient-to-r from-indigo-500 via-violet-500 to-emerald-500"
            style={{ scaleX: progress }}
          />
        </div>
        <div className="lg:hidden absolute left-8 top-8 bottom-8 w-0.5 bg-slate-200 dark:bg-slate-800">
          <motion.div
            className="w-full h-full origin-top bg-gradient-to-b from-indigo-500 via-violet-500 to-emerald-500"
            style={{ scaleY: progress }}
          />
        </div>

        <motion.ol
          className="relative grid grid-cols-1 lg:grid-cols-4 gap-10 lg:gap-6"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-120px' }}
          variants={stagger(0.18)}
        >
          {STEPS.map(({ icon: Icon, title, description }, i) => (
            <motion.li
              key={title}
              variants={fadeUp}
              className="flex lg:flex-col items-start lg:items-center gap-5 lg:gap-4 lg:text-center"
            >
              <motion.div
                whileHover={{ scale: 1.1, rotate: -4 }}
                className="relative z-10 flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-md"
              >
                <Icon size={26} strokeWidth={1.8} />
                <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-bold text-white ring-4 ring-white dark:ring-slate-950">
                  {i + 1}
                </span>
              </motion.div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">{title}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed lg:max-w-[14rem]">
                  {description}
                </p>
              </div>
            </motion.li>
          ))}
        </motion.ol>
      </div>
    </section>
  );
}
