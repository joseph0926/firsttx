import { motion } from 'motion/react';
import { Link } from 'react-router';

type Approach = {
  id: string;
  name: string;
  description: string;
  metrics: {
    coldStart: string;
    warmStart: string;
    requests: string;
  };
  tags: string[];
  color: string;
};

export function CompareApproaches() {
  const approaches: Approach[] = [
    {
      id: 'firsttx',
      name: 'FirstTx',
      description: 'Local-First with atomic transactions',
      metrics: {
        coldStart: '2134ms',
        warmStart: '0ms',
        requests: '0',
      },
      tags: ['Persistent', 'Atomic', 'Offline'],
      color: 'border-gray-900 dark:border-gray-100',
    },
    {
      id: 'react-query',
      name: 'React Query',
      description: 'Server state with memory cache',
      metrics: {
        coldStart: '2134ms',
        warmStart: '487ms',
        requests: '0',
      },
      tags: ['Memory Cache', 'Refetch', 'Optimistic'],
      color: 'border-blue-500',
    },
    {
      id: 'vanilla',
      name: 'Vanilla Fetch',
      description: 'Basic fetch without caching',
      metrics: {
        coldStart: '2134ms',
        warmStart: '2134ms',
        requests: '1',
      },
      tags: ['Simple', 'No Cache', 'Full Control'],
      color: 'border-gray-400',
    },
    {
      id: 'loader',
      name: 'RR7 Loader',
      description: 'Route-level data loading',
      metrics: {
        coldStart: '213ms',
        warmStart: '2134ms',
        requests: '1',
      },
      tags: ['SSR-like', 'Router', 'No Cache'],
      color: 'border-green-500',
    },
  ];
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };
  const item = {
    hidden: { opacity: 0, y: 20 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 },
    },
  };

  return (
    <section className="py-32 bg-white dark:bg-gray-950">
      <div className="max-w-6xl mx-auto px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <h2 className="text-5xl font-bold mb-4 text-gray-900 dark:text-white">
            Compare Approaches
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Same product catalog, different trade-offs
          </p>
        </motion.div>
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          {approaches.map((approach) => (
            <motion.div key={approach.id} variants={item}>
              <Link to={`/${approach.id}/products`}>
                <motion.div
                  whileHover={{ y: -4 }}
                  className={`p-8 bg-white dark:bg-gray-900 rounded-2xl border-2 ${approach.color} hover:shadow-xl transition-all cursor-pointer h-full flex flex-col`}
                >
                  <div className="mb-6">
                    <h3 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">
                      {approach.name}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">{approach.description}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="text-center">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                        Cold Start
                      </div>
                      <div className="text-lg font-mono font-bold text-gray-900 dark:text-white">
                        {approach.metrics.coldStart}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                        Warm Start
                      </div>
                      <div
                        className={`text-lg font-mono font-bold ${
                          approach.metrics.warmStart === '0ms'
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-gray-900 dark:text-white'
                        }`}
                      >
                        {approach.metrics.warmStart}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Requests</div>
                      <div className="text-lg font-mono font-bold text-gray-900 dark:text-white">
                        {approach.metrics.requests}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-auto">
                    {approach.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-800">
                    <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center justify-between">
                      <span>Try {approach.name}</span>
                      <span>→</span>
                    </div>
                  </div>
                </motion.div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
