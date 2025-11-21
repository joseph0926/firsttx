import { Sparkles, Database, ShieldCheck } from "lucide-react";

export const layers = [
  {
    name: "Prepaint",
    role: "Render layer",
    description: "마지막 화면을 DOM 스냅샷으로 저장했다가, 다음 방문 시 0ms로 복원합니다.",
    points: ["IndexedDB에 전체 화면 스냅샷 보관", "재방문 시 React 로딩 전에 즉시 복원", "CSR 구조 그대로, SSR 수준의 revisit 경험"],
    icon: Sparkles,
  },
  {
    name: "Local-First",
    role: "Data layer",
    description: "IndexedDB를 단일 소스로 두고, 서버와의 동기화를 자동화합니다.",
    points: ["zod 기반 타입 세이프 모델 정의", "TTL + staleness 메타데이터 제공", "백그라운드 동기화로 오프라인 친화적"],
    icon: Database,
  },
  {
    name: "Tx",
    role: "Execution layer",
    description: "UI 업데이트를 트랜잭션 단위로 묶어서, 낙관적 업데이트를 안전하게 만듭니다.",
    points: ["여러 단계의 업데이트를 하나의 트랜잭션으로 실행", "실패 시 자동 롤백(compensate) 처리", "네트워크 오류에도 일관된 UI 상태 유지"],
    icon: ShieldCheck,
  },
] as const;

export const highlights = [
  {
    label: "Revisits",
    value: "0 ms",
    description: "재방문 시 빈 화면 없이 바로 이전 상태를 복원합니다.",
  },
  {
    label: "Sync boilerplate",
    value: "↓ ~90%",
    description: "동기화 로직을 공통 레이어로 끌어올려, 비즈니스 코드에 집중합니다.",
  },
  {
    label: "Optimistic UI",
    value: "Atomic",
    description: "낙관적 업데이트 + 롤백을 트랜잭션으로 다룹니다.",
  },
] as const;
