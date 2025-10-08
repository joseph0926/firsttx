import { motion } from 'motion/react';
import { Link } from 'react-router';
import { TimeSeriesChart } from '@/components/time-series-chart';

type Approach = {
  id: 'firsttx' | 'vanilla' | 'react-query' | 'loader';
  name: string;
  description: string;
  metrics: {
    coldStart: string;
    warmStart: string;
    requests: string;
  };
  tags: string[];
  bestFor: string;
};

export function ComparisonDashboard() {
  const approaches: Approach[] = [
    {
      id: 'firsttx',
      name: 'FirstTx',
      description: 'Local-First with atomic transactions',
      metrics: { coldStart: '37ms', requests: '3', warmStart: '37ms' },
      tags: ['Persistent', 'Atomic', 'Offline'],
      bestFor: 'Apps with frequent revisits and complex state',
    },
    {
      id: 'react-query',
      name: 'React Query',
      description: 'Server state with memory cache',
      metrics: { coldStart: '67ms', requests: '3', warmStart: '67ms' },
      tags: ['Memory Cache', 'Refetch', 'Optimistic'],
      bestFor: 'Most modern React apps with server data',
    },
    {
      id: 'vanilla',
      name: 'Vanilla Fetch',
      description: 'Basic fetch without caching',
      metrics: { coldStart: '2105ms', requests: '3', warmStart: '2105ms' },
      tags: ['Simple', 'No Cache', 'Full Control'],
      bestFor: 'Simple apps or learning purposes',
    },
    {
      id: 'loader',
      name: 'RR7 Loader',
      description: 'Route-level data loading',
      metrics: { coldStart: '2002ms', requests: '3', warmStart: '2002ms' },
      tags: ['SSR-like', 'Router', 'No Cache'],
      bestFor: 'SSR/SSG apps or route-specific data',
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
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <div className="max-w-6xl mx-auto px-8 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h1 className="text-5xl md:text-6xl font-bold mb-4 text-gray-900 dark:text-white">
            Choose Your Approach
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Same product catalog, different trade-offs. See how each approach handles data fetching
            and state management.
          </p>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          {approaches.map((approach) => (
            <motion.div key={approach.id} variants={item}>
              <Link to={`/demo/${approach.id}/products`}>
                <motion.div
                  whileHover={{ y: -4 }}
                  className={`p-8 bg-white dark:bg-gray-900 rounded-2xl border-2 transition-all cursor-pointer h-full flex flex-col ${
                    approach.id === 'firsttx'
                      ? 'border-gray-900 dark:border-gray-100'
                      : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                  } hover:shadow-xl`}
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
                        Average Load Time
                      </div>
                      <div className="text-lg font-mono font-bold text-gray-900 dark:text-white">
                        {approach.metrics.coldStart}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Requests</div>
                      <div className="text-lg font-mono font-bold text-gray-900 dark:text-white">
                        {approach.metrics.requests}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-6">
                    {approach.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="mt-auto pt-6 border-t border-gray-200 dark:border-gray-800">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      {approach.bestFor}
                    </p>
                    <div className="flex items-center justify-between text-sm font-medium text-gray-900 dark:text-white">
                      <span>Try {approach.name}</span>
                      <span>→</span>
                    </div>
                  </div>
                </motion.div>
              </Link>
            </motion.div>
          ))}
        </motion.div>

        <div className="mb-16">
          <TimeSeriesChart />
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="mt-16 text-center"
        >
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            All approaches use the same mock API with 2-second network delay
          </p>
          <div className="inline-flex items-center gap-3 px-6 py-3 bg-gray-50 dark:bg-gray-900 rounded-full border border-gray-200 dark:border-gray-800">
            <span className="text-sm text-gray-600 dark:text-gray-400">Key difference:</span>
            <code className="text-sm font-mono text-gray-900 dark:text-white">
              Revisit performance
            </code>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
