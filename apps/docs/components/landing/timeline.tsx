"use client";

import { Activity } from "lucide-react";
import { motion } from "motion/react";

export function Timeline() {
  return (
    <motion.div className="relative rounded-2xl border border-border/70 bg-linear-to-br from-background/80 via-card/80 to-card/60 p-4 shadow-[0_24px_80px_-44px_rgba(15,23,42,1)] backdrop-blur-xl" initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.6 }}>
      <div className="mb-3 flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Activity className="size-3" />
          Live timeline (DevTools)
        </span>
        <span className="rounded-full bg-secondary/80 px-2 py-1">prepaint · model · tx</span>
      </div>
      <div className="space-y-2 text-[11px]">
        <TimelineRow label="prepaint.restore" badge="Prepaint" status="success" detail="IndexedDB snapshot → DOM 복원 (4ms)" />
        <TimelineRow label="model.sync.start" badge="Local-First" status="pending" detail="TTL 초과로 백그라운드 동기화 시작" />
        <TimelineRow label="tx.commit" badge="Tx" status="success" detail="UI 업데이트 + 서버 요청 모두 성공" />
        <TimelineRow label="tx.rollback" badge="Tx" status="error" detail="네트워크 실패 → compensate로 UI 상태 되돌림" />
      </div>
      <p className="mt-4 text-[11px] text-muted-foreground">Chrome 확장 프로그램인 FirstTx DevTools에서 위와 같은 이벤트를 타임라인으로 추적할 수 있습니다.</p>
    </motion.div>
  );
}

function TimelineRow({ label, badge, status, detail }: { label: string; badge: string; status: "success" | "pending" | "error"; detail: string }) {
  const statusColor = status === "success" ? "bg-emerald-400" : status === "pending" ? "bg-amber-400" : "bg-destructive";

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/70 px-2.5 py-1.5">
      <div className="flex items-center gap-2">
        <span className={`size-1.5 rounded-full ${statusColor}`} />
        <span className="font-mono text-[11px] text-foreground/90">{label}</span>
        <span className="rounded-full bg-secondary/80 px-2 py-0.5 text-[10px] text-muted-foreground">{badge}</span>
      </div>
      <span className="hidden text-[10px] text-muted-foreground sm:inline">{detail}</span>
    </div>
  );
}
