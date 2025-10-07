import { motion, type Variants } from 'motion/react';

export function HowItWorks() {
  const layers = [
    {
      name: 'Instant Replay',
      subtitle: 'Render Layer',
      description: 'Boot → Snapshot → DOM in 0ms',
      icon: '⚡',
      color: 'from-gray-900 to-gray-700 dark:from-gray-100 dark:to-gray-300',
    },
    {
      name: 'Local-First',
      subtitle: 'Data Layer',
      description: 'IndexedDB + In-memory cache',
      icon: '💾',
      color: 'from-gray-700 to-gray-500 dark:from-gray-300 dark:to-gray-500',
    },
    {
      name: 'Tx',
      subtitle: 'Execution Layer',
      description: 'Optimistic → Atomic rollback',
      icon: '🔄',
      color: 'from-gray-500 to-gray-400 dark:from-gray-500 dark:to-gray-600',
    },
  ];
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  };
  const item = {
    hidden: { opacity: 0, y: 30 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
    },
  } satisfies Variants;

  return (
    <section className="py-32 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-5xl mx-auto px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <h2 className="text-5xl font-bold mb-4 text-gray-900 dark:text-white">How It Works</h2>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Three layers working together for instant revisits
          </p>
        </motion.div>
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="space-y-6"
        >
          {layers.map((layer, index) => (
            <motion.div key={layer.name} variants={item} className="relative">
              <div className="flex items-start gap-6 p-8 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
                <div className="flex-shrink-0">
                  <div
                    className={`w-16 h-16 rounded-xl bg-gradient-to-br ${layer.color} flex items-center justify-center text-3xl`}
                  >
                    {layer.icon}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-baseline gap-3 mb-2">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {layer.name}
                    </h3>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {layer.subtitle}
                    </span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400">{layer.description}</p>
                </div>
                <div className="flex-shrink-0 text-2xl font-bold text-gray-300 dark:text-gray-700">
                  {index + 1}
                </div>
              </div>
              {index < layers.length - 1 && (
                <div className="absolute left-[2.5rem] top-full h-6 w-0.5 bg-gray-200 dark:bg-gray-700" />
              )}
            </motion.div>
          ))}
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="mt-16 text-center"
        >
          <div className="inline-flex items-center gap-3 px-6 py-3 bg-gray-100 dark:bg-gray-800 rounded-full border border-gray-200 dark:border-gray-700">
            <span className="text-sm text-gray-600 dark:text-gray-400">Data flows:</span>
            <code className="text-sm font-mono text-gray-900 dark:text-white">
              Boot → Handoff → Sync → Interact
            </code>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
