---
workflow_version: 2
status: awaiting-approval
target: 'apps/docs 전체 (랜딩 + docs 셸 + 공통 셸 + MDX 렌더링 컴포넌트)'
mode: redesign
anchor: 'Company anchor: Linear'
baseline: 'artifacts/uiux/docs-uiux-redesign/baseline/ (7장, 2026-07-16, main@c2280ba + untracked docs/spec-packets)'
acceptance_source: '이 packet (기존 product SPEC 없음)'
candidate_ids: [A-framed-monolith, B-layer-ladder, C-workspace-shell, D-docs-first-economy]
implemented_candidate_ids: [A-framed-monolith, B-layer-ladder]
final_decision_mode: 'synthesize (제안, 승인 대기)'
approved_direction: ''
capture_manifest: '이 문서의 Capture Manifest 섹션'
---

# Production UI Decision Packet — apps/docs UI/UX 전면 재작성

## Target와 사용자 Job

- Target route/component: `apps/docs` 전체 — `app/[locale]/page.tsx`(랜딩), `app/[locale]/docs/**`(문서 6페이지), 공통 셸(navbar/footer/sidebar), MDX 컴포넌트(code-block/api-table/callout/install-tabs).
- 사용자 job: (1) React 개발자가 FirstTx가 무슨 문제를 푸는지 10초 안에 파악하고 설치 경로로 진입, (2) 문서에서 레이어별 API·개념을 빠르게 탐색.
- 현재 구조: hero(2col: 텍스트+데모카드) → layers 3카드 → experience 카드+타임라인 → quickstart 탭. 레드/로즈 액센트 남용(헤드라인 전체가 레드), 장식성 글로우·그리드 배경, shadcn 기본 zinc 토큰. docs는 최소한의 사이드바+본문.

## Invariant와 Non-goal

- Existing content/function invariant:
  - `messages/{ko,en}.json`의 모든 콘텐츠(네임스페이스: Hero, DemoCard, HeaderRow, Layers, Experience, Timeline, QuickStart, Footer, DocsNav)를 그대로 사용. 문구 수정 없음.
  - `content/docs/*.mdx` 본문 무변경. MDX 컴포넌트의 props 계약(Callout type/title, ApiTable kind/items, InstallTabs packages/dev/title, CodeBlock=pre) 유지.
  - 링크 target 유지: playground URL, GitHub URL, `#quickstart` 앵커, docs 라우트 6개.
  - ko/en i18n(next-intl) 라우팅·메시지 구조 유지. 다크/라이트 전환(next-themes) 유지, 다크 우선 설계.
  - JSON-LD, 메타데이터, sitemap/robots 구조 유지.
- Existing data/handler/routing/i18n/a11y/state invariant:
  - 패키지 매니저 탭 선택, 코드 copy 버튼, 모바일 메뉴 토글, 테마/로케일 스위처 기능 유지.
  - 현재 nav는 `<a href>`(하드 리로드)·`next/link`·수동 로케일 프리픽스가 혼재 — 재작성 시 next-intl 인식 내비게이션으로 정리하되 목적지·기능은 동일(사용자 승인된 brief의 "전면 재작성" 범위 내 기술 정리로 간주).
- Approved additive contract (사용자 사전 승인, 2026-07-16 대화):
  - 챗봇 기능 전체 제거: `components/chat/`, `app/api/chat/`, `lib/ai|vector|cache|ratelimit/`, `scripts/`(임베딩 파이프라인), `pnpm ai` 스크립트, openai/ai-sdk/upstash 의존성. 결합점은 `app/[locale]/layout.tsx`의 import+렌더 2줄뿐임을 실측 확인.
  - 브랜드 컬러를 로즈/레드에서 앵커 기반 자체 정의값으로 교체.
- Non-goal: MDX 본문 수정, 새 문서 페이지 추가, playground 앱 변경, 문서 우측 TOC 신설(TBD로 보류), 검색 기능, SEO 구조 변경.

## Acceptance와 Evidence Trace

- Acceptance source: 이 packet (기존 SPEC 없음).
- Edge cases: 로케일 스위칭 시 경로 보존, 모바일 사이드바 진입 경로, MDX 긴 코드블록 overflow, reduced-motion, ko 한글 타이포(라틴 전용 네거티브 트래킹 금지).
- TBD와 owner/decision trigger: docs 우측 TOC 추가 여부(owner: 사용자, final 승인 시 결정), Pretendard 등 한글 웹폰트 도입 여부(owner: 사용자, final 승인 시 결정 — 후보 단계는 시스템 한글 폰트 스택).

| ID  | Actor/trigger/state         | Expected outcome                                                   | Planned/actual evidence                              | Status  |
| --- | --------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------- | ------- |
| AC1 | 방문자가 /ko, /en 랜딩 진입 | 기존 i18n 콘텐츠 그대로, 새 IA·비주얼로 렌더                       | final 스크린샷(데스크톱/모바일, ko/en) + 빌드 통과   | pending |
| AC2 | 방문자가 docs 6페이지 열람  | MDX 본문 무변경, 새 docs 셸·MDX 컴포넌트 스타일                    | final 스크린샷 + `git diff content/docs` 무변경 확인 | pending |
| AC3 | 다크/라이트 테마 전환       | 두 테마 모두 의도된 완성도(다크 우선)                              | 테마별 스크린샷                                      | pending |
| AC4 | 챗봇 제거 후 빌드           | typecheck/lint/build 통과, 잔여 import 0                           | 명령 결과 + grep 잔여 확인                           | pending |
| AC5 | 키보드 사용자 탐색          | focus-visible, 시맨틱 role, 모바일 메뉴 키보드 경로                | 브라우저 캡처/검사                                   | pending |
| AC6 | 시각 시스템                 | 단일 크로마틱 액센트, 장식성 그라디언트·글로우 제거, hairline 위계 | final 스크린샷 + 코드 확인                           | pending |

## Anchor Decision

- Decision: Company anchor — **Linear** (사용자 선택, 2026-07-16).
- Evidence/source:
  - 공식: Linear "How we redesigned the Linear UI" — LCH 색공간, base/accent/contrast 3변수 테마, Inter Display(제목)+Inter(본문), "reduce visual noise, maintain visual alignment, increase hierarchy and density".
  - 비공식 seed(참고용, 권위 아님): VoltAgent/awesome-design-md의 linear.app DESIGN.md — 단일 크로마틱 액센트(라벤더-블루)를 브랜드·포커스·primary CTA에만, near-black surface ladder, hairline 보더 3단계, display 600/body 400 + 네거티브 트래킹, 4px 스페이싱, pill CTA 금지.
- Local signal mapping (값 복사가 아닌 번역):
  - Color: 자체 정의 다크 캔버스 + surface ladder(3~~4단) + hairline 보더 2~~3단 + **단일 크로마틱 액센트**(후보별 자체 oklch 값). 상태색(success/pending/error)은 저채도 시맨틱 토큰으로 한정. 기존 chart-* 그라디언트 남용 제거.
  - Typography: 기존 Geist(이미 로드됨)를 유지하되 display 계층(600, 네거티브 트래킹)과 body(400) 대비 강화. 한글은 트래킹 완화(-0.01em 이하) + 시스템 한글 폰트 스택 — 라틴 전용 트래킹/폰트를 한글에 그대로 적용하지 않음.
  - Spacing/density: 4px 리듬, 섹션 리듬 96~128px, 콘텐츠 폭 축소(정밀 인상), 사이드바 밀도 상승.
  - Composition: 섹션 경계를 배경 카드가 아닌 hairline으로. 제품 데모는 "framed dark panel"로 승격. 장식(글로우/그리드) 제거.
  - Interaction/motion: 등장 애니메이션 최소화(마이크로 트랜지션 위주, 120~200ms), reduced-motion 존중. focus ring은 액센트.
- Research side effect disclosure: 중앙 wiki(`~/dev/p/study-all/research`)의 `uiux/visual-language-signal-extraction` 페이지를 **직접 read-only로 열람**(research-query 스킬 미호출 — 컨텍스트 절약 목적). telemetry/write-back 미발생. 외부 fetch: linear.app 블로그, VoltAgent DESIGN.md(raw).

## Baseline

- Type: current-screen
- Route/params와 data state/source: `/ko`(랜딩), `/ko/docs/overview`, `/en`(랜딩). 정적 콘텐츠(i18n 메시지 + MDX), 외부 data 없음.
- Exact desktop/mobile viewport: 1440x900 (full-page), 390x844 (full-page).
- Theme/locale axes: dark(기본)·light, ko(기본)·en.
- Environment/source revision: local dev(next dev, port 3000), git main@c2280ba, worktree에 packet/artifacts 외 변경 없음.
- Sensitive-data handling: 실제 사용자·운영 데이터 없음(정적 문서 사이트, 로컬 fixture 불필요). 챗봇 위젯 버튼이 스크린샷에 노출되나 대화 데이터 없음.
- Capture gap: 없음.

## Capture Manifest

| Artifact path (artifacts/uiux/docs-uiux-redesign/) | Role     | Candidate | Viewport      | Route/state/theme/locale     | Environment/source     | Selection | Evidence class | Sensitive-data handling |
| -------------------------------------------------- | -------- | --------- | ------------- | ---------------------------- | ---------------------- | --------- | -------------- | ----------------------- |
| baseline/landing-1440x900-dark-ko.png              | baseline | -         | 1440x900 full | /ko, dark, ko                | next dev, main@c2280ba | N/A       | direction      | 해당 없음(정적 콘텐츠)  |
| baseline/landing-390x844-dark-ko.png               | baseline | -         | 390x844 full  | /ko, dark, ko                | 상동                   | N/A       | direction      | 상동                    |
| baseline/landing-1440x900-light-ko.png             | baseline | -         | 1440x900 full | /ko, light, ko               | 상동                   | N/A       | direction      | 상동                    |
| baseline/landing-1440x900-dark-en.png              | baseline | -         | 1440x900 full | /en, dark, en                | 상동                   | N/A       | direction      | 상동                    |
| baseline/docs-overview-1440x900-dark-ko.png        | baseline | -         | 1440x900 full | /ko/docs/overview, dark, ko  | 상동                   | N/A       | direction      | 상동                    |
| baseline/docs-overview-390x844-dark-ko.png         | baseline | -         | 390x844 full  | /ko/docs/overview, dark, ko  | 상동                   | N/A       | direction      | 상동                    |
| baseline/docs-overview-1440x900-light-ko.png       | baseline | -         | 1440x900 full | /ko/docs/overview, light, ko | 상동                   | N/A       | direction      | 상동                    |

(candidate/final 캡처는 구현 후 추가)

## Four Directions

공통 invariant: 같은 i18n 콘텐츠, 같은 문서 라우트, 다크 우선 + 라이트 지원. Strong recomposition — 최소 두 방향이 기존과 다른 topology.

| ID                     | IA/layout/component composition                                                                                                                                                                                                                                                                  | Strength                                                                 | Risk                                                                                                                         | Preliminary score                                                                   | Implement? |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ---------- |
| A `framed-monolith`    | 중앙 정렬 좁은 hero(display 타이포) → 재방문 타임라인을 대형 framed dark panel로 승격 → hairline로 구분된 full-width 섹션(3-layer 가로 3분할, Experience 2×2 hairline 그리드, QuickStart 좌스텝/우코드 2-pane) → CTA 밴드. docs: 밀도 높은 고정 사이드바+본문. 액센트: 라벤더-인디고 계열 자체값 | Linear 문법과 가장 정합, 검증된 마케팅 topology, 구현·모바일 안정        | 익숙한 패턴이라 차별성은 콘텐츠 프레이밍에 의존                                                                              | fit 2 / hierarchy 2 / feasibility 2 / mobile·state 2 = 8                            | yes        |
| B `layer-ladder`       | 컴팩트 좌정렬 hero(+인라인 설치 명령) → before/after 비교 스트립 → **LAYER 01→02→03 수직 사다리 내러티브**: 각 레이어 행 = 스티키 인덱스 + 설명 + points + 해당 레이어의 QuickStart 코드 인라인 분해 → Experience 압축 그리드 → CTA. docs: A와 동일 셸. 액센트: 일렉트릭 시안-블루 자체값        | "3-레이어" 제품 구조 자체가 IA가 됨 — 서사·차별성 최강, 스크롤 리듬 명확 | QuickStart 스텝↔레이어 매핑 재구성 필요, 스티키 인덱스 모바일 처리, 페이지 길이 증가                                         | fit 2 / hierarchy 2 / feasibility 1 / mobile·state 1 = 6                            | yes        |
| C `workspace-shell`    | 랜딩 전체를 DevTools 워크스페이스 모사(좌 레일 nav + 중앙 캔버스 데모 + 우 인스펙터 코드), 스크롤 대신 패널 전환 인터랙션 중심                                                                                                                                                                   | 제품(DevTools) 정체성 직결, 임팩트 최대                                  | 모바일 붕괴 위험 최고, 인터랙션 상태 폭증, 콘텐츠 접근성·SEO 저하, 구현 비용 최고                                            | fit 1 / hierarchy 1 / feasibility 0 / mobile·state 0 = 2                            | no         |
| D `docs-first-economy` | 랜딩 = 한 문장 hero + 설치 명령 + 문서 IA 요약 그리드 + 런타임 이벤트 표. 마케팅 표면 최소화, Vercel식 경제성                                                                                                                                                                                    | 구현 최저비용, 문서 중심 정체성, 유지보수 용이                           | "전면 재작성" 기대 대비 임팩트 부족, visual completion generic 위험, Experience/Timeline 콘텐츠가 갈 곳 잃음(invariant 압박) | fit 1 / hierarchy 2 / feasibility 2 / mobile·state 2 = 7 (fit·완성도 리스크로 하향) | no         |

예비 평가 기준: product fit(속도·정밀함 스토리 전달), hierarchy, feasibility, mobile/state 확장성. **구현 후보: A, B** (C는 feasibility·mobile 탈락, D는 invariant 콘텐츠 수용력과 완성도 기대 미달).

## Implemented Candidates

캡처 공통: 스크롤이 candidate overlay 내부에서 발생해 `--full-page`가 무효 → 실측 scrollHeight를 뷰포트 높이로 지정해 전체 페이지 캡처(`full-*` 파일). `*-900/-844` 파일은 뷰포트 크롭. 전 candidate 캡처는 direction evidence. baseline `full-*` 7장도 같은 방식으로 추가 캡처(위 manifest의 900px 크롭과 동일 route/theme/locale 축, 높이만 실측값: landing 1440x3093·390x5574, docs 1440x4554·390x5645).

- Candidate: A `framed-monolith` (라벤더-인디고 액센트)
  - Preview surface: `app/[locale]/dev/uiux/a`(+`/docs`) — 격리 dev route, fixed overlay로 기존 셸 위에 렌더. production 무변경.
  - State coverage: hover/focus-visible CSS 구현, reduced-motion 가드(ux-rise), 다크/라이트 토큰. 탭·copy 인터랙션은 direction 단계에서 정적 표현(통합 시 구현).
  - Screenshot paths: `artifacts/uiux/docs-uiux-redesign/a/full-landing-1440x4451-{dark,light}-ko.png`, `full-landing-390x6734-dark-ko.png`, `full-landing-1440x4451-dark-en.png`, `full-docs-1440x4142-{dark,light}-ko.png`, `full-docs-390x5110-dark-ko.png` (+뷰포트 크롭 4장)
  - Artifact roles: candidate / direction evidence
  - Score: main-thread 15/16 (state extensibility 1). 독립 평가자 14/16 (product fit 1, surface economy 1)
  - Selection/rejection reason: 완성도·라이트 모드·feasibility 최강. HOW IT FEELS 보더 대비 부족, 데모 카드 푸터 비대칭, QuickStart 좌우 길이 불균형 결함.
- Candidate: B `layer-ladder` (시안-블루 액센트)
  - Preview surface: `app/[locale]/dev/uiux/b`(+`/docs`) — 동일 격리 방식.
  - State coverage: A와 동일(공유 부품).
  - Screenshot paths: `artifacts/uiux/docs-uiux-redesign/b/full-landing-1440x4406-{dark,light}-ko.png`, `full-landing-390x6498-dark-ko.png`, `full-landing-1440x4406-dark-en.png`, `full-docs-1440x4142-{dark,light}-ko.png`, `full-docs-390x5110-dark-ko.png` (+뷰포트 크롭 4장)
  - Artifact roles: candidate / direction evidence
  - Score: main-thread 13/16 (feasibility 1, mobile 1, state 1). 독립 평가자 15/16 (visual completion 1)
  - Selection/rejection reason: 3-레이어 정체성이 IA 자체가 되는 서사·surface economy 최강, hero 인라인 설치 커맨드가 user job 직결. 사다리 좌측 void, hero 코드 모바일 truncation, "THREE LAYERS" eyebrow ↔ "세 단계" 제목 의미 충돌, 라이트 모드 숫자 대비 부족 결함.
- 공통 결함: 390px에서 TimelineList 행이 압축됨 → 통합 시 모바일 스택 레이아웃으로 보정.
- 독립 채점: Explore 서브에이전트(read-only)가 스크린샷+rubric으로 수행. 생성자(main thread)와 분리됨.

## Final Synthesis와 승인

- Decision mode: **synthesize** (제안)
- Selected base candidate: B `layer-ladder`
- 가져올 요소 (A로부터): framed demo panel의 밀도·마감(highlights 푸터 정렬 수정 포함), HOW IT FEELS 그리드의 hairline 컨테인먼트(대비 보정), 중앙 CTA 밴드, 라이트 모드 대비 처리.
- 제외할 요소: A의 중앙 정렬 마케팅 hero(→ B 좌정렬 + 인라인 설치 커맨드 유지), B의 시안 원값(→ 인디고 방향으로 보정한 일렉트릭 블루로 조정 제안), 사다리 좌측 void(→ 좌측 컬럼에 role·포인트 재배치로 보강).
- 영향 파일(통합 시): app/[locale]/page.tsx + components/landing/* 전면 교체, app/[locale]/docs/layout.tsx + components/layout/_(navbar/footer/sidebar) 교체, components/mdx/_ 재스타일, globals.css 토큰 교체, app/[locale]/layout.tsx(챗봇 제거), components/chat·app/api/chat·lib/ai|vector|cache|ratelimit·scripts 삭제, package.json 의존성 정리.
- 남은 위험: MDX 컴포넌트 재스타일 시 12개 문서 페이지 회귀 확인 필요, 챗봇 의존성 제거 후 lockfile 갱신, 라이트 모드 대비(AA) 검증.
- 승인 evidence/date: (대기)

## Terminal State와 Recovery

- Terminal state: (미정)
- Reason/evidence:
- Candidate-only cleanup:
- Previous production behavior recovery 또는 blocker/recovery plan:

## Production Integration과 Cleanup

(승인 후 기록)

## Verification

(통합 후 기록)

## Research Status

- Research status: 중앙 wiki 존재 확인, `uiux/visual-language-signal-extraction` 1페이지 직접 열람(read-only). research-query 스킬 미호출.
- Freshness: wiki 페이지 updated 2026-06-01, Linear 블로그·DESIGN.md는 2026-07-16 live fetch.
- Telemetry/write-back: 미발생(직접 열람이므로 query telemetry 없음).
