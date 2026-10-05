import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MotionConfig, motion, useMotionValueEvent, useScroll, useSpring, useTransform } from 'motion/react';
import { LuArrowRight, LuSparkles } from 'react-icons/lu';
import toast from 'react-hot-toast';
import useAuthStore from '../stores/data/AuthStore';
import { HeroMockup } from './landing/HeroMockup';
import { FeaturesSection } from './landing/FeaturesSection';
import { WorkflowSection } from './landing/WorkflowSection';
import { PricingSection } from './landing/PricingSection';
import { EASE, Reveal, RotatingWord } from './landing/motionPrimitives';

const MotionLink = motion.create(Link);

const HEADLINE = ['Invoicing', 'and', 'statements,'];
const ROTATING_WORDS = ['simplified', 'on autopilot', 'done right'];

export function Landing() {
  const navigate = useNavigate();
  const hasRedirected = useRef(false);
  useEffect(() => {
    if (hasRedirected.current) return;
    const { sessionUser, accessToken } = useAuthStore.getState();
    if (sessionUser?.accessToken || accessToken) {
      hasRedirected.current = true;
      toast.success('Session Restored');
      navigate('/app', { replace: true });
    }
  }, [navigate]);

  const { scrollY, scrollYProgress } = useScroll();
  const progressX = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 });
  const [scrolled, setScrolled] = useState(false);
  useMotionValueEvent(scrollY, 'change', (y) => setScrolled(y > 12));

  // Background blobs drift slower than the page for a light parallax.
  const blobY = useTransform(scrollY, [0, 800], [0, 160]);

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen flex flex-col bg-white dark:bg-slate-950 overflow-x-clip">
        {/* Scroll progress */}
        <motion.div
          className="fixed inset-x-0 top-0 z-50 h-0.5 origin-left bg-gradient-to-r from-indigo-500 via-violet-500 to-emerald-500"
          style={{ scaleX: progressX }}
        />

        {/* Background */}
        <div className="fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950" />
          <motion.div style={{ y: blobY }} className="absolute inset-0">
            <motion.div
              className="absolute -top-32 left-[10%] h-[28rem] w-[28rem] rounded-full bg-indigo-500/15 dark:bg-indigo-500/20 blur-3xl"
              animate={{ x: [0, 80, -40, 0], y: [0, 50, 20, 0], scale: [1, 1.15, 0.95, 1] }}
              transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              className="absolute top-20 right-[5%] h-[24rem] w-[24rem] rounded-full bg-violet-500/15 dark:bg-violet-500/20 blur-3xl"
              animate={{ x: [0, -60, 30, 0], y: [0, 30, -30, 0], scale: [1, 0.9, 1.1, 1] }}
              transition={{ duration: 24, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              className="absolute top-[28rem] left-1/3 h-[20rem] w-[20rem] rounded-full bg-emerald-400/10 dark:bg-emerald-500/10 blur-3xl"
              animate={{ x: [0, 50, -50, 0], y: [0, -40, 10, 0] }}
              transition={{ duration: 28, repeat: Infinity, ease: 'easeInOut' }}
            />
          </motion.div>
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#64748b0a_1px,transparent_1px),linear-gradient(to_bottom,#64748b0a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)] dark:opacity-30" />
        </div>

        {/* Nav */}
        <motion.header
          initial={{ y: -64, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, ease: EASE }}
          className={`sticky top-0 z-40 border-b backdrop-blur-md transition-colors duration-300 ${
            scrolled
              ? 'border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 shadow-sm'
              : 'border-transparent bg-transparent'
          }`}
        >
          <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2.5 text-slate-900 dark:text-white no-underline">
              <motion.img
                src="/favicon.png"
                alt=""
                className="h-9 w-9 rounded-lg object-contain"
                whileHover={{ rotate: -8, scale: 1.08 }}
              />
              <span className="text-xl font-bold tracking-tight">Foro</span>
            </Link>
            <nav className="flex items-center gap-2">
              <a
                href="#pricing"
                className="hidden sm:inline-flex px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 no-underline"
              >
                Pricing
              </a>
              <Link
                to="/login"
                className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 no-underline"
              >
                Log in
              </Link>
              <MotionLink
                to="/register"
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors no-underline shadow-sm shadow-indigo-500/25"
              >
                Get started
              </MotionLink>
            </nav>
          </div>
        </motion.header>

        <main className="flex-1 flex flex-col px-4 sm:px-6 pt-12 pb-24 sm:pt-20">
          {/* Hero */}
          <section className="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-10 items-center">
            <div className="text-center lg:text-left space-y-8">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1, ease: EASE }}
                className="inline-flex items-center gap-2 rounded-full border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/80 dark:bg-indigo-950/40 px-3 py-1 text-xs font-semibold text-indigo-700 dark:text-indigo-300"
              >
                <LuSparkles size={14} />
                Quotes, invoices, purchasing & statements
              </motion.div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 dark:text-white tracking-tight leading-[1.1]">
                <span className="sr-only">Invoicing and statements, simplified</span>
                <span aria-hidden>
                  {HEADLINE.map((word, i) => (
                    <motion.span
                      key={word}
                      className="inline-block mr-[0.25em]"
                      initial={{ opacity: 0, y: 30, filter: 'blur(10px)' }}
                      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                      transition={{ duration: 0.7, delay: 0.2 + i * 0.1, ease: EASE }}
                    >
                      {word}
                    </motion.span>
                  ))}
                  <br />
                  <motion.span
                    className="inline-block"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: 0.55, ease: EASE }}
                  >
                    <RotatingWord
                      words={ROTATING_WORDS}
                      className="bg-gradient-to-r from-indigo-600 via-violet-500 to-indigo-400 dark:from-indigo-400 dark:via-violet-400 dark:to-indigo-300 bg-clip-text text-transparent pb-1"
                    />
                  </motion.span>
                </span>
              </h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.7, ease: EASE }}
                className="text-lg sm:text-xl text-slate-600 dark:text-slate-400 max-w-xl mx-auto lg:mx-0 leading-relaxed"
              >
                Create quotes, turn them into invoices, record payments, and run company statements—all in one place.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.85, ease: EASE }}
                className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-2"
              >
                <MotionLink
                  to="/register"
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  className="group inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-8 py-4 text-base font-semibold text-white hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-500/30 no-underline"
                >
                  Start for free
                  <LuArrowRight className="transition-transform group-hover:translate-x-1" />
                </MotionLink>
                <motion.a
                  href="#pricing"
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  className="inline-flex items-center justify-center rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/50 backdrop-blur px-8 py-4 text-base font-semibold text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors no-underline"
                >
                  See pricing
                </motion.a>
              </motion.div>
            </div>

            <div className="px-8 pb-10 sm:px-12 lg:px-0">
              <HeroMockup />
            </div>
          </section>

          <FeaturesSection />
          <WorkflowSection />
          <PricingSection />

          {/* Closing CTA */}
          <Reveal className="max-w-6xl mx-auto w-full mt-32 sm:mt-40">
            <motion.div
              className="relative overflow-hidden rounded-3xl bg-[linear-gradient(120deg,#4f46e5,#7c3aed,#4338ca,#6366f1)] bg-[length:300%_300%] px-6 py-16 sm:px-16 text-center shadow-2xl shadow-indigo-500/30"
              animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
              transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.18),transparent_45%)]" />
              <h2 className="relative text-3xl sm:text-4xl font-bold text-white tracking-tight mb-4">
                Ready to get paid faster?
              </h2>
              <p className="relative text-lg text-indigo-100 max-w-xl mx-auto mb-8">
                Set up your business in minutes. Start free and upgrade as you grow.
              </p>
              <MotionLink
                to="/register"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
                className="group relative inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-base font-semibold text-indigo-600 shadow-lg hover:bg-indigo-50 transition-colors no-underline"
              >
                Create your account
                <LuArrowRight className="transition-transform group-hover:translate-x-1" />
              </MotionLink>
            </motion.div>
          </Reveal>
        </main>

        {/* Footer */}
        <footer className="relative z-10 border-t border-slate-200 dark:border-slate-800 py-6">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-sm text-slate-500 dark:text-slate-400">© {new Date().getFullYear()} Foro</span>
            <div className="flex items-center gap-6">
              <Link
                to="/login"
                className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 no-underline"
              >
                Log in
              </Link>
              <Link
                to="/register"
                className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 no-underline"
              >
                Register
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </MotionConfig>
  );
}
