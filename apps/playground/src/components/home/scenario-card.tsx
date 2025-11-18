import { Link } from 'react-router';
import { useState } from 'react';
import { Clock, Info } from 'lucide-react';
import { type ScenarioMeta, scenarioTypeConfig } from '@/data/scenarios';

interface ScenarioCardProps {
  scenario: ScenarioMeta;
}

export function ScenarioCard({ scenario }: ScenarioCardProps) {
  const [showTooltip, setShowTooltip] = useState<string | null>(null);
  const typeConfig = scenarioTypeConfig[scenario.type];

  return (
    <Link
      to={scenario.path}
      data-card
      className="group relative block overflow-hidden rounded-lg border border-border bg-card p-6 transition-all hover:border-primary/50"
    >
      <div className="relative z-10">
        <div className="mb-3 flex items-center justify-between">
          <span className={`rounded px-2 py-0.5 text-xs ${typeConfig.className}`}>
            {typeConfig.label}
          </span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {scenario.duration}
          </span>
        </div>

        <h3 className="mb-2 text-xl font-semibold transition-colors group-hover:text-primary">
          {scenario.title}
        </h3>
        <p className="mb-4 text-sm text-muted-foreground">{scenario.description}</p>

        <div className="mb-4 flex flex-wrap gap-1">
          {scenario.packages.map((pkg) => (
            <span
              key={pkg}
              className="rounded bg-background px-1.5 py-0.5 text-xs text-muted-foreground"
            >
              {pkg}
            </span>
          ))}
        </div>

        <div className="space-y-2">
          {scenario.metrics.map((metric) => (
            <div key={metric.label} className="relative">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <span className="terminal-text">{metric.label}</span>
                  <button
                    type="button"
                    className="opacity-0 transition-opacity group-hover:opacity-100"
                    onMouseEnter={() => setShowTooltip(metric.label)}
                    onMouseLeave={() => setShowTooltip(null)}
                    onClick={(e) => e.preventDefault()}
                  >
                    <Info className="h-3 w-3" />
                  </button>
                </span>
                <span className="font-medium">
                  {metric.value}
                  {metric.target && (
                    <span className="ml-1 text-muted-foreground">(target: {metric.target})</span>
                  )}
                </span>
              </div>
              {showTooltip === metric.label && (
                <div className="absolute bottom-full left-0 z-20 mb-2 w-48 rounded bg-popover p-2 text-xs text-popover-foreground shadow-lg">
                  {metric.description}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-2 text-sm font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
          <span>Launch scenario</span>
          <span className="transition-transform group-hover:translate-x-1">→</span>
        </div>
      </div>
      <div className="scanline absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100" />
    </Link>
  );
}
