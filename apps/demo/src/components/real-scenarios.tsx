import { motion } from 'motion/react';
import { useState } from 'react';

type Scenario = {
  id: string;
  title: string;
  description: string;
  icon: string;
  steps: string[];
  result: string;
};

export function RealScenarios() {
  const [activeScenario, setActiveScenario] = useState<string | null>(null);
  const scenarios: Scenario[] = [
    {
      id: 'week-later',
      title: 'A Week Later',
      description: 'User returns after 7 days',
      icon: '📅',
      steps: [
        'Monday: Added 3 items to cart',
        'Friday: Reopened the app',
        'FirstTx: Shows 3 items instantly',
        'Vanilla: Empty cart, start over',
      ],
      result: '0ms vs 2134ms + lost state',
    },
    {
      id: 'offline',
      title: 'Subway Shopping',
      description: 'Network disconnects mid-session',
      icon: '📱',
      steps: [
        'Browsing products on subway',
        'Tunnel entry: Network lost',
        'FirstTx: Continues working',
        'Vanilla: Error screen',
      ],
      result: 'Seamless vs broken experience',
    },
    {
      id: 'rollback',
      title: 'Server Rejects',
      description: 'Optimistic update fails',
      icon: '↩️',
      steps: [
        'User adds item to cart',
        'UI updates optimistically',
        'Server returns 500 error',
        'FirstTx: Smooth rollback with animation',
        'Vanilla: Partial state, confusing',
      ],
      result: 'Atomic consistency vs data mismatch',
    },
    {
      id: 'concurrent',
      title: 'Bulk Actions',
      description: 'Multiple simultaneous operations',
      icon: '⚡',
      steps: [
        'Add 3 items simultaneously',
        'One request fails',
        'FirstTx: All-or-nothing rollback',
        'Vanilla: 2 added, 1 missing',
      ],
      result: 'Transaction guarantee vs partial failure',
    },
  ];

  return (
    <section className="py-32 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <h2 className="text-5xl font-bold mb-4 text-gray-900 dark:text-white">
            Real World Scenarios
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Where the difference actually matters
          </p>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {scenarios.map((scenario, index) => (
            <motion.div
              key={scenario.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
            >
              <motion.button
                onClick={() =>
                  setActiveScenario(activeScenario === scenario.id ? null : scenario.id)
                }
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`w-full text-left p-8 rounded-2xl border-2 transition-all ${
                  activeScenario === scenario.id
                    ? 'bg-white dark:bg-gray-800 border-gray-900 dark:border-gray-100 shadow-xl'
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="text-4xl">{scenario.icon}</div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold mb-1 text-gray-900 dark:text-white">
                      {scenario.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">{scenario.description}</p>
                  </div>
                  <motion.div
                    animate={{ rotate: activeScenario === scenario.id ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                    className="text-gray-400"
                  >
                    ▼
                  </motion.div>
                </div>
                <motion.div
                  initial={false}
                  animate={{
                    height: activeScenario === scenario.id ? 'auto' : 0,
                    opacity: activeScenario === scenario.id ? 1 : 0,
                  }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
                    {scenario.steps.map((step, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300"
                      >
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xs font-medium">
                          {i + 1}
                        </span>
                        <span>{step}</span>
                      </div>
                    ))}
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        Result: {scenario.result}
                      </div>
                    </div>
                  </div>
                </motion.div>
              </motion.button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
