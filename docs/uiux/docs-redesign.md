---
workflow_version: 2
status: verified
target: 'apps/docs: landing, docs shell, documentation routes, MDX system, chat entry and states'
mode: redesign
anchor: 'Company anchor — Stripe documentation structure only; FirstTx D2-B visual identity'
baseline: 'artifacts/uiux/docs-redesign/baseline'
acceptance_source: 'docs/uiux/docs-redesign.md — Acceptance와 Evidence Trace'
candidate_ids: ['D2-A', 'D2-B', 'D2-C', 'D2-D']
implemented_candidate_ids: ['D2-A', 'D2-B']
final_decision_mode: synthesize
approved_direction: 'D2-B base + Stripe structural docs anchor + D2-A setup/state interaction (approved 2026-07-21)'
capture_manifest: 'artifacts/uiux/docs-redesign/capture-manifest.md'
---

# Apps Docs 재구성 계획 및 UI/UX decision packet

## 문서 목적과 현재 상태

이 문서는 `apps/docs` 전면 재구성의 제품 계약, 정보 구조, 콘텐츠 이관, 화면 상태, 디자인 탐색, production 통합과 검증 순서를 소유합니다.

- 작업 분류: strong recomposition redesign
- 계획 기준일: 2026-07-20
- 최근 evidence 갱신: 2026-07-21
- 확인한 source revision: `89676ec`
- 현재 terminal state: `verified`
- 현재 범위: D0-D4의 content/route/RAG foundation과 D5 production UI integration, D6 candidate cleanup/native·browser verification을 완료했습니다. canonical MDX, KO/EN route, metadata와 RAG input contract를 보존했고 외부 vector reset/upsert는 실행하지 않았습니다.
- 승인 evidence: 2026-07-21 사용자가 `D2-B base + Stripe structural-only anchor + D2-A setup/state interaction` 합성 제안에 “네 진행”으로 명시 승인했습니다.
- refinement 승인 evidence: 2026-07-21 사용자가 copy·typography·AI-slop 교정 후 재캡처된 approved synthesis에 “승인”으로 명시 승인했습니다.

## Target와 사용자 Job

### Primary Job

FirstTx Docs는 CSR React 개발자가 제품 적합성을 판단하고, 필요한 레이어를 선택해 안전하게 도입하며, 실제 동작과 지원 경계를 검증하도록 돕습니다.

### Secondary Job

재방문 개발자가 API contract, configuration, migration, error와 troubleshooting 정보를 빠르게 다시 찾도록 돕습니다.

### 제품 surface 역할

| Surface    | 책임                                            | 책임이 아닌 것                                |
| ---------- | ----------------------------------------------- | --------------------------------------------- |
| Docs       | 이해, 적합성 판단, 레이어 선택, 구현, 문제 해결 | 실행 결과를 대신 증명하는 것                  |
| Playground | 실제 행동과 지원 경계의 재현 가능한 증거        | 전체 API reference를 소유하는 것              |
| DevTools   | runtime event와 상태 관찰                       | 개념 설명과 도입 순서를 대신하는 것           |
| Chat       | canonical 문서를 찾고 요약하는 보조 인터페이스  | 독립된 사실 source 또는 문서 접근의 필수 경로 |

## D0 baseline 구조와 확인 근거

### Route와 shell

- D0 당시 locale landing은 `apps/docs/app/[locale]/page.tsx`가 소유했습니다.
- D0 당시 문서 route는 `overview`, `getting-started`, `prepaint`, `local-first`, `tx`, `devtools` 여섯 개였습니다.
- `apps/docs/app/[locale]/layout.tsx`는 KO/EN, theme, AppShell, ChatWidget, Analytics와 공통 metadata를 소유했습니다.
- `apps/docs/app/[locale]/docs/layout.tsx`는 데스크톱 sidebar와 MDX reading column을 소유했습니다.
- `apps/docs/app/sitemap.ts`는 landing과 당시 문서 route의 locale별 sitemap을 생성했습니다.

### 콘텐츠와 RAG

- D0 당시 표시 문서 source는 `apps/docs/content/docs/*.{ko,en}.mdx`였습니다.
- D0 당시 RAG 입력 source는 `apps/docs/content/ai/{ko,en}/*.md`였습니다.
- 당시 `apps/docs/scripts/main.ts`는 `content/ai`만 읽어 locale별 vector namespace를 갱신했습니다.
- `content/ai/errors.md`에는 당시 표시 문서와 독립된 오류 설명과 처리 패턴이 있었습니다.
- 표시 문서와 RAG 입력을 수동으로 이중 관리해 내용 drift 가능성이 있었습니다.

### 확인된 재구성 입력

- 글로벌 navigation은 고정 영어 label과 locale 없는 `/docs/*` href를 사용했지만 Docs sidebar는 locale을 붙였습니다.
- landing quick-start의 일부 설명과 MDX 공통 컴포넌트의 `Copy`, `Copied`, `required`, `optional` label은 locale contract 밖에 있었습니다.
- landing은 Hero, Layers, Experience, Quick Start의 긴 선형 흐름으로 배치되어 적합성 판단과 레이어 선택이 분리되어 있었습니다.
- 자동 검증은 RAG prompt 단위 테스트 중심이었으며 route, mobile, locale, keyboard, Chat state의 browser acceptance evidence가 없었습니다.

## Invariant, Approved Additive Contract와 Non-goal

### Existing invariant

- 현재 package의 공개 API, 실제 동작, 오류와 지원 경계
- 기존 공개 route와 KO/EN locale 축
- light, dark, system theme
- code block, install tabs, API table, callout의 실제 기능
- canonical, hreflang, sitemap, robots, Open Graph metadata
- Chat 답변의 문서 groundedness와 Docs 비차단 원칙
- Docs, Playground, DevTools, Chat 사이의 역할 분리
- keyboard semantics, focus-visible, accessible name/state와 reduced motion

다음은 invariant가 아니며 재구성할 수 있습니다.

- landing과 문서의 section 순서
- navigation grouping과 information architecture
- DOM 골격과 component topology
- visual language, density와 composition
- 기술 사실을 보존하는 범위 안의 제목, 중복, 설명 순서

### Approved additive contract

첫 릴리스에서 다음 locale route를 추가합니다.

- `/[locale]/docs/patterns`
- `/[locale]/docs/troubleshooting`
- `/[locale]/docs/reference`

`Choose Your Setup`은 별도 route로 만들지 않고 landing, Overview와 Getting Started가 공유하는 데이터 모델과 UI로 추가합니다.

### Non-goal

- package API나 runtime behavior 변경
- RAG 검색 알고리즘, embedding model, vector infrastructure와 namespace 정책 변경
- 인증, 계정, 개인화 저장
- versioned docs와 자동 생성 API docs
- 별도 full-text search 시스템
- 대형 recipe gallery와 migration center
- interactive configuration wizard
- Docs 안에 Playground를 embed하는 것
- 근거 없는 성능, 원자성, 완전한 offline 또는 conflict resolution 주장

## 목표 Information Architecture

### Docs navigation

| Group                 | 첫 릴리스 항목                                 | Route                   |
| --------------------- | ---------------------------------------------- | ----------------------- |
| Start                 | Overview / Fit                                 | `/docs/overview`        |
| Start                 | Choose setup와 Getting Started                 | `/docs/getting-started` |
| Build                 | Prepaint                                       | `/docs/prepaint`        |
| Build                 | Local-First                                    | `/docs/local-first`     |
| Build                 | Tx                                             | `/docs/tx`              |
| Apply                 | Integration Patterns와 Recipes                 | `/docs/patterns`        |
| Verify & Troubleshoot | DevTools                                       | `/docs/devtools`        |
| Verify & Troubleshoot | Troubleshooting와 Limitations                  | `/docs/troubleshooting` |
| Reference             | API, Configuration, Events & Errors, Migration | `/docs/reference`       |

Playground는 `Verify & Troubleshoot` 문맥에서 외부 verification surface로 연결하되 Docs 내부 route처럼 가장하지 않습니다.

### Global navigation

- Docs
- Playground
- DevTools
- GitHub
- Chat 진입점
- Locale와 Theme

Package별 문서는 글로벌 navigation이 아니라 Docs sidebar가 소유합니다. 모든 내부 이동은 현재 locale을 유지합니다.

### Landing flow

1. FirstTx가 무엇인지와 어떤 CSR React 문제를 푸는지 설명합니다.
2. 잘 맞는 경우와 맞지 않는 경우를 같은 우선순위로 보여줍니다.
3. Prepaint, Local-First, Tx의 독립 사용과 조합을 비교해 필요한 setup을 선택하게 합니다.
4. 선택한 setup에서 기대할 행동과 지원 경계를 Playground 및 DevTools evidence로 연결합니다.
5. Getting Started와 Reference 중 다음 행동을 선택하게 합니다.

설정 선택기는 첫 진입 시 미선택 상태입니다. 선택 결과는 권장 설치 순서와 관련 문서 링크만 바꾸며 서버나 계정에 저장하지 않습니다. 대표 검증 상태는 Prepaint, Local-First와 Full Stack이고, Tx 단독 적합성과 사용 가능 여부도 현재 package contract에 맞게 명시합니다.

## Route별 콘텐츠 재구성

| Route           | 핵심 질문                                           | 유지할 내용                                                 | 이동하거나 합칠 내용                                                                 |
| --------------- | --------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Overview        | 이 제품이 내 앱에 맞는가?                           | 문제, 세 레이어 mental model, 독립 사용 가능성              | setup 선택과 fit/not-fit를 전면으로 이동                                             |
| Getting Started | 선택한 구성을 어떻게 안전하게 시작하는가?           | prerequisites, 설치, 실행 코드, 기대 결과                   | 중복 설치를 통합하고 setup별 경로와 검증 단계 추가                                   |
| Prepaint        | visual handoff를 어떻게 도입하고 제한하는가?        | 설치, lifecycle, capture, sanitization, handoff, settings   | 조합은 Patterns, errors/events는 Troubleshooting/Reference                           |
| Local-First     | persistent client cache와 sync를 어떻게 사용하는가? | model, hooks, TTL, sync, BroadcastChannel, Suspense         | 조합은 Patterns, API는 Reference, conflict 한계는 Troubleshooting                    |
| Tx              | optimistic saga를 어떻게 실행하고 복구하는가?       | lifecycle, run, retry, compensation, useTx, cancel, timeout | 조합은 Patterns, errors/events는 Troubleshooting/Reference, 비원자성 경계 명시       |
| DevTools        | 실제 runtime에서 무엇을 관찰할 수 있는가?           | 설치, panel, timeline, event list, 진단 흐름                | 전체 event catalog는 Reference, 절차는 Troubleshooting, internals는 advanced section |
| Patterns        | 레이어를 실제 앱 흐름에 어떻게 조합하는가?          | 기존 문서의 검증된 조합 예제                                | 새 API나 보장 발명 금지                                                              |
| Troubleshooting | 실패를 어떻게 식별하고 복구하는가?                  | `content/ai/errors`의 고유 오류 설명과 기존 limitation      | 오류별 symptom, cause, recovery, verification으로 정규화                             |
| Reference       | 정확한 contract를 어디서 다시 찾는가?               | API, configuration, events, errors, migration               | package별 중복 reference를 한 탐색 구조로 통합                                       |

## 콘텐츠 Source of Truth와 이관 계약

### Canonical source 결정

`apps/docs/content/docs/*.{ko,en}.mdx`를 사람이 읽는 문서와 RAG가 공유하는 유일한 canonical content source로 사용합니다.

- `content/ai`를 별도 수동 authoring surface로 유지하지 않습니다.
- RAG ingest는 canonical MDX를 검색 가능한 plain text 구조로 normalize한 뒤 기존 chunk, embedding과 vector 흐름에 전달합니다.
- `ApiTable`, `Callout`, `InstallTabs`의 사용자에게 보이는 제목, item, 설명과 command가 index text에서 유실되지 않아야 합니다.
- RAG 알고리즘과 vector infrastructure는 변경하지 않습니다.
- 실제 namespace reset/upsert는 외부 상태 변경이므로 별도 명시 승인과 운영 검증 없이 실행하지 않습니다.

### Source migration ledger

| Current source                       | Disposition         | Destination                                       | Exit gate                                             |
| ------------------------------------ | ------------------- | ------------------------------------------------- | ----------------------------------------------------- |
| `content/docs/overview.*.mdx`        | rewrite             | Overview                                          | fit, not-fit, mental model, setup 경로와 KO/EN parity |
| `content/docs/getting-started.*.mdx` | rewrite/merge       | Getting Started                                   | setup별 최소 경로, 필수/선택 구분, 기대 결과와 검증   |
| `content/docs/prepaint.*.mdx`        | keep/move           | Prepaint, Patterns, Troubleshooting, Reference    | lifecycle와 security boundary 무손실                  |
| `content/docs/local-first.*.mdx`     | keep/move           | Local-First, Patterns, Troubleshooting, Reference | sync와 conflict limitation 무손실                     |
| `content/docs/tx.*.mdx`              | keep/move           | Tx, Patterns, Troubleshooting, Reference          | compensation과 atomicity boundary 무손실              |
| `content/docs/devtools.*.mdx`        | keep/move           | DevTools, Troubleshooting, Reference              | event와 진단 흐름 무손실                              |
| `content/ai/*/errors.md`             | absorb              | Troubleshooting, Reference                        | 고유 오류와 recovery pattern 이관 확인                |
| 나머지 `content/ai`                  | retire after parity | canonical MDX ingest                              | heading/content parity와 ingest test 통과 후 제거     |

상세 heading 처분과 contract audit은 [Docs 재구성 콘텐츠 disposition ledger](./docs-redesign-content-ledger.md)가 소유합니다.

- universe: 표시 MDX 12개 파일 141개 heading, legacy AI Markdown 10개 파일 216개 heading
- coverage: 총 22개 파일, H1/H2/H3 357개를 누락·중복 없이 disposition
- audit 결과: package public API, error, event와 anchor 설정을 직접 대조
- correction gate: ledger의 F1-F7을 canonical content 이관 전에 수정

조용한 삭제는 허용하지 않습니다. 모든 기존 H1/H2/H3는 `keep`, `move`, `merge`, `retire` 중 하나로 닫고, retire에는 중복 또는 현재 contract와 불일치한다는 근거가 필요합니다.

## Acceptance와 Evidence Trace

2026-07-21 2차 검토에서 기존 13개 representative target 검증은 hydration 전에 없는 MDX ID, interactive component heading의 TOC 혼입, landing compatibility alias와 실제 429 transport 분류를 증명하지 못한 것으로 확인했습니다. 아래 AC3·AC8·AC10은 source validator와 network-controlled Playwright gate를 추가한 최종 evidence로 교정합니다.

| ID   | Actor/trigger/state                            | Expected outcome                                                  | Planned evidence                                    | Status                                                                                                                                  |
| ---- | ---------------------------------------------- | ----------------------------------------------------------------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| AC1  | 첫 방문 개발자                                 | 첫 화면에서 대상 사용자, 해결 문제와 not-fit을 이해               | landing desktop/mobile capture, copy audit          | complete — final KO desktop/mobile production evidence                                                                                  |
| AC2  | 도입 범위를 결정하는 개발자                    | Prepaint, Local-First, Tx의 독립 사용과 조합을 비교하고 경로 선택 | setup selector states, link assertions              | complete — neutral first-load 0개, 선택 후 1개, 4개 setup과 install/docs/Playground action 검증                                         |
| AC3  | 특정 답을 찾는 재방문 개발자                   | 선형 독파 없이 group, TOC와 deep link로 이동                      | navigation/anchor browser test                      | complete — 18개 MDX 159개 H2/H3의 SSR stable anchor, KO/EN parity·Prepaint allowlist, marker 기반 desktop/mobile TOC와 direct-hash 검증 |
| AC4  | 처음 구현하는 개발자                           | 현재 public API 코드로 설치부터 기대 결과 검증까지 완료           | snippet API audit, targeted build/test              | complete — D0/D4 public contract audit, canonical tests와 production build 통과                                                         |
| AC5  | 오류 또는 migration 정보를 찾는 개발자         | API, limitation, error, migration을 빠르게 재탐색                 | representative findability walkthrough              | complete — Troubleshooting/Reference KO/EN 200, grouped navigation과 contextual TOC 확인                                                |
| AC6  | KO/EN 사용자                                   | route와 locale이 유지되고 화면 내 언어가 섞이지 않음              | KO/EN route matrix, text audit                      | complete — 18/18 route, `lang`, locale-preserving shell/sidebar/MDX link 확인                                                           |
| AC7  | mobile, keyboard 또는 reduced-motion 사용자    | navigation, selector, tabs, copy, Chat을 기능 손실 없이 사용      | 390px capture, keyboard path, reduced-motion check  | complete — focus capture, tab keyboard, 390px text-spacing reflow, reduced-motion과 touch target 확인                                   |
| AC8  | Chat disabled/loading/error/unknown/rate-limit | Docs를 계속 읽고 탐색하며 복구 또는 관련 문서로 이동              | local fixture와 network-controlled browser evidence | complete — typed status/cause/retry mapping, intercepted 429·500 recovery와 본문·sidebar 유지, close 후 TOC 연속 탐색 검증              |
| AC9  | 문서 또는 RAG를 사용하는 개발자                | 표시 문서와 RAG가 같은 canonical contract를 반환                  | MDX normalization/chunk tests, parity ledger        | complete for local source contract — canonical tests 6/6과 public contract 48/48 KO/EN parity; 외부 index는 승인 범위 밖이라 미변경     |
| AC10 | 기존 URL 또는 검색 엔진                        | 기존 route, canonical, hreflang, sitemap과 주요 anchor가 유지     | route/metadata/sitemap tests                        | complete — 18/18 route metadata, raw SSR fragment 확인, KO/EN 동일 ID와 landing `#layers`·`#quickstart` compatibility alias 검증        |
| AC11 | product claim을 평가하는 개발자                | 구현이 증명하지 않는 보장을 문서가 주장하지 않음                  | package public API/test 대조, claim audit           | complete — D0-D4 F1-F10 correction과 public source audit 유지                                                                           |
| AC12 | 실제 행동을 검증하려는 개발자                  | 주요 문서에서 Playground 또는 DevTools의 적절한 검증 경로를 찾음  | destination/link assertions                         | complete — landing/setup/sidebar의 목적별 external Playground와 internal DevTools link 확인                                             |

## 화면과 상태 계약

최종 integration에서는 각 상태를 `implemented`, `covered-by-existing`, `not-applicable`, `deferred` 중 하나로 닫습니다.

| Surface            | 첫 릴리스 상태                                                                                                  | 원칙                                      | 현재 상태                                                                                                        |
| ------------------ | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Global shell       | 현재 route, KO/EN, light/dark/system, mobile menu open/closed                                                   | locale 유지, hydration 전후 layout 안정   | implemented — locale-aware task nav, mobile menu, theme/language control                                         |
| Landing            | setup 미선택, 각 layer 선택, 조합 선택                                                                          | 선택 전 중립, 선택은 안내만 변경          | implemented — neutral first-load와 4개 `aria-pressed` setup                                                      |
| Docs navigation    | active document, expanded group, mobile sidebar, current TOC                                                    | 직접 이동과 deep link 보장                | implemented — content-heading marker 기반 desktop/mobile TOC, route 전환 reset과 interactive heading 제외        |
| Reading surface    | first load, long content, valid anchor, invalid route/anchor                                                    | 본문 우선, 보조 UI가 읽기 비차단          | implemented — server-rendered stable fragment, KO/EN direct hash와 landing compatibility alias                   |
| Code and tabs      | idle, selected tab, copy success/failure, horizontal overflow                                                   | keyboard와 mobile에서 기능 유실 없음      | covered-by-existing + refined — locale copy state, keyboard tabs, 40px touch controls와 internal code overflow   |
| Verification links | Playground, DevTools, external destination                                                                      | 역할과 목적을 link context에 명시         | implemented — setup, landing proof와 sidebar verify block                                                        |
| Chat               | disabled, closed, empty, submitted, streaming, answered, insufficient context, network/server error, rate limit | 모든 상태에서 Docs 비차단, 추측 답변 금지 | implemented — typed HTTP error projection, retry metadata, 429·500 recovery와 deterministic network interception |
| Accessibility      | focus, accessible name/state, target size, reduced motion, zoom/reflow/text spacing                             | hover나 색상만으로 상태 전달 금지         | implemented — named controls, state roles, focus evidence, reduced-motion와 390px text-spacing reflow            |

Chat이 비활성인 환경에서는 진입점을 숨깁니다. Chat의 UI state 검증은 환경 파일이나 외부 서비스에 의존하지 않는 local fixture를 사용합니다.

## Baseline과 Capture 계획

### Baseline contract

- Artifact root: `artifacts/uiux/docs-redesign/`
- Desktop viewport: `1440x1000`
- Mobile viewport: `390x844`
- 대표 축:
  - KO light landing
  - EN dark long-form docs
  - KO mobile landing와 global navigation
  - EN mobile docs sidebar, TOC와 code overflow
  - Chat disabled, empty, streaming, insufficient-context, error와 rate-limit
  - keyboard focus와 reduced motion
- Data source: 공개 문서와 안전한 local Chat fixture만 사용
- Environment/source revision: capture 시 command, app revision과 runtime version 기록
- Sensitive data: 실제 사용자, 운영 또는 비공개 데이터 사용 금지

Baseline capture가 기술적으로 불가능하면 원인, 현재 DOM/route evidence와 대체 비교 방식을 기록한 뒤 후보 구현 전에 알립니다.

### Capture manifest schema

| Artifact path | Role                                 | Candidate | Viewport | Route/state/theme/locale | Environment/source | Selection                 | Evidence class                     | Sensitive-data handling   |
| ------------- | ------------------------------------ | --------- | -------- | ------------------------ | ------------------ | ------------------------- | ---------------------------------- | ------------------------- |
| TBD           | baseline / candidate / final / state | TBD       | TBD      | TBD                      | TBD                | selected / rejected / N/A | direction / production-correctness | safe public/local fixture |

### D1 baseline 결과

2026-07-21에 source revision `89676ec`을 대상으로 [capture manifest](../../artifacts/uiux/docs-redesign/capture-manifest.md)의 baseline 7장과 raw measurements를 생성했습니다. Next.js development indicator만 제품 UI가 아니므로 캡처에서 숨겼고, 앱 source와 상태는 변경하지 않았습니다.

- KO light landing은 desktop/mobile 모두 첫 viewport 안에서 제품 정의와 주요 CTA가 보이고 page-level horizontal overflow가 없습니다.
- landing은 제품 선택 job보다 큰 marketing hero와 긴 선형 흐름이 먼저이며 desktop 3,093px, mobile 5,574px입니다.
- EN dark Local-First 문서는 desktop sidebar와 reading column의 기본 가독성은 유지하지만 desktop 10,170px, mobile 12,069px인 장문에 현재 TOC가 없습니다.
- mobile docs에서는 문서 navigation과 TOC가 모두 보이지 않고 global navigation만 제공됩니다.
- code block은 page-level overflow를 만들지 않지만 mobile에서는 내부 가로 탐색이 필요하고 현재 viewport에 affordance가 약합니다.
- mobile global navigation open 상태와 첫 Tab focus의 visible outline을 확인했습니다. mobile toggle 자체의 accessible name과 button semantics는 없습니다.
- Chat trigger는 모든 baseline에서 0개이며 현재 disabled 계약과 일치합니다. empty, streaming, insufficient-context, error와 rate-limit은 D2의 안전한 local fixture에서 처음 재현합니다.
- local dev server는 navbar logo를 LCP로 감지하면서 lazy-load됐다는 경고를 반복 출력했습니다. 후보에서는 above-the-fold logo loading과 실제 LCP ownership을 함께 검증합니다.

## Visual Direction 탐색과 승인 Gate

### Anchor decision

`Company anchor — Stripe documentation structure only`로 확정합니다. FirstTx의 시각 정체성은 D2-B Layered Field Guide와 기존 local product signal이 소유하고, Stripe에서는 문서의 정보 구조와 탐색 원칙만 빌립니다.

2026-07-21 기준 [Stripe Get started](https://docs.stripe.com/get-started)는 `Common use cases`, `Start building`, `More resources`로 시작 경로를 묶고, [Stripe APIs](https://docs.stripe.com/apis)는 `Overview`, `Authentication and security`, `Make requests`, `Testing and data`, `Error handling`처럼 역할별로 주제를 묶습니다. [Stripe API Reference](https://docs.stripe.com/api)는 resource-oriented reference와 별도의 getting-started 경로를 제공합니다. 이 근거는 현재 구조 확인에만 사용하며 Stripe의 브랜드 표현을 디자인 source로 취급하지 않습니다.

| Anchor boundary   | Decision                                                                                                                                                                                                              |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Borrow            | 시작 경로를 use case / build / resource로 그룹화하는 원칙, dense reference에서 현재 위치와 resource hierarchy를 빠르게 찾는 원칙, 시작 문서와 정확한 reference를 분리하되 상호 연결하는 구조                          |
| Translate locally | FirstTx의 `Start / Build / Apply / Verify & Troubleshoot / Reference` IA, D2-B field-guide hierarchy, D2-A setup selector·grouped navigation·contextual TOC, Playground/DevTools verification link로 번역             |
| Do not borrow     | Stripe color, font, logo, gradient, radius, payment vocabulary, account/auth personalization, Ask AI surface와 구체적인 UI 수치                                                                                       |
| Evidence gap      | active uiux wiki는 reference translation과 IA 원칙을 지원하지만 company-specific docs 구조 page는 없습니다. `research/write-back-inbox.md`에 승격 후보로 기록했으며 단일 사례에서는 canonical page를 만들지 않습니다. |

| Signal             | Local mapping                                                                                                                                                                                                          |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Color              | light/dark neutral을 reading 기반으로 유지하고 rose는 선택·transaction·중요 상태에 제한합니다. logo의 cyan/blue는 runtime 관찰과 verification link의 보조 신호로 사용합니다. gradient는 정보 위계를 대신하지 않습니다. |
| Typography         | Latin은 기존 Geist, KO는 system fallback의 실제 glyph를 사용합니다. 제목 크기보다 문서 종류, section label, body와 mono code의 역할 대비를 우선합니다.                                                                 |
| Spacing/density    | landing은 첫 viewport에서 fit/not-fit과 setup 선택을 닫고, docs는 재탐색 속도를 위해 더 조밀하게 구성합니다. 의미 없는 큰 공백과 card 중첩은 줄입니다.                                                                 |
| Composition        | landing은 job → setup 선택 → 검증 경로로 재배치합니다. desktop docs는 grouped navigation / reading / contextual TOC, mobile은 명시적인 docs navigation과 on-page navigation을 제공합니다.                              |
| Interaction/motion | direct link와 persistent selected/current state를 우선합니다. motion은 topology 설명이나 상태 전환에만 쓰며 reduced-motion에서는 정적 결과를 즉시 표시합니다.                                                          |
| Component boundary | surface는 job 또는 state 경계를 설명할 때만 사용합니다. code, callout, selector와 Chat은 동일한 border/radius 언어를 공유하되 중첩 container는 피합니다.                                                               |

### Four directions

같은 content와 function invariant로 IA, layout과 component composition이 다른 네 방향을 설계합니다. 색, border와 spacing만 다른 후보는 방향으로 인정하지 않습니다.

| ID                       | IA/layout/component composition                                                                                                     | Strength                                                                              | Risk                                                                          | Preliminary score                                               | Implement? |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------- | ---------- |
| D2-A Decision Workbench  | landing을 job brief / setup selector / proof rail의 작업대로 구성하고 docs를 grouped nav / reading / contextual TOC의 3열로 구성    | 첫 방문자의 fit 판단과 레이어 선택을 첫 viewport에서 닫고 검증 경로를 선택과 인접시킴 | desktop에서 selector와 proof가 과밀해질 수 있음                               | product fit 2, hierarchy 2, feasibility 2, mobile/state 2 = 8/8 | yes        |
| D2-B Layered Field Guide | three-layer system map을 primary navigation으로 삼고 선택한 layer의 purpose / contract / next proof를 progressive disclosure로 전개 | Prepaint, Local-First, Tx의 독립·조합 관계를 가장 선명하게 설명                       | visual map이 장식으로 흐르거나 Secondary Job의 직접 재탐색이 늦어질 수 있음   | product fit 2, hierarchy 2, feasibility 2, mobile/state 1 = 7/8 | yes        |
| D2-C Evidence Index      | 검색·topic index·API/error/event quick links를 첫 화면에 두고 문서를 dense reference workspace로 구성                               | 재방문 개발자의 API, error, migration 재탐색이 가장 빠름                              | 첫 방문자에게 제품 정의와 setup 선택이 충분히 안내되지 않음                   | product fit 1, hierarchy 2, feasibility 2, mobile/state 1 = 6/8 | no         |
| D2-D Scenario Casebook   | blank screen, stale state, failed transaction 시나리오를 entry로 두고 관련 package와 verification을 사례 단위로 연결                | 문제 맥락과 실제 행동의 연결이 구체적임                                               | 대형 recipe gallery라는 non-goal에 가까워지고 canonical content 유지비가 커짐 | product fit 1, hierarchy 1, feasibility 1, mobile/state 2 = 5/8 | no         |

Product fit, hierarchy, feasibility, mobile/state 확장성으로 예비 평가한 상위 두 후보만 target repo의 격리 preview surface에 구현합니다. 후보는 desktop/mobile과 대표 state evidence를 남기고 skill rubric으로 채점합니다.

D2-A와 D2-B는 `apps/docs/previews/docs-redesign/`의 production bundle 밖 static prototype으로 구현합니다. 두 후보는 같은 safe fixture, locale/theme/state query contract와 실제 logo asset을 공유하며 production route, handler, canonical MDX와 navigation constant를 변경하지 않습니다.

### Implemented candidate evidence와 score

[Capture manifest](../../artifacts/uiux/docs-redesign/capture-manifest.md)에 후보별 KO light landing desktop/mobile, EN dark docs desktop/mobile과 Chat empty/error/streaming/rate-limit 8개 artifact를 기록했습니다. main thread가 동일 screenshot과 rubric으로 평가했으며 independent scoring은 사용할 수 없었습니다.

| Axis                       | D2-A Decision Workbench | D2-B Layered Field Guide |
| -------------------------- | ----------------------: | -----------------------: |
| First-glance comprehension |                       2 |                        2 |
| Information hierarchy      |                       2 |                        2 |
| Visual completion          |                       2 |                        2 |
| Product fit                |                       2 |                        2 |
| Implementation feasibility |                       2 |                        2 |
| Mobile stability           |                       2 |                        1 |
| State extensibility        |                       2 |                        1 |
| Surface economy            |                       1 |                        2 |
| Total                      |                   15/16 |                    14/16 |

- D2-A는 fit/not-fit, setup 선택, 설치와 verification을 한 작업 흐름에 연결하고 grouped docs navigation / reading / contextual TOC를 가장 직접적으로 제공합니다. 다만 landing의 fit/not-fit과 selector surface가 연속되어 정보 경계가 한 번 중첩됩니다.
- D2-B는 세 레이어의 순서와 독립 관계를 가장 강하게 설명하고 surface 사용이 절제돼 있습니다. 반면 mobile landing이 2,301px로 길고, docs path rail은 Secondary Job의 topic 재탐색보다 layer narrative를 우선하며 selector state 확장이 약합니다.
- 두 후보 모두 correction 후 page-level horizontal overflow가 없고 mobile code만 내부 가로 스크롤합니다. Chat panel은 문서 route와 별도 fixed surface이며 close와 recovery action을 제공합니다.

### Final decision proposal

`synthesize`로 승인됐습니다.

- Base: D2-B Layered Field Guide의 field-guide hero, editorial hierarchy, three-layer identity와 절제된 surface 사용
- Include from Stripe structure: task/use-case grouped start paths, 역할별 docs navigation, getting-started와 exact reference의 분리·연결
- Include from D2-A: interactive setup selector, grouped docs navigation / reading / contextual TOC, Chat state와 recovery contract
- Exclude from D2-A: generic workbench card가 landing identity를 지배하는 구성과 fit/not-fit surface 반복
- Exclude from D2-B: 전체 docs를 layer path만으로 탐색하는 rail과 모든 문서에 강제되는 큰 editorial margin-note topology
- Exclude from Stripe: brand visual, product vocabulary, account/auth와 Ask AI surface
- Production impact: landing, app shell/navigation, docs layout/TOC, shared setup fixture, scoped visual tokens, Chat presentation과 state fixture. Canonical content와 F1-F7 수정은 D4에서 함께 처리
- Remaining risk: 실제 MDX 장문과 interactive component를 합성 topology에 넣었을 때의 density, production Geist와 KO fallback의 실제 glyph metrics, mobile docs drawer/TOC 충돌, Chat과 bottom navigation의 stacking

### Final decision

- `select-one`: 한 후보를 그대로 선택
- `synthesize`: base 후보와 다른 후보의 검증된 요소를 명시적으로 결합

승인 합성은 `apps/docs/previews/docs-redesign/?candidate=approved`에 격리 구현했습니다. desktop/mobile, KO/EN, light/dark, setup selection, Chat streaming/error의 final direction artifact 4장을 남겼고 production route와 behavior는 변경하지 않았습니다.

2026-07-21 copy·typography refinement에서 다음을 추가로 닫았습니다.

- generic field-guide 문구와 `APPROVED`, `FIELD NOTE`, `SYSTEM MAP / DECIDE`, repeated margin label, static API checked badge를 final direction에서 제거
- landing H1을 setup 선택 job으로 직접화하고 KO/EN 기술 설명, CTA, Chat state와 접근성 label을 구체화
- selector가 package별 설치 명령, package ID와 문서 action을 함께 갱신하도록 수정
- Korean heading과 hero prose에 `keep-all`을 적용하고 approved surface의 mono 사용을 code, package ID와 step number 중심으로 제한
- static preview는 실제 system sans fallback을 측정하며 production Geist/KO fallback의 exact metric은 D5에서 다시 검증

위 refinement는 같은 날 사용자 명시 승인을 받았으며 D4와 D5는 이 승인본을 기준으로 진행합니다.

## 실행 단계

### D0. 계약과 콘텐츠 ledger 확정

> 상태: 2026-07-21 완료. [콘텐츠 disposition ledger](./docs-redesign-content-ledger.md)에 22개 파일의 H1/H2/H3 357개를 누락·중복 없이 기록했고 package source 대조에서 초기 F1-F7 correction gate를 확인했습니다. D4 parity audit에서 F8-F10을 추가 발견했으며 canonical content에서 모두 수정했습니다.

- 이 packet의 Job, invariant, additive route, IA, acceptance와 state matrix를 검산합니다.
- 기존 KO/EN 문서와 AI source의 모든 H1/H2/H3 disposition ledger를 닫습니다.
- code snippet, API table, event와 error를 package public exports, README와 tests에 대조합니다.
- 기존 deep-link anchor의 유지 또는 호환 anchor 계획을 확정합니다.

완료 조건:

- 모든 기존 heading의 destination과 KO/EN/RAG 처리가 결정되어 있습니다.
- 새 route에 들어갈 내용이 기존 사실의 이동인지 승인된 additive content인지 구분되어 있습니다.
- 지원되지 않는 claim과 조용한 콘텐츠 삭제가 없습니다.

### D1. 현재 baseline과 anchor 확정

> 상태: 2026-07-21 완료. KO light landing, EN dark long-form docs, mobile navigation, code overflow와 keyboard focus를 7개 artifact로 캡처했고 최초에는 `No external anchor`와 local signal mapping을 확정했습니다. D3 사용자 논의에서 Stripe structural-only company anchor로 변경했으며 local visual signal은 그대로 유지합니다.

- landing, docs reading, navigation, MDX component와 Chat의 desktop/mobile 대표 상태를 캡처합니다.
- exact route, viewport, locale, theme, data source와 revision을 manifest에 기록합니다.
- visual anchor와 local signal mapping을 결정합니다.

완료 조건:

- baseline artifact와 manifest가 실제 파일과 일치합니다.
- locale, theme, mobile과 long-form reading 위험이 baseline에 포함되어 있습니다.

### D2. 네 방향 설계와 상위 두 후보 격리 구현

> 상태: 2026-07-21 완료. 네 topology를 예비 평가했고 D2-A와 D2-B를 동일 fixture/query contract의 production-bundle 밖 static preview로 구현했습니다. desktop/mobile·KO/EN·light/dark·Chat state 8개 artifact와 rubric score를 기록했으며 production route는 변경하지 않았습니다.

- 기존 topology를 보존 조건으로 두지 않는 네 IA/layout 방향을 만듭니다.
- 예비 평가로 상위 두 후보만 preview route 또는 preview component에 구현합니다.
- 두 후보 모두 동일한 canonical content fixture와 setup/state contract를 사용합니다.
- desktop/mobile, locale/theme, navigation, code와 대표 Chat state를 캡처하고 score합니다.

완료 조건:

- 네 방향이 구조적으로 구분됩니다.
- 두 구현 후보의 screenshot, state coverage, score와 선택/기각 근거가 있습니다.
- production route는 변경되지 않았습니다.

### D3. 최종 방향 결정과 사용자 승인

> 상태: 2026-07-21 `approved`. 사용자가 D2-B를 base로 Stripe의 문서 구조 원칙과 D2-A의 setup/state interaction을 결합하는 `synthesize` 방향을 명시 승인했습니다. 승인 합성 프리뷰와 final direction evidence를 검증했으며 production route는 아직 변경하지 않았습니다.

- `synthesize` 결정과 승인 evidence를 packet에 기록했습니다.
- base candidate, 가져올 요소, 제외할 요소, 영향 파일과 위험을 명시했습니다.
- 승인 합성 프리뷰를 production 밖에서 검증했습니다.

완료 조건:

- 승인 evidence와 날짜가 packet에 기록됩니다.
- 승인 범위 밖의 production 변경이 없습니다.

### D4. 콘텐츠 canonicalization과 route foundation

> 상태: 2026-07-21 완료. F1-F10의 KO/EN 콘텐츠 정정과 Patterns, Troubleshooting, Reference의 KO/EN route foundation을 완료했습니다. 새 IA를 sidebar와 sitemap에 반영하고 모든 Docs page의 absolute canonical, KO/EN/x-default hreflang을 공통 metadata helper로 통일했습니다. RAG loader는 9개 문서 ID의 canonical MDX 18개를 직접 normalize하며 component copy, chunk와 public contract 48/48 양 locale coverage test가 통과했습니다. 사용자 승인 후 legacy `content/ai` 10개 파일을 삭제했고 production 잔여 참조는 0개입니다. 외부 vector reset/upsert는 실행하지 않았습니다. Production route HTML 검증은 통과했지만 root file-based OG metadata tree의 기존 `metadataBase` 경고는 후속으로 남깁니다.

- canonical MDX에 Overview, Getting Started와 기존 package 문서를 이관합니다.
- Patterns, Troubleshooting, Reference의 KO/EN route와 metadata를 추가합니다.
- MDX normalization을 통해 canonical content가 RAG input이 되게 합니다.
- `content/ai/errors`의 고유 내용을 흡수한 뒤 parity가 확인된 legacy AI source만 retire합니다.
- docs navigation, sitemap, canonical와 hreflang을 새 IA에 맞춥니다.

완료 조건:

- displayed docs와 RAG input이 하나의 canonical content source를 사용합니다.
- 모든 기존 route와 승인된 신규 route가 KO/EN으로 동작합니다.
- 실제 외부 vector index 변경 없이 normalization/chunk 결과를 로컬에서 검증할 수 있습니다.

### D5. 승인된 UI production 통합

> 상태: 2026-07-21 완료. D2-B field-guide visual base, Stripe structural-only grouped navigation과 D2-A setup/state interaction을 landing, locale-aware global shell, Docs 3-column/mobile layout, MDX components와 non-blocking Chat presentation에 통합했습니다. 공유 setup model은 landing, Overview와 Getting Started에서 사용하며 canonical MDX와 RAG source는 변경하지 않았습니다.

- landing, global shell, Docs sidebar/mobile navigation, TOC와 reading layout을 승인된 방향으로 교체합니다.
- Choose Your Setup 공유 모델을 landing, Overview와 Getting Started에 연결합니다.
- code block, install tabs, API table, callout의 locale과 접근성 상태를 정리합니다.
- Chat entry, panel과 recovery state를 Docs 비차단 구조로 통합합니다.
- 주요 문서에서 Playground와 DevTools verification 경로를 연결합니다.

완료 조건:

- 승인된 final direction만 production에 반영되어 있습니다.
- first-load, empty, error, disabled, selected, focus, reduced-motion과 mobile state가 계약대로 동작합니다.
- KO/EN 혼용과 locale 유실이 없습니다.

### D6. Cleanup, verification과 terminal state

> 상태: 2026-07-21 `verified`. `apps/docs/previews/docs-redesign`의 candidate-only HTML/JS/CSS와 잔여 참조를 제거하고 baseline/candidate/approved/final evidence는 보존했습니다. typecheck, lint, 6 tests, production build, `git diff --check`, 18-route metadata matrix와 desktop/mobile browser acceptance가 통과했습니다. 외부 vector reset/upsert는 실행하지 않았고 기존 root file-based OG `metadataBase` build 경고만 후속 위험으로 남습니다. 공개 README에는 final landing과 mobile Docs navigation 캡처 2장만 `docs/assets/docs`로 승격했습니다.

- candidate-only route, fixture, registry, component와 style scope를 제거합니다.
- baseline/candidate/final evidence와 decision packet은 유지합니다.
- acceptance와 실제 test/manual evidence를 양방향으로 연결합니다.
- material acceptance와 browser 검증이 모두 통과한 경우에만 packet을 `verified`로 닫습니다.

완료 조건:

- candidate-only code 또는 import가 남아 있지 않습니다.
- targeted native check와 production browser matrix가 통과합니다.
- 실패한 검증, 실행하지 못한 검증과 남은 위험이 숨김없이 기록됩니다.

## 예상 Ownership Boundary

| Boundary            | 예상 영향                                                                       |
| ------------------- | ------------------------------------------------------------------------------- |
| Route/metadata      | `apps/docs/app/[locale]`, `apps/docs/app/sitemap.ts`, `apps/docs/app/robots.ts` |
| Shell/navigation    | `apps/docs/components/app-shell.tsx`, `components/layout`, navigation constants |
| Landing             | `apps/docs/components/landing`, locale messages                                 |
| Docs reading/MDX    | docs layout, MDX components, content/docs                                       |
| Chat UI             | `apps/docs/components/chat`, local state fixture/test                           |
| RAG source pipeline | `apps/docs/scripts`, chunk/normalization tests, legacy content/ai retirement    |
| Verification        | `apps/docs` unit/component/browser tests와 artifact manifest                    |

실제 영향 파일은 후보 승인 전에 다시 좁혀 packet에 기록합니다. package source와 runtime behavior는 이 계획의 변경 경계 밖입니다.

## Verification 계획

작은 관련 검사부터 실행하고 blast radius에 따라 확장합니다. pnpm은 `/Users/younghoonkim/Library/pnpm/pnpm`을 사용합니다.

### Native checks

- Docs 관련 unit/component test
- `pnpm --filter @firsttx/docs typecheck`
- `pnpm --filter @firsttx/docs lint`
- `pnpm --filter @firsttx/docs test:run`
- `pnpm --filter @firsttx/docs build`
- `pnpm --filter @firsttx/docs test:e2e`
- 필요할 때만 root typecheck, lint, test와 build로 확장

### Content와 route checks

- KO/EN heading and destination ledger completeness
- public API, option, event, error와 code snippet 정합성
- 기존 및 신규 locale route response
- internal link, deep-link anchor와 locale retention
- canonical, hreflang, sitemap, robots와 Open Graph metadata
- canonical MDX normalization, chunk output와 RAG source parity
- legacy `content/ai` 참조 잔여 검색

### Browser와 accessibility checks

- `1440x1000` KO light landing
- `1440x1000` EN dark long-form docs
- `390x844` KO landing와 mobile navigation
- `390x844` EN docs, TOC, tabs와 code overflow
- Chat disabled, empty, submitted/streaming, insufficient context, network/server error와 rate limit
- keyboard-only path, focus-visible, accessible name/state announcement와 touch target
- reduced motion, zoom/reflow와 text spacing
- 잘못된 route/anchor와 recovery path

Playwright가 sandbox의 Chrome 종료 권한 문제로 실패하면 같은 standalone browser 검증을 승인된 외부 실행으로 다시 시도합니다.

## Risks와 Open Decisions

| Item                     | Risk                                                                   | Closure gate                                                                                                          |
| ------------------------ | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Visual anchor            | 특정 제품을 외형까지 모방하거나 company source가 local job을 덮을 위험 | D3에서 Stripe structural-only boundary와 borrowed / translated / excluded mapping 확정; D2-B가 visual identity를 소유 |
| Heading migration        | 긴 KO/EN 문서의 조용한 누락 가능성                                     | D0 disposition ledger 100% closure                                                                                    |
| MDX to RAG normalization | JSX component 내용이 index에서 유실될 수 있음                          | representative component fixture와 chunk snapshot test                                                                |
| Legacy anchors           | heading 재작성으로 외부 deep link가 깨질 수 있음                       | 159개 explicit anchor validator, KO/EN parity·Prepaint allowlist와 `#layers`·`#quickstart` compatibility test         |
| Chat state               | 외부 backend에 의존하면 재현 불가능                                    | unit status mapping과 Playwright `route.fulfill` 429·500 recovery test                                                |
| External vector update   | reset/upsert가 외부 상태를 변경                                        | 별도 명시 승인과 운영 runbook/evidence                                                                                |
| Candidate residue        | preview code가 production bundle에 남을 수 있음                        | route/import/registry residue search와 build                                                                          |

## 전체 완료 조건

- Primary와 Secondary Job이 landing, Docs IA와 acceptance에 연결되어 있습니다.
- 기존 여섯 문서 route와 신규 세 route가 KO/EN으로 동작합니다.
- 첫 화면에서 product definition, fit/not-fit과 setup 선택이 가능합니다.
- 사용자는 Prepaint, Local-First, Tx의 독립 사용과 조합을 판단할 수 있습니다.
- 모든 기존 H1/H2/H3가 disposition ledger에서 처리되고 기술 내용이 조용히 사라지지 않습니다.
- canonical MDX가 표시 문서와 RAG input의 단일 source입니다.
- API, configuration, events, errors, migration, troubleshooting과 limitation을 직접 다시 찾을 수 있습니다.
- code snippet과 공개 claim이 현재 package contract에 맞습니다.
- 기존 route, 주요 deep link와 SEO contract가 보존됩니다.
- locale 혼용 없이 light/dark/system과 desktop/mobile이 동작합니다.
- keyboard, focus, accessible state, reduced motion와 reflow evidence가 있습니다.
- Chat의 disabled/loading/error/unknown/rate-limit 상태가 Docs를 막지 않습니다.
- 주요 문서에 Playground 또는 DevTools verification 경로가 있습니다.
- 네 방향, 상위 두 후보, capture manifest, score, 사용자 승인과 final evidence가 packet에 남습니다.
- 승인된 방향만 production에 통합되고 candidate-only code가 제거됩니다.
- targeted test, typecheck, lint, build와 browser acceptance가 통과합니다.

## 다음 시작점

이 redesign workflow는 `verified`로 종료됐습니다. 외부 vector reset/upsert는 이번 범위에서 실행하지 않았으며 향후에도 별도 명시 승인과 운영 evidence가 필요합니다. 남은 독립 후속은 root file-based Open Graph metadata tree의 기존 `metadataBase` build 경고입니다.
