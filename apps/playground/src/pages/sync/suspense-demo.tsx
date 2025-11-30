import { Suspense, useState } from 'react';
import { Users, Clock, RefreshCw, Zap } from 'lucide-react';
import {
  ScenarioLayout,
  MetricsGrid,
  MetricCard,
  SectionHeader,
} from '../../components/scenario-layout';
import { useSuspenseSyncedModel, useSyncedModel } from '@firsttx/local-first';
import { ContactsModel, type Contact } from '@/models/contacts.model';
import { fetchContacts } from '@/api/contacts.api';

function ContactsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 rounded-lg bg-muted/50 p-4">
          <div className="h-12 w-12 animate-pulse rounded-full bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-32 animate-pulse rounded bg-muted" />
            <div className="h-3 w-48 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

function SuspenseContactsList() {
  const contacts = useSuspenseSyncedModel(ContactsModel, fetchContacts, {
    revalidateOnMount: 'stale',
  });

  return (
    <div className="space-y-3">
      {contacts.map((contact) => (
        <ContactCard key={contact.id} contact={contact} />
      ))}
    </div>
  );
}

function ContactCard({ contact }: { contact: Contact }) {
  return (
    <div className="flex items-center gap-4 rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/50">
      <img
        src={contact.avatar}
        alt={contact.name}
        className="h-12 w-12 rounded-full object-cover"
      />
      <div className="flex-1">
        <h4 className="font-medium">{contact.name}</h4>
        <p className="text-sm text-muted-foreground">{contact.email}</p>
      </div>
      <div className="text-right">
        <p className="text-sm font-medium">{contact.company}</p>
        <p className="text-xs text-muted-foreground">{contact.phone}</p>
      </div>
    </div>
  );
}

function TraditionalContactsList() {
  const {
    data: contacts,
    isSyncing,
    sync,
    history,
  } = useSyncedModel(ContactsModel, fetchContacts, {
    syncOnMount: 'stale',
  });

  if (!contacts || contacts.length === 0) {
    return <ContactsSkeleton />;
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{contacts.length} contacts loaded</span>
        <button
          onClick={() => sync()}
          disabled={isSyncing}
          className="flex items-center gap-1 rounded px-2 py-1 text-xs hover:bg-accent"
        >
          <RefreshCw className={`h-3 w-3 ${isSyncing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>
      <div className="space-y-3">
        {contacts.map((contact) => (
          <ContactCard key={contact.id} contact={contact} />
        ))}
      </div>
      {history.isStale && (
        <p className="mt-2 text-xs text-yellow-500">Data is stale - refreshing...</p>
      )}
    </div>
  );
}

export default function SuspenseDemo() {
  const [mode, setMode] = useState<'suspense' | 'traditional'>('suspense');
  const [key, setKey] = useState(0);

  const resetDemo = () => {
    setKey((k) => k + 1);
  };

  return (
    <ScenarioLayout
      level={2}
      title="Suspense Integration"
      badge={{
        icon: <Zap className="h-3 w-3" />,
        label: 'Suspense',
      }}
    >
      <MetricsGrid>
        <MetricCard
          icon={<Users className="h-5 w-5" />}
          label="Data Pattern"
          value={mode === 'suspense' ? 'Suspense' : 'Traditional'}
          target="Compare patterns"
          status="good"
        />
        <MetricCard
          icon={<Clock className="h-5 w-5" />}
          label="Loading State"
          value={mode === 'suspense' ? 'Declarative' : 'Conditional'}
          target="Suspense is cleaner"
          status={mode === 'suspense' ? 'excellent' : 'good'}
        />
        <MetricCard
          icon={<RefreshCw className="h-5 w-5" />}
          label="Revalidation"
          value="On Stale"
          target="Auto-refresh"
          status="excellent"
        />
      </MetricsGrid>

      <SectionHeader
        title="Suspense vs Traditional Pattern"
        description="Compare useSuspenseSyncedModel with useSyncedModel. Suspense eliminates conditional loading checks for cleaner component code."
      />

      <div className="mb-6 flex items-center gap-4">
        <div className="flex rounded-lg border border-border bg-card p-1">
          <button
            onClick={() => setMode('suspense')}
            className={`rounded px-4 py-2 text-sm font-medium transition-colors ${
              mode === 'suspense'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Suspense Mode
          </button>
          <button
            onClick={() => setMode('traditional')}
            className={`rounded px-4 py-2 text-sm font-medium transition-colors ${
              mode === 'traditional'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Traditional Mode
          </button>
        </div>
        <button
          onClick={resetDemo}
          className="flex items-center gap-2 rounded bg-card px-3 py-2 text-sm hover:bg-accent"
        >
          <RefreshCw className="h-4 w-4" />
          Reset Demo
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="mb-4 font-semibold">
            {mode === 'suspense' ? 'useSuspenseSyncedModel' : 'useSyncedModel'}
          </h3>
          {mode === 'suspense' ? (
            <Suspense key={key} fallback={<ContactsSkeleton />}>
              <SuspenseContactsList />
            </Suspense>
          ) : (
            <TraditionalContactsList key={key} />
          )}
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="mb-4 font-semibold">Code Comparison</h3>
          {mode === 'suspense' ? (
            <div className="space-y-4">
              <div className="rounded bg-muted/50 p-4">
                <h4 className="mb-2 text-sm font-medium text-green-500">Suspense Pattern</h4>
                <pre className="overflow-x-auto text-xs text-muted-foreground">
                  {`function ContactsList() {
  const contacts = useSuspenseSyncedModel(
    ContactsModel,
    fetchContacts
  );

  return (
    <div>
      {contacts.map(c => (
        <Card key={c.id} {...c} />
      ))}
    </div>
  );
}`}
                </pre>
              </div>
              <div className="rounded bg-primary/5 p-3 text-sm">
                <strong>Benefits:</strong>
                <ul className="mt-1 list-inside list-disc text-muted-foreground">
                  <li>No null checks needed</li>
                  <li>Declarative loading state</li>
                  <li>Cleaner component code</li>
                  <li>Automatic Suspense boundary</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded bg-muted/50 p-4">
                <h4 className="mb-2 text-sm font-medium text-yellow-500">Traditional Pattern</h4>
                <pre className="overflow-x-auto text-xs text-muted-foreground">
                  {`function ContactsList() {
  const { data, isSyncing } =
    useSyncedModel(
      ContactsModel,
      fetchContacts
    );

  if (!data) return <Skeleton />;

  return (
    <div>
      {data.map(c => (
        <Card key={c.id} {...c} />
      ))}
    </div>
  );
}`}
                </pre>
              </div>
              <div className="rounded bg-primary/5 p-3 text-sm">
                <strong>Characteristics:</strong>
                <ul className="mt-1 list-inside list-disc text-muted-foreground">
                  <li>Explicit null checks required</li>
                  <li>Manual loading state handling</li>
                  <li>More control over UI</li>
                  <li>Works with React 18+</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </ScenarioLayout>
  );
}
