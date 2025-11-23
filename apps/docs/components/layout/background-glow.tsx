export function BackgroundGlow() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
      <div className="absolute -top-24 left-1/2 h-80 w-80 translate-x-[-50%] rounded-full bg-chart-2/30 blur-3xl sm:hidden" />
      <div className="absolute top-4 -left-40 h-80 w-80 rounded-full bg-chart-2/20 blur-3xl max-sm:hidden dark:bg-chart-2/30" />
      <div className="absolute top-80 -right-10 h-80 w-80 rounded-full bg-primary/15 blur-3xl max-sm:hidden dark:bg-primary/30" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.18)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.12)_1px,transparent_1px)] bg-size-[80px_80px] opacity-[0.35] mix-blend-soft-light" />
      <div className="absolute inset-x-10 top-24 h-px bg-linear-to-r from-transparent via-border/80 to-transparent" />
    </div>
  );
}
