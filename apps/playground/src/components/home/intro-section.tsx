import { RefreshCw, Shield, Zap } from 'lucide-react';

export function IntroSection() {
  return (
    <section className="mb-12 rounded-lg border border-border bg-card/50 p-6">
      <h2 className="mb-4 text-xl font-bold">What is FirstTx?</h2>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded bg-background/50 p-4">
          <div className="mb-2 flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            <h3 className="font-semibold">Prepaint</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Instantly restore previous DOM on revisit for{' '}
            <strong className="text-foreground">0ms blank screen</strong>.
          </p>
        </div>
        <div className="rounded bg-background/50 p-4">
          <div className="mb-2 flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-blue-500" />
            <h3 className="font-semibold">Local-First</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Cache data in IndexedDB with TTL-based{' '}
            <strong className="text-foreground">automatic sync</strong>.
          </p>
        </div>
        <div className="rounded bg-background/50 p-4">
          <div className="mb-2 flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-500" />
            <h3 className="font-semibold">Tx (Transaction)</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Optimistic updates with <strong className="text-foreground">automatic rollback</strong>{' '}
            on failure.
          </p>
        </div>
      </div>
      <p className="mt-4 text-sm text-muted-foreground">
        Explore the 9 scenarios below to experience each feature in action.
      </p>
    </section>
  );
}
