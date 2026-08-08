export type EvaluationLocale = "ko" | "en";

export type EvaluationIntent = "symptom" | "contract";

export type EvaluationLayer = "prepaint" | "local-first" | "tx" | "general";

export interface RetrievalEvaluationCase {
  id: string;
  locale: EvaluationLocale;
  query: string;
  expectedSources: string[];
  expectedSections?: string[];
  intent: EvaluationIntent;
  layer: EvaluationLayer;
}

export interface OutOfDomainCase {
  id: string;
  locale: EvaluationLocale;
  query: string;
  absentTopic: string;
  usesInDomainVocabulary: boolean;
}

export const OUT_OF_DOMAIN_CASES: OutOfDomainCase[] = [
  {
    id: "ood-ko-1",
    locale: "ko",
    query: "FirstTx를 React Native 앱에서도 쓸 수 있나요?",
    absentTopic: "React Native",
    usesInDomainVocabulary: false,
  },
  {
    id: "ood-ko-2",
    locale: "ko",
    query: "트랜잭션 보상 로직의 단위 테스트는 어떻게 작성하나요?",
    absentTopic: "테스트 작성",
    usesInDomainVocabulary: true,
  },
  {
    id: "ood-ko-3",
    locale: "ko",
    query: "로그인 세션과 인증 토큰은 어떻게 관리하나요?",
    absentTopic: "인증/세션",
    usesInDomainVocabulary: false,
  },
  {
    id: "ood-ko-4",
    locale: "ko",
    query: "Prepaint 스냅샷에서 다국어 번역은 어떻게 처리하나요?",
    absentTopic: "국제화",
    usesInDomainVocabulary: true,
  },
  {
    id: "ood-en-1",
    locale: "en",
    query: "Does FirstTx work with Vue or Svelte?",
    absentTopic: "Vue/Svelte",
    usesInDomainVocabulary: false,
  },
  {
    id: "ood-en-2",
    locale: "en",
    query: "How do I mock the model store in a unit test?",
    absentTopic: "테스트 작성",
    usesInDomainVocabulary: true,
  },
  {
    id: "ood-en-3",
    locale: "en",
    query: "What features are planned for the next release?",
    absentTopic: "로드맵",
    usesInDomainVocabulary: false,
  },
  {
    id: "ood-en-4",
    locale: "en",
    query: "Which license does the Prepaint package ship under?",
    absentTopic: "라이선스",
    usesInDomainVocabulary: true,
  },
];

export const RETRIEVAL_EVALUATION_CASES: RetrievalEvaluationCase[] = [
  {
    id: "ko-1",
    locale: "ko",
    query: "재방문해도 매번 빈 화면부터 시작해요. 저장된 화면이 왜 안 쓰이나요?",
    expectedSources: ["troubleshooting.ko.mdx"],
    expectedSections: ["Prepaint가 replay되지 않음"],
    intent: "symptom",
    layer: "prepaint",
  },
  {
    id: "ko-2",
    locale: "ko",
    query: "복원된 화면에서 버튼이 안 눌리는데 버그인가요?",
    expectedSources: ["troubleshooting.ko.mdx", "prepaint.ko.mdx"],
    expectedSections: ["Prepaint가 replay되지 않음", "5. 오버레이 렌더링"],
    intent: "contract",
    layer: "prepaint",
  },
  {
    id: "ko-3",
    locale: "ko",
    query: "useModel이랑 useSyncedModel 중에 뭘 써야 하나요?",
    expectedSources: ["local-first.ko.mdx"],
    expectedSections: ["2. React 훅: `useModel` vs `useSyncedModel`"],
    intent: "contract",
    layer: "local-first",
  },
  {
    id: "ko-4",
    locale: "ko",
    query: "타임아웃이 났는데 서버 요청이 계속 진행돼요",
    expectedSources: ["troubleshooting.ko.mdx", "tx.ko.mdx"],
    expectedSections: ["Tx가 rollback 또는 timeout으로 끝남", "2. 트랜잭션 수명주기 & 상태"],
    intent: "symptom",
    layer: "tx",
  },
  {
    id: "ko-5",
    locale: "ko",
    query: "우리 앱에 이 라이브러리가 맞는지 어떻게 판단하나요?",
    expectedSources: ["overview.ko.mdx"],
    expectedSections: ["3. 어떤 앱에 잘 맞나요?"],
    intent: "contract",
    layer: "general",
  },
  {
    id: "ko-6",
    locale: "ko",
    query: "앱 진입점을 어떻게 바꿔야 하나요?",
    expectedSources: ["getting-started.ko.mdx"],
    expectedSections: ["3. 엔트리 포인트 교체 (`createFirstTxRoot`) – ⭐ 필수"],
    intent: "contract",
    layer: "general",
  },
  {
    id: "ko-7",
    locale: "ko",
    query: "세 기능을 같이 쓸 때 어떤 순서로 붙이나요?",
    expectedSources: ["patterns.ko.mdx", "overview.ko.mdx"],
    expectedSections: ["세 레이어를 함께 쓰는 순서", "4. 어떻게 도입하면 될까요?"],
    intent: "contract",
    layer: "general",
  },
  {
    id: "en-1",
    locale: "en",
    query: "Revisiting the app still shows a blank screen instead of the cached view",
    expectedSources: ["troubleshooting.en.mdx"],
    expectedSections: ["Prepaint does not replay"],
    intent: "symptom",
    layer: "prepaint",
  },
  {
    id: "en-2",
    locale: "en",
    query: "The data is empty on the very first render",
    expectedSources: ["troubleshooting.en.mdx", "local-first.en.mdx"],
    expectedSections: ["Local-First data is not ready", "1. Core concepts"],
    intent: "symptom",
    layer: "local-first",
  },
  {
    id: "en-3",
    locale: "en",
    query: "Does the step that failed also get its compensation run?",
    expectedSources: ["troubleshooting.en.mdx", "tx.en.mdx"],
    expectedSections: ["Tx ends in rollback or timeout", "2. Transaction lifecycle & states"],
    intent: "contract",
    layer: "tx",
  },
  {
    id: "en-4",
    locale: "en",
    query: "How do I make a transaction step retry on failure?",
    expectedSources: ["tx.en.mdx"],
    expectedSections: ["3. `tx.run` and retry"],
    intent: "contract",
    layer: "tx",
  },
  {
    id: "en-5",
    locale: "en",
    query: "Some fields look empty in the debugging panel",
    expectedSources: ["troubleshooting.en.mdx", "devtools.en.mdx"],
    expectedSections: ["DevTools fields are missing or different"],
    intent: "symptom",
    layer: "general",
  },
  {
    id: "en-6",
    locale: "en",
    query: "Where can I look up every option this library accepts?",
    expectedSources: ["reference.en.mdx"],
    intent: "contract",
    layer: "general",
  },
  {
    id: "en-7",
    locale: "en",
    query: "How do I keep two browser tabs in sync?",
    expectedSources: ["local-first.en.mdx"],
    expectedSections: ["3. Multi-tab sync & BroadcastChannel"],
    intent: "contract",
    layer: "local-first",
  },
];
