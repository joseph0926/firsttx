import { useState } from 'react';
import { GitBranch, CheckCircle2, XCircle, RotateCcw, Clock } from 'lucide-react';
import {
  ScenarioLayout,
  MetricsGrid,
  MetricCard,
  SectionHeader,
} from '../../components/scenario-layout';

interface Step {
  id: number;
  name: string;
  action: string;
  compensate: string;
  status: 'pending' | 'executing' | 'completed' | 'compensating' | 'compensated';
  executionTime?: number;
  compensationTime?: number;
}

export default function RollbackChain() {
  const [steps, setSteps] = useState<Step[]>([
    {
      id: 1,
      name: 'Add Item A',
      action: 'cart.items.push(itemA)',
      compensate: 'cart.items.pop()',
      status: 'pending',
    },
    {
      id: 2,
      name: 'Update Quantity',
      action: 'cart.items[0].qty = 5',
      compensate: 'cart.items[0].qty = 1',
      status: 'pending',
    },
    {
      id: 3,
      name: 'Apply Discount',
      action: 'cart.discount = 10%',
      compensate: 'cart.discount = 0',
      status: 'pending',
    },
    {
      id: 4,
      name: 'Update Shipping',
      action: 'cart.shipping = express',
      compensate: 'cart.shipping = standard',
      status: 'pending',
    },
    { id: 5, name: 'Checkout', action: 'POST /checkout', compensate: 'N/A', status: 'pending' },
  ]);

  const [failAtStep, setFailAtStep] = useState(3);
  const [rollbackTime, setRollbackTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<'success' | 'failed' | null>(null);

  const runTransaction = async () => {
    setIsRunning(true);
    setResult(null);
    resetSteps();

    for (let i = 0; i < steps.length; i++) {
      updateStep(steps[i].id, 'executing');
      await sleep(300);

      if (i + 1 === failAtStep) {
        updateStep(steps[i].id, 'pending', 150);
        await sleep(100);

        await performRollback(i);
        setResult('failed');
        setIsRunning(false);
        return;
      }

      updateStep(steps[i].id, 'completed', 150);
      await sleep(100);
    }

    setResult('success');
    setIsRunning(false);
  };

  const performRollback = async (failedAt: number) => {
    const startTime = performance.now();

    for (let i = failedAt - 1; i >= 0; i--) {
      updateStep(steps[i].id, 'compensating');
      await sleep(200);
      updateStep(steps[i].id, 'compensated', 100);
      await sleep(100);
    }

    const endTime = performance.now();
    setRollbackTime(endTime - startTime);
  };

  const updateStep = (id: number, status: Step['status'], time?: number) => {
    setSteps((prev) =>
      prev.map((step) => {
        if (step.id === id) {
          const update: Partial<Step> = { status };
          if (status === 'completed') update.executionTime = time;
          if (status === 'compensated') update.compensationTime = time;
          return { ...step, ...update };
        }
        return step;
      }),
    );
  };

  const resetSteps = () => {
    setSteps((prev) =>
      prev.map((step) => ({
        ...step,
        status: 'pending',
        executionTime: undefined,
        compensationTime: undefined,
      })),
    );
    setRollbackTime(0);
  };

  const completedSteps = steps.filter((s) => s.status === 'completed').length;
  const compensatedSteps = steps.filter((s) => s.status === 'compensated').length;

  return (
    <ScenarioLayout
      level={3}
      title="Rollback Chain"
      badge={{
        icon: <RotateCcw className="h-3 w-3" />,
        label: isRunning ? 'Running' : 'Ready',
      }}
    >
      <MetricsGrid>
        <MetricCard
          icon={<GitBranch className="h-5 w-5" />}
          label="Steps Completed"
          value={`${completedSteps}/${steps.length}`}
          target={`Failed at ${failAtStep}`}
          status={completedSteps === failAtStep - 1 ? 'good' : 'excellent'}
        />
        <MetricCard
          icon={<RotateCcw className="h-5 w-5" />}
          label="Rollback Time"
          value={rollbackTime > 0 ? `${rollbackTime.toFixed(0)}ms` : '--'}
          target="<100ms"
          status={
            rollbackTime === 0
              ? 'good'
              : rollbackTime < 100
                ? 'excellent'
                : rollbackTime < 200
                  ? 'good'
                  : 'poor'
          }
        />
        <MetricCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          label="Final State"
          value={result === 'failed' ? 'Restored' : result === 'success' ? 'Committed' : 'Pending'}
          target="Atomic"
          status={
            result === 'failed' && compensatedSteps === completedSteps
              ? 'excellent'
              : result === 'success'
                ? 'excellent'
                : 'good'
          }
        />
      </MetricsGrid>

      <SectionHeader
        title="Multi-Step Transaction Rollback"
        description="Watch a 5-step transaction fail and roll back in reverse order, restoring the original state."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="mb-4 text-lg font-semibold">Transaction Steps</h3>

            <div className="space-y-3">
              {steps.map((step, index) => (
                <StepCard key={step.id} step={step} index={index} />
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="mb-4 text-lg font-semibold">Test Configuration</h3>

            <div className="space-y-4">
              <div>
                <label className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Fail at Step</span>
                  <span className="font-medium terminal-text">Step {failAtStep}</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={failAtStep}
                  onChange={(e) => setFailAtStep(Number(e.target.value))}
                  className="w-full"
                  disabled={isRunning}
                />
                <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                  {steps.map((step, i) => (
                    <span key={step.id}>S{i + 1}</span>
                  ))}
                </div>
              </div>

              <button
                onClick={runTransaction}
                disabled={isRunning}
                className="w-full flex items-center justify-center gap-2 rounded bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                <GitBranch className={`h-4 w-4 ${isRunning ? 'animate-pulse' : ''}`} />
                {isRunning ? 'Running Transaction...' : 'Run Transaction'}
              </button>
            </div>
          </div>

          {result && (
            <div
              className={`rounded-lg border p-6 ${
                result === 'success'
                  ? 'border-green-500/50 bg-green-500/5'
                  : 'border-red-500/50 bg-red-500/5'
              }`}
            >
              <div className="flex items-center gap-3">
                {result === 'success' ? (
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                ) : (
                  <XCircle className="h-6 w-6 text-red-500" />
                )}
                <div>
                  <h4 className="font-semibold">
                    {result === 'success' ? 'Transaction Committed' : 'Transaction Rolled Back'}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {result === 'success'
                      ? 'All steps completed successfully'
                      : `Failed at step ${failAtStep}, rolled back ${compensatedSteps} step(s)`}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="mb-4 text-lg font-semibold">Rollback Sequence</h3>

            {compensatedSteps === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                Run a transaction to see rollback sequence
              </div>
            ) : (
              <div className="space-y-2">
                {steps
                  .filter((s) => s.status === 'compensated')
                  .reverse()
                  .map((step, index) => (
                    <div
                      key={step.id}
                      className="rounded-lg border border-red-500/50 bg-red-500/5 p-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                            {index + 1}
                          </span>
                          <span className="font-medium text-sm">{step.name}</span>
                        </div>
                        <RotateCcw className="h-4 w-4 text-red-500" />
                      </div>
                      <div className="text-xs text-muted-foreground terminal-text pl-8">
                        {step.compensate}
                      </div>
                      {step.compensationTime && (
                        <div className="text-xs text-muted-foreground terminal-text pl-8 mt-1">
                          {step.compensationTime}ms
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>

          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="mb-4 text-lg font-semibold">Rollback Rules</h3>
            <div className="space-y-3 text-sm">
              <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-green-500" />
                <div>
                  <div className="font-medium">Reverse Order (LIFO)</div>
                  <div className="text-muted-foreground">
                    Compensate in reverse: Step 2 → Step 1
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-green-500" />
                <div>
                  <div className="font-medium">Skip Failed Step</div>
                  <div className="text-muted-foreground">
                    Step that failed doesn't need compensation
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-green-500" />
                <div>
                  <div className="font-medium">Skip Pending Steps</div>
                  <div className="text-muted-foreground">
                    Steps after failure are never executed
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-green-500" />
                <div>
                  <div className="font-medium">ViewTransition Wrapped</div>
                  <div className="text-muted-foreground">Smooth animation during rollback</div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="mb-4 text-lg font-semibold">Expected Behavior</h3>
            <div className="space-y-2 text-sm">
              <div className="rounded bg-muted/50 p-3">
                <div className="font-medium mb-1">If Step 3 fails:</div>
                <div className="text-muted-foreground terminal-text text-xs">
                  Compensate Step 2 → Compensate Step 1
                </div>
              </div>
              <div className="rounded bg-muted/50 p-3">
                <div className="font-medium mb-1">If Step 1 fails:</div>
                <div className="text-muted-foreground terminal-text text-xs">
                  No compensation needed (nothing to undo)
                </div>
              </div>
              <div className="rounded bg-muted/50 p-3">
                <div className="font-medium mb-1">If Step 5 succeeds:</div>
                <div className="text-muted-foreground terminal-text text-xs">
                  All changes committed (no rollback)
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ScenarioLayout>
  );
}

function StepCard({ step, index }: { step: Step; index: number }) {
  const statusConfig = {
    pending: {
      bg: 'bg-muted/50',
      border: 'border-border',
      icon: Clock,
      iconColor: 'text-muted-foreground',
    },
    executing: {
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/50',
      icon: GitBranch,
      iconColor: 'text-yellow-500',
    },
    completed: {
      bg: 'bg-green-500/10',
      border: 'border-green-500/50',
      icon: CheckCircle2,
      iconColor: 'text-green-500',
    },
    compensating: {
      bg: 'bg-red-500/10',
      border: 'border-red-500/50',
      icon: RotateCcw,
      iconColor: 'text-red-500',
    },
    compensated: {
      bg: 'bg-red-500/10',
      border: 'border-red-500/50',
      icon: RotateCcw,
      iconColor: 'text-red-500',
    },
  };

  const config = statusConfig[step.status];
  const Icon = config.icon;

  return (
    <div className={`rounded-lg border p-4 ${config.bg} ${config.border}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
            {index + 1}
          </span>
          <span className="font-medium text-sm">{step.name}</span>
        </div>
        <Icon className={`h-4 w-4 ${config.iconColor}`} />
      </div>
      <div className="text-xs text-muted-foreground terminal-text pl-8">{step.action}</div>
      {step.executionTime && (
        <div className="text-xs text-green-500 terminal-text pl-8 mt-1">
          Executed in {step.executionTime}ms
        </div>
      )}
      {step.compensationTime && (
        <div className="text-xs text-red-500 terminal-text pl-8 mt-1">
          Compensated in {step.compensationTime}ms
        </div>
      )}
    </div>
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
