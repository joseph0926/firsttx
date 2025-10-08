import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';

type TimerStatus = 'idle' | 'loading' | 'loaded' | 'cached';

interface PerformanceTimerProps {
  approach: 'firsttx' | 'vanilla' | 'react-query' | 'loader';
  status: TimerStatus;
  onComplete?: (duration: number) => void;
}

export function PerformanceTimer({ approach, status, onComplete }: PerformanceTimerProps) {
  const [duration, setDuration] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const labels = {
    firsttx: 'FirstTx',
    vanilla: 'Vanilla',
    'react-query': 'React Query',
    loader: 'RR7 Loader',
  };
  const colors = {
    firsttx: 'bg-purple-500',
    vanilla: 'bg-gray-500',
    'react-query': 'bg-blue-500',
    loader: 'bg-green-500',
  };

  useEffect(() => {
    if (status === 'loading') {
      startTimeRef.current = performance.now();
      timerRef.current = setInterval(() => {
        if (startTimeRef.current) {
          setDuration(Math.floor(performance.now() - startTimeRef.current));
        }
      }, 50);
    } else if (status === 'loaded' && startTimeRef.current) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      const finalDuration = Math.floor(performance.now() - startTimeRef.current);
      setDuration(finalDuration);
      if (onComplete) {
        onComplete(finalDuration);
      }
      startTimeRef.current = null;
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [status, onComplete]);

  const getBadgeColor = () => {
    if (status === 'cached') return 'bg-green-500';
    if (status === 'loading') return 'bg-yellow-500';
    if (duration < 100) return 'bg-green-500';
    if (duration < 1000) return 'bg-blue-500';
    return 'bg-orange-500';
  };
  const getStatusText = () => {
    if (status === 'cached') return 'cached';
    if (status === 'loading') return 'loading...';
    return `${duration}ms`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm"
    >
      <div className={`w-2 h-2 rounded-full ${colors[approach]}`} />
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {labels[approach]}
      </span>
      <AnimatePresence mode="wait">
        <motion.div
          key={status}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.2 }}
          className={`px-2 py-1 rounded text-xs font-mono font-bold text-white ${getBadgeColor()}`}
        >
          {getStatusText()}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
