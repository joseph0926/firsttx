import { useEffect, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, Clock, RotateCcw, Zap } from 'lucide-react';
import { DemoLayout, MetricsGrid, MetricCard, SectionHeader } from '@/components/demo';
import { RetryExhaustedError, startTransaction } from '@firsttx/tx';
import {
  TIMING_INITIAL_CART,
  TIMING_SERVER_CART,
  TimingCartModel,
  replaceTimingCartFixture,
  subscribeToTimingCart,
  type TimingCart,
  type TimingCartResetOperation,
} from '@/models/timing-cart.model';
import { getDemoById, getRelatedDemos } from '@/data/learning-paths';

const demoMeta = getDemoById('timing')!;
const relatedDemos = getRelatedDemos('timing', 2);
const TARGET_ITEM_ID = '1';
const EXPECTED_FIXTURE_FAILURE = 'Deterministic fixture failure';

type Interleaving = 'before-rollback' | 'during-rollback' | 'after-rollback';
type TimelineEventType = 'tx-start' | 'tx-step' | 'server-sync' | 'tx-rollback';

interface TimelineEvent {
  label: string;
  type: TimelineEventType;
  status: 'pending' | 'success' | 'error';
}

interface FixtureFailureDetails {
  errorType: string;
  stepId: string;
  attempts: number;
  cause: string;
}

const interleavings: Record<Interleaving, { label: string; expectedQuantity: number }> = {
  'before-rollback': { label: 'Replace before rollback', expectedQuantity: 4 },
  'during-rollback': { label: 'Replace during rollback', expectedQuantity: 4 },
  'after-rollback': { label: 'Replace after rollback', expectedQuantity: 5 },
};

function createDeferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}

function targetQuantity(cart: TimingCart | null) {
  return cart?.items.find((item) => item.id === TARGET_ITEM_ID)?.quantity ?? 0;
}

function getExpectedFixtureFailure(error: unknown): FixtureFailureDetails | null {
  if (
    !(error instanceof RetryExhaustedError) ||
    error.stepId !== 'step-1' ||
    error.attempts !== 1 ||
    error.errors.length !== 1 ||
    error.errors[0]?.message !== EXPECTED_FIXTURE_FAILURE
  ) {
    return null;
  }

  return {
    errorType: error.name,
    stepId: error.stepId,
    attempts: error.attempts,
    cause: error.errors[0].message,
  };
}

export default function TimingAttack() {
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [cart, setCart] = useState<TimingCart | null>(null);
  const [interleaving, setInterleaving] = useState<Interleaving>('during-rollback');
  const [isRunning, setIsRunning] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [result, setResult] = useState<'expected-limitation' | 'failed' | null>(null);
  const [failureMessage, setFailureMessage] = useState<string | null>(null);
  const [fixtureFailure, setFixtureFailure] = useState<FixtureFailureDetails | null>(null);

  const refresh = async () => {
    setCart(await TimingCartModel.getSnapshot());
  };

  const resetFixture = async (operation: TimingCartResetOperation) => {
    await replaceTimingCartFixture(structuredClone(TIMING_INITIAL_CART), operation);
    await refresh();
    setTimeline([]);
    setResult(null);
    setFailureMessage(null);
    setFixtureFailure(null);
  };

  useEffect(() => {
    let isCurrent = true;
    const unsubscribe = subscribeToTimingCart(() => {
      void TimingCartModel.getSnapshot()
        .then((snapshot) => {
          if (isCurrent) setCart(snapshot);
        })
        .catch((error: unknown) => {
          if (!isCurrent) return;
          setResult('failed');
          setFailureMessage(
            `Fixture subscription failed: ${error instanceof Error ? error.message : String(error)}`,
          );
        });
    });

    void (async () => {
      setIsReady(false);
      try {
        await replaceTimingCartFixture(structuredClone(TIMING_INITIAL_CART), 'initialization');
        const snapshot = await TimingCartModel.getSnapshot();
        if (!isCurrent) return;
        setCart(snapshot);
        setTimeline([]);
        setResult(null);
        setFailureMessage(null);
        setFixtureFailure(null);
      } catch (error) {
        if (!isCurrent) return;
        setResult('failed');
        setFailureMessage(
          `Fixture initialization failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      } finally {
        if (isCurrent) setIsReady(true);
      }
    })();

    return () => {
      isCurrent = false;
      unsubscribe();
    };
  }, []);

  const runFixture = async () => {
    if (isRunning || !isReady) return;

    setIsRunning(true);
    setIsReady(false);

    const events: TimelineEvent[] = [];
    const addEvent = (label: string, type: TimelineEventType, status: TimelineEvent['status']) => {
      events.push({ label, type, status });
      setTimeline([...events]);
    };
    const markUnexpectedFixtureError = (error: unknown) => {
      addEvent(
        `Unexpected fixture error: ${error instanceof Error ? error.message : String(error)}`,
        'tx-step',
        'error',
      );
      setResult('failed');
      setFailureMessage(error instanceof Error ? error.message : String(error));
    };
    try {
      try {
        await resetFixture('run-reset');
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        addEvent(`Fixture run reset failed: ${message}`, 'tx-step', 'error');
        setResult('failed');
        setFailureMessage(`Fixture run reset failed: ${message}`);
        return;
      }

      const serverGate = createDeferred();
      const serverReplace = async () => {
        await serverGate.promise;
        await TimingCartModel.replace(structuredClone(TIMING_SERVER_CART));
        addEvent('External server replacement applied (5)', 'server-sync', 'success');
      };
      const serverReplacePromise = serverReplace();
      const tx = startTransaction({ transition: false });

      addEvent('Transaction started', 'tx-start', 'success');
      await tx.run(
        async () => {
          await TimingCartModel.patch((draft) => {
            const item = draft.items.find((candidate) => candidate.id === TARGET_ITEM_ID);
            if (item) item.quantity += 1;
            draft.total = draft.items.reduce(
              (sum, candidate) => sum + candidate.price * candidate.quantity,
              0,
            );
            draft.lastModified = '2026-07-23T00:00:03.000Z';
          });
          addEvent('Optimistic patch applied (+1)', 'tx-step', 'success');
        },
        {
          compensate: async () => {
            addEvent('Rollback started', 'tx-rollback', 'pending');
            if (interleaving === 'during-rollback') {
              serverGate.resolve();
              await serverReplacePromise;
            }
            await TimingCartModel.patch((draft) => {
              const item = draft.items.find((candidate) => candidate.id === TARGET_ITEM_ID);
              if (item) item.quantity -= 1;
              draft.total = draft.items.reduce(
                (sum, candidate) => sum + candidate.price * candidate.quantity,
                0,
              );
              draft.lastModified = '2026-07-23T00:00:04.000Z';
            });
            addEvent('Rollback patch applied (-1)', 'tx-rollback', 'success');
          },
        },
      );

      if (interleaving === 'before-rollback') {
        serverGate.resolve();
        await serverReplacePromise;
      }

      addEvent('Forced request failure', 'tx-step', 'error');
      try {
        await tx.run(async () => {
          throw new Error(EXPECTED_FIXTURE_FAILURE);
        });
      } catch (error) {
        const expectedFailure = getExpectedFixtureFailure(error);
        if (!expectedFailure) {
          markUnexpectedFixtureError(error);
          return;
        }
        setFixtureFailure(expectedFailure);

        try {
          if (interleaving === 'after-rollback') {
            serverGate.resolve();
            await serverReplacePromise;
          }

          const finalCart =
            TimingCartModel.getCachedSnapshot() ?? (await TimingCartModel.getSnapshot());
          const matchesFixture =
            targetQuantity(finalCart) === interleavings[interleaving].expectedQuantity;
          setResult(matchesFixture ? 'expected-limitation' : 'failed');
          await refresh();
        } catch (unexpectedError) {
          markUnexpectedFixtureError(unexpectedError);
        }
      }
    } finally {
      setIsRunning(false);
      setIsReady(true);
    }
  };

  const handleReset = async () => {
    if (isRunning || !isReady) return;

    setIsReady(false);
    try {
      await resetFixture('manual-reset');
    } catch (error) {
      setResult('failed');
      setFailureMessage(
        `Fixture reset failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      setIsReady(true);
    }
  };

  const fixture = interleavings[interleaving];

  return (
    <DemoLayout
      level={demoMeta.level}
      title={demoMeta.title}
      packages={demoMeta.packages}
      difficulty={demoMeta.difficulty}
      duration={demoMeta.duration}
      problem={demoMeta.problem}
      solution={demoMeta.solution}
      problemDetails={demoMeta.problemDetails}
      solutionDetails={demoMeta.solutionDetails}
      codeSnippet={demoMeta.codeSnippet}
      codeTitle={demoMeta.codeTitle}
      docsLink={demoMeta.docsLink}
      relatedDemos={relatedDemos}
    >
      <MetricsGrid>
        <MetricCard
          icon={<Clock className="h-5 w-5" />}
          label="Fixture"
          value={fixture.label}
          target="Fixed order"
          status="good"
        />
        <MetricCard
          icon={<Activity className="h-5 w-5" />}
          label="Final quantity"
          value={`${targetQuantity(cart)}`}
          target={`${fixture.expectedQuantity} in this fixture`}
          status={result === 'failed' ? 'poor' : result ? 'excellent' : 'good'}
        />
        <MetricCard
          icon={<AlertTriangle className="h-5 w-5" />}
          label="Coordination"
          value={result ? 'Not supported' : 'Not run'}
          target="Expected limitation"
          status={result === 'failed' ? 'poor' : 'good'}
        />
      </MetricsGrid>

      <SectionHeader
        title="Replace / Rollback Ordering Fixture"
        description="The deferred gate fixes the external replacement before, during, or after rollback. Different final snapshots demonstrate that cross-store ordering is application-owned."
      />

      <div className="mb-6 rounded-lg border border-blue-500/30 bg-blue-500/5 p-4 text-sm text-muted-foreground">
        This fixture resets the dedicated <code>sync-timing</code> model before every run. It
        intentionally preserves no state between runs or other scenarios.
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="mb-4 text-lg font-semibold">Deterministic configuration</h3>
            <label
              className="mb-2 block text-sm text-muted-foreground"
              htmlFor="timing-interleaving"
            >
              External replacement order
            </label>
            <select
              id="timing-interleaving"
              data-testid="timing-interleaving"
              value={interleaving}
              onChange={(event) => setInterleaving(event.target.value as Interleaving)}
              disabled={isRunning || !isReady}
              className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
            >
              {Object.entries(interleavings).map(([value, option]) => (
                <option key={value} value={value}>
                  {option.label}
                </option>
              ))}
            </select>
            <div className="mt-4 flex gap-2">
              <button
                data-testid="run-timing-fixture"
                onClick={() => void runFixture()}
                disabled={isRunning || !isReady}
                className="flex flex-1 items-center justify-center gap-2 rounded bg-primary px-4 py-3 text-sm font-medium text-primary-foreground disabled:opacity-50"
              >
                <Zap className="h-4 w-4" />
                {isRunning ? 'Running fixture…' : 'Run deterministic fixture'}
              </button>
              <button
                data-testid="reset-timing-fixture"
                onClick={() => void handleReset()}
                disabled={isRunning || !isReady}
                className="flex items-center justify-center gap-2 rounded border border-border bg-card px-4 py-3 text-sm font-medium disabled:opacity-50"
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="mb-4 text-lg font-semibold">Current snapshot</h3>
            <div
              data-testid="timing-final-quantity"
              data-result={result ?? 'not-run'}
              className="text-6xl font-bold"
            >
              {targetQuantity(cart)}
            </div>
            {fixtureFailure && (
              <div
                data-testid="timing-fixture-failure"
                data-error-type={fixtureFailure.errorType}
                data-step-id={fixtureFailure.stepId}
                data-attempts={fixtureFailure.attempts}
                data-cause={fixtureFailure.cause}
                className="sr-only"
              />
            )}
            <p className="mt-2 text-sm text-muted-foreground">
              Target item quantity; the initial fixture is 1 and the external server snapshot is 5.
            </p>
            {result && (
              <div
                data-testid="timing-result"
                className={`mt-4 flex gap-3 rounded border p-4 text-sm ${result === 'expected-limitation' ? 'border-yellow-500/40 bg-yellow-500/5' : 'border-red-500/50 bg-red-500/5'}`}
              >
                {result === 'expected-limitation' ? (
                  <AlertTriangle className="h-5 w-5 shrink-0 text-yellow-500" />
                ) : (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-red-500" />
                )}
                <span>
                  {result === 'expected-limitation'
                    ? 'Expected limitation reproduced: the final snapshot depends on the selected ordering.'
                    : (failureMessage ?? 'Fixture result did not match its declared ordering.')}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="mb-4 text-lg font-semibold">Ordered events</h3>
          <ol data-testid="timing-timeline" className="space-y-2">
            {timeline.length === 0 ? (
              <li className="py-12 text-center text-sm text-muted-foreground">
                Run a fixture to see its fixed event order.
              </li>
            ) : (
              timeline.map((event, index) => (
                <li
                  key={`${event.label}-${index}`}
                  className="flex items-center gap-3 rounded bg-muted/30 px-3 py-2 text-sm"
                >
                  <span className="font-mono text-xs text-muted-foreground">{index + 1}</span>
                  <span>{event.label}</span>
                </li>
              ))
            )}
          </ol>
        </div>
      </div>
    </DemoLayout>
  );
}
