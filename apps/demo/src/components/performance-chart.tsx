import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { motion } from 'motion/react';

type ApproachData = {
  name: string;
  average: number;
  color: string;
  samples: number;
};

interface PerformanceChartProps {
  data: ApproachData[];
}

export function PerformanceChart({ data }: PerformanceChartProps) {
  const maxValue = Math.max(...data.map((d) => d.average));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-xl">
          <p className="font-bold text-gray-900 dark:text-white mb-2">{data.name}</p>
          <div className="space-y-1 text-sm">
            <p className="text-gray-600 dark:text-gray-400">
              Average:{' '}
              <span className="font-mono font-bold text-gray-900 dark:text-white">
                {data.average}ms
              </span>
            </p>
            <p className="text-gray-600 dark:text-gray-400">
              Samples:{' '}
              <span className="font-medium text-gray-900 dark:text-white">{data.samples}</span>
            </p>
            {data.average < 100 && (
              <p className="text-green-600 dark:text-green-400 font-medium mt-2">⚡ Instant load</p>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-8"
    >
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Performance Comparison
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Average load time across all measurements (lower is better)
        </p>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
          <XAxis
            dataKey="name"
            tick={{ fill: '#6B7280', fontSize: 14 }}
            angle={-45}
            textAnchor="end"
            height={100}
          />
          <YAxis
            tick={{ fill: '#6B7280', fontSize: 14 }}
            label={{
              value: 'Load Time (ms)',
              angle: -90,
              position: 'insideLeft',
              style: { fill: '#6B7280', fontSize: 14 },
            }}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }} />
          <Bar dataKey="average" radius={[8, 8, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        {data.map((approach) => {
          const speedup = approach.average > 0 ? (maxValue / approach.average).toFixed(1) : 'N/A';
          return (
            <div
              key={approach.name}
              className="p-4 rounded-lg border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: approach.color }} />
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {approach.name}
                </span>
              </div>
              <div className="text-2xl font-mono font-bold text-gray-900 dark:text-white mb-1">
                {approach.average}ms
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                {speedup !== 'N/A' && speedup !== '1.0' ? `${speedup}× slower` : 'Baseline'}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <p className="text-sm text-blue-800 dark:text-blue-300">
          💡 <strong>Key Insight:</strong> FirstTx and React Query leverage caching for instant
          revisits, while Vanilla and Loader fetch fresh data on every load.
        </p>
      </div>
    </motion.div>
  );
}
