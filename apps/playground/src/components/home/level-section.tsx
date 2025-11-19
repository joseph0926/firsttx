import { ScenarioCard } from './scenario-card';
import { type ScenarioMeta } from '@/data/scenarios';
import type { PlaygroundMetrics } from '@/models/metrics.model';

interface LevelSectionProps {
  level: number;
  title: string;
  description: string;
  scenarios: ScenarioMeta[];
  metrics?: PlaygroundMetrics['scenarios'];
}

export function LevelSection({ level, title, description, scenarios, metrics }: LevelSectionProps) {
  return (
    <div className="mb-16">
      <div className="mb-6">
        <div className="mb-2 flex items-center gap-3">
          <span className="terminal-text text-sm text-muted-foreground">LEVEL {level}</span>
          <div className="h-px flex-1 bg-border" />
        </div>
        <h2 className="mb-2 text-3xl font-bold">{title}</h2>
        <p className="text-muted-foreground">{description}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {scenarios.map((scenario) => (
          <ScenarioCard
            key={scenario.id}
            scenario={scenario}
            metrics={metrics ? metrics[scenario.id] : undefined}
          />
        ))}
      </div>
    </div>
  );
}
