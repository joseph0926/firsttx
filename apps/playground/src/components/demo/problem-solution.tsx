import { AlertCircle, CheckCircle2 } from 'lucide-react';

interface ProblemSolutionProps {
  problem: string;
  solution: string;
  problemDetails?: string[];
  solutionDetails?: string[];
}

export function ProblemSolution({
  problem,
  solution,
  problemDetails,
  solutionDetails,
}: ProblemSolutionProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-5">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-red-500/20">
            <AlertCircle className="h-4 w-4 text-red-400" />
          </div>
          <h3 className="font-semibold text-red-400">The Problem</h3>
        </div>
        <p className="text-sm leading-relaxed text-zinc-300">{problem}</p>
        {problemDetails && problemDetails.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {problemDetails.map((detail, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-zinc-400">
                <span className="mt-0.5 text-red-400">-</span>
                {detail}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-5">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-green-500/20">
            <CheckCircle2 className="h-4 w-4 text-green-400" />
          </div>
          <h3 className="font-semibold text-green-400">The Solution</h3>
        </div>
        <p className="text-sm leading-relaxed text-zinc-300">{solution}</p>
        {solutionDetails && solutionDetails.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {solutionDetails.map((detail, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-zinc-400">
                <span className="mt-0.5 text-green-400">+</span>
                {detail}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
