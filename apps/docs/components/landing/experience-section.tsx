import { Timeline } from "./timeline";

export function ExperienceSection() {
  return (
    <section className="mt-16 grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <div className="space-y-4">
        <h2 className="text-sm font-semibold tracking-[0.18em] text-muted-foreground">HOW IT FEELS</h2>
        <p className="text-xl font-medium tracking-tight sm:text-2xl">유저 입장에서 보는 FirstTx 경험</p>
        <p className="max-w-xl text-sm text-muted-foreground">첫 방문에서 SSR이 주는 이점은 인정하면서도, 실제로는 재방문과 탭 이동, 뒤로 가기 같은 맥락이 더 많습니다. FirstTx는 바로 이 구간에 초점을 맞춰, “다시 왔을 때도 이미 준비된 화면”을 만듭니다.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <ExperienceCard title="재방문이 잦은 내부 도구" description="목록-상세-목록을 반복해서 오가는 CRM, 어드민, 대시보드에서 빈 화면 없이 바로 이전 상태를 보여줍니다." />
          <ExperienceCard title="작업 중 새로고침" description="로컬 모델이 항상 최신 스냅샷을 들고 있기 때문에, 실수로 새로고침해도 작업 맥락이 그대로 유지됩니다." />
          <ExperienceCard title="낙관적 UI의 실패 핸들링" description="서버 에러로 롤백할 때도 UI 상태는 트랜잭션 단위로 되돌아가, ‘반쯤만 롤백된 화면’을 피할 수 있습니다." />
          <ExperienceCard title="오프라인 내구성" description="실제 구현은 단순한 동기화 훅이지만, 결과적으로는 오프라인/재연결을 견디는 데이터 레이어가 됩니다." />
        </div>
      </div>
      <Timeline />
    </section>
  );
}

function ExperienceCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/70 p-3 text-xs shadow-[0_14px_40px_-30px_rgba(15,23,42,0.9)]">
      <p className="mb-1 font-medium">{title}</p>
      <p className="text-[11px] text-muted-foreground/90">{description}</p>
    </div>
  );
}
