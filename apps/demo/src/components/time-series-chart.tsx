import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { motion } from 'motion/react';

const mockPerformanceData = {
  firsttx: [2134, 0, 0, 0, 0, 42, 0, 0, 0, 0],
  reactQuery: [2105, 71, 65, 69, 70, 68, 72, 66, 70, 67],
  vanilla: [2105, 2098, 2112, 2089, 2107, 2095, 2110, 2102, 2099, 2108],
  loader: [2002, 1998, 2008, 1995, 2005, 2001, 2010, 1999, 2003, 2007],
};

type TooltipPayload = {
  name: string;
  value: number;
  color: string;
};

type CustomTooltipProps = {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
};

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-xl">
        <p className="font-bold text-gray-900 dark:text-white mb-2">{label} visit</p>
        <div className="space-y-1">
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-gray-600 dark:text-gray-400">{entry.name}:</span>
              <span className="font-mono font-bold text-gray-900 dark:text-white">
                {entry.value}ms
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export function TimeSeriesChart() {
  const cachedData = mockPerformanceData.firsttx.map((value, index) => ({
    visit: `${index + 1}${index === 0 ? 'st' : index === 1 ? 'nd' : index === 2 ? 'rd' : 'th'}`,
    FirstTx: value,
    'React Query': mockPerformanceData.reactQuery[index],
  }));

  const uncachedData = mockPerformanceData.vanilla.map((value, index) => ({
    visit: `${index + 1}${index === 0 ? 'st' : index === 1 ? 'nd' : index === 2 ? 'rd' : 'th'}`,
    Vanilla: value,
    Loader: mockPerformanceData.loader[index],
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.3 }}
      className="space-y-8"
    >
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-8">
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Performance Over Time
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Load time measurements across multiple visits
          </p>
        </div>

        <div className="space-y-8">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Caching Strategies (0-2500ms)
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={cachedData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                <XAxis dataKey="visit" tick={{ fill: '#6B7280', fontSize: 12 }} stroke="#6B7280" />
                <YAxis
                  tick={{ fill: '#6B7280', fontSize: 12 }}
                  stroke="#6B7280"
                  label={{
                    value: 'Load Time (ms)',
                    angle: -90,
                    position: 'insideLeft',
                    style: { fill: '#6B7280', fontSize: 12 },
                  }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="line" />
                <Line
                  type="monotone"
                  dataKey="FirstTx"
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={{ fill: '#10b981', r: 5 }}
                  activeDot={{ r: 7 }}
                />
                <Line
                  type="monotone"
                  dataKey="React Query"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={{ fill: '#3b82f6', r: 5 }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
            <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <p className="text-sm text-green-800 dark:text-green-300">
                💡 <strong>Key Insight:</strong> FirstTx shows dramatic improvement after initial
                visits (2134ms → 0ms), demonstrating the power of IndexedDB persistence. React Query
                maintains consistent fast performance through memory caching.
              </p>
            </div>
          </div>

          <div className="pt-8 border-t border-gray-200 dark:border-gray-800">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Non-Caching Strategies (1900-2200ms)
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={uncachedData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                <XAxis dataKey="visit" tick={{ fill: '#6B7280', fontSize: 12 }} stroke="#6B7280" />
                <YAxis
                  domain={[1900, 2200]}
                  tick={{ fill: '#6B7280', fontSize: 12 }}
                  stroke="#6B7280"
                  label={{
                    value: 'Load Time (ms)',
                    angle: -90,
                    position: 'insideLeft',
                    style: { fill: '#6B7280', fontSize: 12 },
                  }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="line" />
                <Line
                  type="monotone"
                  dataKey="Vanilla"
                  stroke="#6b7280"
                  strokeWidth={3}
                  dot={{ fill: '#6b7280', r: 5 }}
                  activeDot={{ r: 7 }}
                />
                <Line
                  type="monotone"
                  dataKey="Loader"
                  stroke="#f59e0b"
                  strokeWidth={3}
                  dot={{ fill: '#f59e0b', r: 5 }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
            <div className="mt-4 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
              <p className="text-sm text-orange-800 dark:text-orange-300">
                💡 <strong>Key Insight:</strong> Without caching, both Vanilla and Loader maintain
                consistent but slow performance (~2000ms) across all visits, with minor network
                fluctuations.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">FirstTx</span>
            </div>
            <div className="text-2xl font-mono font-bold text-gray-900 dark:text-white mb-1">
              0ms
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">After initial visits</div>
          </div>

          <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">React Query</span>
            </div>
            <div className="text-2xl font-mono font-bold text-gray-900 dark:text-white mb-1">
              ~68ms
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Consistent memory cache</div>
          </div>

          <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full bg-gray-500" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">Vanilla</span>
            </div>
            <div className="text-2xl font-mono font-bold text-gray-900 dark:text-white mb-1">
              ~2105ms
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">No caching</div>
          </div>

          <div className="p-4 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full bg-orange-500" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">Loader</span>
            </div>
            <div className="text-2xl font-mono font-bold text-gray-900 dark:text-white mb-1">
              ~2002ms
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">SSR-like pattern</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
