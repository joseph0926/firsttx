export function HeaderRow() {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="space-y-2">
        <h2 className="text-sm font-semibold tracking-[0.18em] text-muted-foreground">THREE LAYERS · ONE TOOLKIT</h2>
        <p className="text-xl font-medium tracking-tight sm:text-2xl">Prepaint + Local-First + Tx</p>
        <p className="max-w-xl text-xs text-muted-foreground sm:text-sm">한 번에 도입할 필요는 없습니다. 재방문 최적화만 필요하다면 Prepaint 부터, 동기화/낙관적 UI가 필요하다면 Local-First와 Tx만 가져올 수도 있습니다.</p>
      </div>
      <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
        <Chip>React 19 + CSR 환경 최적화</Chip>
        <Chip>Vite / SPA / 내부 도구</Chip>
        <Chip>선택적 레이어 도입</Chip>
      </div>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/70 px-2.5 py-1">{children}</span>;
}
