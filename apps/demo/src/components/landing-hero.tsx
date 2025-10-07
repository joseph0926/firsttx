import { motion, type Variants } from 'motion/react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';

export function LandingHero() {
  const router = useNavigate();

  const [count, setCount] = useState(2134);
  const [isAnimating, setIsAnimating] = useState(true);

  useEffect(() => {
    if (!isAnimating) return;

    const duration = 2000;
    const start = Date.now();
    const startValue = 2134;
    const endValue = 0;

    const timer = setInterval(() => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);

      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const current = Math.floor(startValue - (startValue - endValue) * easeOutQuart);

      setCount(current);

      if (progress === 1) {
        clearInterval(timer);
        setTimeout(() => setIsAnimating(false), 1000);
      }
    }, 16);

    return () => clearInterval(timer);
  }, [isAnimating]);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.3,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
    },
  } satisfies Variants;

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-950">
      <motion.div
        className="max-w-5xl mx-auto px-8 text-center"
        variants={container}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={item} className="mb-12">
          <div className="inline-flex items-center gap-8 px-8 py-4 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
            <div className="text-center">
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Traditional CSR</div>
              <div className="text-3xl font-mono font-bold text-gray-400 dark:text-gray-600">
                2134ms
              </div>
            </div>

            <div className="h-12 w-px bg-gray-300 dark:bg-gray-700" />

            <div className="text-center">
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">FirstTx</div>
              <motion.div
                className="text-3xl font-mono font-bold text-gray-900 dark:text-white"
                animate={{
                  scale: count === 0 ? [1, 1.1, 1] : 1,
                }}
                transition={{ duration: 0.3 }}
              >
                {count}ms
              </motion.div>
            </div>
          </div>
        </motion.div>
        <motion.h1
          variants={item}
          className="text-6xl md:text-7xl font-bold mb-6 text-gray-900 dark:text-white"
        >
          Make your CSR
          <br />
          <span className="text-gray-400 dark:text-gray-600">feel like SSR</span>
        </motion.h1>
        <motion.p
          variants={item}
          className="text-xl text-gray-600 dark:text-gray-400 mb-12 max-w-2xl mx-auto leading-relaxed"
        >
          Instant Replay on revisits. Atomic rollback on errors. Offline-ready persistence. No
          server required.
        </motion.p>
        <motion.div variants={item} className="flex gap-4 justify-center">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="px-8 py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-semibold text-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
            onClick={() => router('/demo')}
          >
            Try Live Demo →
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="px-8 py-4 border-2 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white rounded-xl font-semibold text-lg hover:border-gray-300 dark:hover:border-gray-700 transition-colors"
          >
            View on GitHub
          </motion.button>
        </motion.div>
        <motion.div variants={item} className="mt-20 grid grid-cols-3 gap-8 max-w-3xl mx-auto">
          <div className="text-center">
            <div className="text-4xl font-bold mb-2 text-gray-900 dark:text-white">0ms</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Revisit Time</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold mb-2 text-gray-900 dark:text-white">100%</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Atomic Rollback</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold mb-2 text-gray-900 dark:text-white">∞</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Offline Support</div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
