import { highlights } from "@/constants/home";
import { Activity, Sparkles, Zap } from "lucide-react";

export function DemoCard() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/80 p-4 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.9)] backdrop-blur-xl dark:border-border/70 dark:bg-card/70">
      <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <div className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-emerald-400" />
          <span className="size-2 rounded-full bg-amber-400" />
          <span className="size-2 rounded-full bg-rose-400" />
          <span className="ml-2 font-medium text-foreground/80">Revisit timeline</span>
        </div>
        <div className="inline-flex items-center gap-1 rounded-full bg-secondary/80 px-2 py-1">
          <Activity className="size-3" />
          <span className="text-[10px]">FirstTx DevTools</span>
        </div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-border/70 bg-muted/60 p-3 text-xs">
          <p className="mb-2 font-semibold text-muted-foreground">Before FirstTx</p>
          <TimelineItem label="사용자 재방문" detail="링크 클릭 또는 브라우저 뒤로 가기" />
          <TimelineItem label="Blank screen" detail="1~2초 동안 흰 화면 노출" tone="danger" />
          <TimelineItem label="JS 로딩 & 마운트" detail="React + API 요청 후에야 화면 표시" />
        </div>
        <div className="rounded-xl border border-primary/40 bg-linear-to-br from-primary/25 via-primary/10 to-card p-3 text-xs text-primary-foreground">
          <p className="mb-2 flex items-center gap-1.5 font-semibold">
            <Sparkles className="size-3" />
            After FirstTx
          </p>
          <TimelineItem label="Boot script" detail="HTML 로드 직후, 1.7KB 부트 스크립트 실행" tone="accent" />
          <TimelineItem label="Prepaint restore" detail="IndexedDB에서 마지막 DOM 스냅샷 복원 (0ms)" tone="accent" />
          <TimelineItem label="Hydration & sync" detail="백그라운드에서 React 마운트 & 데이터 동기화" tone="neutral" />
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[11px]">
        <div className="flex flex-wrap items-center gap-1.5 text-muted-foreground/90">
          <Zap className="size-3 text-primary" />
          <span>ViewTransition 지원 시 부드러운 크로스페이드</span>
        </div>
        <div className="flex gap-2">
          {highlights.map((item) => (
            <div key={item.label} className="flex flex-col rounded-lg border border-border/60 bg-background/80 px-2.5 py-1.5">
              <span className="text-[10px] text-muted-foreground">{item.label}</span>
              <span className="text-xs font-semibold text-foreground">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TimelineItem({ label, detail, tone = "neutral" }: { label: string; detail: string; tone?: "neutral" | "danger" | "accent" }) {
  const toneClass = tone === "danger" ? "bg-destructive/80" : tone === "accent" ? "bg-emerald-400" : "bg-foreground/40";

  return (
    <div className="mt-2 flex items-start gap-2">
      <span className={`mt-1 size-1.5 rounded-full ${toneClass}`} />
      <div>
        <p className="font-medium">{label}</p>
        <p className="text-[11px] text-muted-foreground/90">{detail}</p>
      </div>
    </div>
  );
}
