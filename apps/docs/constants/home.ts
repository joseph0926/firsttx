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
    value: "Measured",
    description: "재방문 부트 구간에 이전 visual snapshot을 표시해 빈 화면 시간을 줄입니다.",
  },
  {
    label: "Sync boilerplate",
    value: "Reusable",
    description: "동기화 로직을 공통 레이어로 끌어올려, 비즈니스 코드에 집중합니다.",
  },
  {
    label: "Optimistic UI",
    value: "Compensating",
    description: "낙관적 단계를 실행하고 실패 시 완료된 단계를 역순으로 보상합니다.",
  },
] as const;
