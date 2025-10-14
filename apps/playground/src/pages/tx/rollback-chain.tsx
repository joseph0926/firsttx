import { useState } from 'react';
import { GitBranch, CheckCircle2, XCircle, RotateCcw, Clock } from 'lucide-react';
import {
  ScenarioLayout,
  MetricsGrid,
  MetricCard,
  SectionHeader,
} from '../../components/scenario-layout';
import { useSyncedModel } from '@firsttx/local-first';
import { startTransaction } from '@firsttx/tx';
import { OrderModel } from '@/models/order.model';
import {
  validateInventory,
  reserveItems,
  processPayment,
  refundPayment,
  scheduleShipping,
  cancelShipment,
  sendNotification,
  fetchOrder,
  setForceFailStep,
} from '@/api/order.api';
import { sleep } from '@/lib/utils';

interface Step {
  id: number;
  name: string;
  action: string;
  compensate: string;
  status: 'pending' | 'executing' | 'completed' | 'failed' | 'compensating' | 'compensated';
  executionTime?: number;
  compensationTime?: number;
}

export default function RollbackChain() {
  const { data: order, patch } = useSyncedModel(OrderModel, fetchOrder);

  const [steps, setSteps] = useState<Step[]>([
    {
      id: 1,
      name: 'Validate Inventory',
      action: 'Check stock availability',
      compensate: 'Release validation lock',
      status: 'pending',
    },
    {
      id: 2,
      name: 'Reserve Items',
      action: 'Reserve 3 units',
      compensate: 'Cancel reservation',
      status: 'pending',
    },
    {
      id: 3,
      name: 'Process Payment',
      action: 'Charge $1,358.98',
      compensate: 'Refund payment',
      status: 'pending',
    },
    {
      id: 4,
      name: 'Schedule Shipping',
      action: 'Book express delivery',
      compensate: 'Cancel shipment',
      status: 'pending',
    },
    {
      id: 5,
      name: 'Send Notification',
      action: 'Email confirmation',
      compensate: 'Send cancellation email',
      status: 'pending',
    },
  ]);

  const [failAtStep, setFailAtStep] = useState(4);
  const [rollbackTime, setRollbackTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<'success' | 'failed' | null>(null);

  const runTransaction = async () => {
    if (!order) return;

    setIsRunning(true);
    setResult(null);
    resetSteps();
    setForceFailStep(failAtStep);

    const tx = startTransaction({ transition: true });
    let chargeId = '';
    let shipmentId = '';
    let currentStep = 0;

    try {
      currentStep = 1;
      await tx.run(async () => {
        updateStep(1, 'executing');
        await validateInventory();
        updateStep(1, 'completed', 150);
        await sleep(100);
      });

      currentStep = 2;
      await tx.run(
        async () => {
          updateStep(2, 'executing');
          await reserveItems();
          await patch((draft) => {
            draft.status = 'processing';
          });
          updateStep(2, 'completed', 150);
          await sleep(100);
        },
        {
          compensate: async () => {
            updateStep(2, 'compensating');
            await patch((draft) => {
              draft.status = 'pending';
            });
            updateStep(2, 'compensated', 100);
            await sleep(80);
          },
        },
      );

      currentStep = 3;
      await tx.run(
        async () => {
          updateStep(3, 'executing');
          chargeId = await processPayment();
          updateStep(3, 'completed', 150);
          await sleep(100);
        },
        {
          compensate: async () => {
            updateStep(3, 'compensating');
            await refundPayment(chargeId);
            updateStep(3, 'compensated', 100);
            await sleep(80);
          },
        },
      );

      currentStep = 4;
      await tx.run(
        async () => {
          updateStep(4, 'executing');
          shipmentId = await scheduleShipping();
          await patch((draft) => {
            draft.shipping = 'express';
          });
          updateStep(4, 'completed', 150);
          await sleep(100);
        },
        {
          compensate: async () => {
            updateStep(4, 'compensating');
            if (shipmentId) {
              await cancelShipment(shipmentId);
            }
            await patch((draft) => {
              draft.shipping = 'standard';
            });
            updateStep(4, 'compensated', 100);
            await sleep(80);
          },
        },
      );

      currentStep = 5;
      await tx.run(async () => {
        updateStep(5, 'executing');
        await sendNotification();
        updateStep(5, 'completed', 150);
        await sleep(100);
      });

      await tx.commit();
      await patch((draft) => {
        draft.status = 'completed';
      });
      setResult('success');
    } catch (error) {
      console.warn(error);
      updateStep(currentStep, 'failed', 150);

      const startTime = performance.now();
      await sleep(200);
      const endTime = performance.now();
      setRollbackTime(endTime - startTime);

      await patch((draft) => {
        draft.status = 'failed';
      });
      setResult('failed');
    } finally {
      setForceFailStep(null);
      setIsRunning(false);
    }
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
          target={`Fail at Step ${failAtStep}`}
          status={completedSteps === failAtStep - 1 ? 'good' : 'excellent'}
        />
        <MetricCard
          icon={<Clock className="h-5 w-5" />}
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
                  {steps.map((_, i) => (
                    <span key={i}>S{i + 1}</span>
                  ))}
                </div>
              </div>

              <button
                onClick={runTransaction}
                disabled={isRunning || !order}
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
                    Compensate in reverse: Step 3 → Step 2 → Step 1
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
                  <div className="text-muted-foreground">
                    Smooth animations during state changes
                  </div>
                </div>
              </div>
            </div>
          </div>

          {order && (
            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="mb-4 text-lg font-semibold">Order State</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <span className="font-medium">{order.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Items:</span>
                  <span className="font-medium">{order.items.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total:</span>
                  <span className="font-medium">${order.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping:</span>
                  <span className="font-medium">{order.shipping}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </ScenarioLayout>
  );
}

function StepCard({ step, index }: { step: Step; index: number }) {
  const statusConfig = {
    pending: { bg: 'bg-muted/50', text: 'text-muted-foreground', icon: null },
    executing: {
      bg: 'bg-blue-500/10',
      text: 'text-blue-500',
      icon: <Clock className="h-4 w-4 animate-spin" />,
    },
    completed: {
      bg: 'bg-green-500/10',
      text: 'text-green-500',
      icon: <CheckCircle2 className="h-4 w-4" />,
    },
    failed: { bg: 'bg-red-500/10', text: 'text-red-500', icon: <XCircle className="h-4 w-4" /> },
    compensating: {
      bg: 'bg-yellow-500/10',
      text: 'text-yellow-500',
      icon: <RotateCcw className="h-4 w-4 animate-spin" />,
    },
    compensated: {
      bg: 'bg-red-500/10',
      text: 'text-red-500',
      icon: <RotateCcw className="h-4 w-4" />,
    },
  };

  const config = statusConfig[step.status];

  return (
    <div className={`rounded-lg border border-border ${config.bg} p-4`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-bold">
            {index + 1}
          </span>
          <span className="font-medium text-sm">{step.name}</span>
        </div>
        {config.icon && <div className={config.text}>{config.icon}</div>}
      </div>
      <div className="text-xs text-muted-foreground terminal-text pl-8">{step.action}</div>
      {step.executionTime && (
        <div className="text-xs text-muted-foreground terminal-text pl-8 mt-1">
          {step.executionTime}ms
        </div>
      )}
    </div>
  );
}
