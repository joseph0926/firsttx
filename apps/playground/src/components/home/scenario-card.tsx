import { Link } from 'react-router';

export interface Scenario {
  id: string;
  title: string;
  description: string;
  path: string;
  metrics: Record<string, string>;
}

interface ScenarioCardProps {
  scenario: Scenario;
}

export function ScenarioCard({ scenario }: ScenarioCardProps) {
  return (
    <Link
      to={scenario.path}
      data-card
      className="group relative block overflow-hidden rounded-lg border border-border bg-card p-6 transition-all hover:border-primary/50"
    >
      <div className="relative z-10">
        <h3 className="mb-2 text-xl font-semibold group-hover:text-primary transition-colors">
          {scenario.title}
        </h3>
        <p className="mb-4 text-sm text-muted-foreground">{scenario.description}</p>
        <div className="space-y-1">
          {Object.entries(scenario.metrics).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground terminal-text">{key}:</span>
              <span className="font-medium">{value}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-2 text-sm font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
          <span>Launch scenario</span>
          <span className="transition-transform group-hover:translate-x-1">→</span>
        </div>
      </div>
      <div className="absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100 scanline" />
    </Link>
  );
}
