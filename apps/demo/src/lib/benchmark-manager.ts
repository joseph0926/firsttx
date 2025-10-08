type ApproachType = 'firsttx' | 'vanilla' | 'react-query' | 'loader';

type BenchmarkResult = {
  approach: ApproachType;
  measurements: number[];
  average: number;
  lastUpdated: number;
};

type BenchmarkData = {
  [key in ApproachType]?: BenchmarkResult;
};

const STORAGE_KEY = 'firsttx-benchmark-results';

class BenchmarkManager {
  private data: BenchmarkData = {};
  constructor() {
    this.load();
  }
  private load() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.data = JSON.parse(stored);
      }
    } catch (err) {
      console.error('[Benchmark] Failed to load from localStorage:', err);
    }
  }
  private save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (err) {
      console.error('[Benchmark] Failed to save to localStorage:', err);
    }
  }
  private calculateAverage(measurements: number[]): number {
    if (measurements.length === 0) return 0;
    const sum = measurements.reduce((acc, val) => acc + val, 0);
    return Math.floor(sum / measurements.length);
  }
  record(approach: ApproachType, duration: number) {
    if (!this.data[approach]) {
      this.data[approach] = {
        approach,
        measurements: [duration],
        average: duration,
        lastUpdated: Date.now(),
      };
    } else {
      this.data[approach]!.measurements.push(duration);
      this.data[approach]!.average = this.calculateAverage(this.data[approach]!.measurements);
      this.data[approach]!.lastUpdated = Date.now();
    }
    this.save();
    console.log(`[Benchmark] ${approach}: ${duration}ms (avg: ${this.data[approach]!.average}ms)`);
  }
  getResult(approach: ApproachType): BenchmarkResult | null {
    return this.data[approach] || null;
  }
  getAllResults(): BenchmarkData {
    return { ...this.data };
  }
  reset(approach?: ApproachType) {
    if (approach) {
      delete this.data[approach];
    } else {
      this.data = {};
    }
    this.save();
    console.log('[Benchmark] Reset:', approach || 'all');
  }
}

export const benchmarkManager = new BenchmarkManager();

if (typeof window !== 'undefined') {
  interface WindowWithBenchmark {
    __benchmarkManager?: BenchmarkManager;
  }
  (window as WindowWithBenchmark).__benchmarkManager = benchmarkManager;
}
