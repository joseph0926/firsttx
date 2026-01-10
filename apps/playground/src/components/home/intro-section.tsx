import { Link } from 'react-router';
import { ArrowRight, Database, Shield, Zap } from 'lucide-react';

interface PackageCardProps {
  icon: React.ReactNode;
  title: string;
  problem: string;
  solution: string;
  demoLink: string;
  iconColor: string;
  borderColor: string;
}

function PackageCard({
  icon,
  title,
  problem,
  solution,
  demoLink,
  iconColor,
  borderColor,
}: PackageCardProps) {
  return (
    <div className={`rounded-xl border bg-card/50 p-5 transition-colors ${borderColor}`}>
      <div className={`mb-3 ${iconColor}`}>{icon}</div>
      <h3 className="mb-3 text-lg font-semibold">{title}</h3>
      <div className="mb-4 space-y-2">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 text-red-400">✗</span>
          <span className="text-sm text-muted-foreground">{problem}</span>
        </div>
        <div className="flex items-start gap-2">
          <span className="mt-0.5 text-green-400">✓</span>
          <span className="text-sm text-foreground">{solution}</span>
        </div>
      </div>
      <Link
        to={demoLink}
        className="inline-flex items-center gap-1 text-sm font-medium text-primary transition-colors hover:text-primary/80"
      >
        Try Demo
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

export function IntroSection() {
  return (
    <section className="mb-12">
      <h2 className="mb-2 text-xl font-bold">Three Problems, One Solution</h2>
      <p className="mb-6 text-sm text-muted-foreground">
        FirstTx solves the most common CSR pain points with three independent packages.
      </p>
      <div className="grid gap-4 md:grid-cols-3">
        <PackageCard
          icon={<Zap className="h-6 w-6" />}
          title="Prepaint"
          problem="2-3 second blank screen on every refresh"
          solution="0ms instant restore from IndexedDB snapshot"
          demoLink="/tour/prepaint"
          iconColor="text-yellow-400"
          borderColor="border-yellow-500/20 hover:border-yellow-500/40"
        />
        <PackageCard
          icon={<Database className="h-6 w-6" />}
          title="Local-First"
          problem="Data lost when tab closes or navigates"
          solution="Automatic persistence with background sync"
          demoLink="/tour/local-first"
          iconColor="text-blue-400"
          borderColor="border-blue-500/20 hover:border-blue-500/40"
        />
        <PackageCard
          icon={<Shield className="h-6 w-6" />}
          title="Tx"
          problem="Manual error handling and retry logic"
          solution="Optimistic updates with auto-rollback"
          demoLink="/tour/tx"
          iconColor="text-green-400"
          borderColor="border-green-500/20 hover:border-green-500/40"
        />
      </div>
    </section>
  );
}
