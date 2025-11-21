import { Sparkles, Database, ShieldCheck } from "lucide-react";

export const layers = [
  {
    key: "prepaint",
    icon: Sparkles,
  },
  {
    key: "localFirst",
    icon: Database,
  },
  {
    key: "tx",
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
