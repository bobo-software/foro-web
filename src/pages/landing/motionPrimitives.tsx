import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, animate, motion, useInView, type Variants } from 'motion/react';

/** Shared "ease-out-expo"-ish curve used across the landing page. */
export const EASE = [0.22, 1, 0.36, 1] as const;

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

export function stagger(staggerChildren = 0.08, delayChildren = 0): Variants {
  return {
    hidden: {},
    show: { transition: { staggerChildren, delayChildren } },
  };
}

/** Fades + lifts its children in the first time they scroll into view. */
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Cycles through `words` with a blur/slide transition. Every word is rendered
 * invisibly in the same grid cell so the box is always as wide as the longest
 * word — the surrounding text never reflows mid-animation.
 */
export function RotatingWord({
  words,
  interval = 2600,
  className = '',
}: {
  words: string[];
  interval?: number;
  className?: string;
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIndex((n) => (n + 1) % words.length), interval);
    return () => clearInterval(id);
  }, [words.length, interval]);

  return (
    <span className="inline-grid justify-items-center lg:justify-items-start">
      {words.map((w) => (
        <span key={w} aria-hidden className="invisible [grid-area:1/1]">
          {w}
        </span>
      ))}
      <AnimatePresence initial={false}>
        <motion.span
          key={words[index]}
          className={`[grid-area:1/1] ${className}`}
          initial={{ y: '0.5em', opacity: 0, filter: 'blur(8px)' }}
          animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
          exit={{ y: '-0.5em', opacity: 0, filter: 'blur(8px)' }}
          transition={{ duration: 0.5, ease: EASE }}
        >
          {words[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/** Counts from 0 to `to` once visible, formatting each frame with `format`. */
export function CountUp({
  to,
  format,
  delay = 0,
  duration = 1.4,
}: {
  to: number;
  format: (value: number) => string;
  delay?: number;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, to, {
      duration,
      delay,
      ease: 'easeOut',
      onUpdate: (v) => {
        if (ref.current) ref.current.textContent = format(v);
      },
    });
    return () => controls.stop();
  }, [inView, to, delay, duration, format]);

  return <span ref={ref}>{format(0)}</span>;
}
