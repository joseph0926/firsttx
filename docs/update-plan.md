> 2026.07.14

> “CSR 재방문용 visual cache + IndexedDB persistent cache + optimistic saga”

반면 현재의 “SSR-level hydration / local-first conflict resolution / atomic transaction” 표현은 구현보다 앞서 있습니
다. 다음 기능 릴리스 전에 이를 바로잡는 것을 권합니다.

## 우선순위

1. P0 Prepaint의 hydration 방향 수정

packages/prepaint/src/helpers.ts:196는 이전에 캡처한 클라이언트 DOM을 hydrateRoot()로 hydrate합니다. 그러나 React는
hydrateRoot를 react-dom/server가 생성한 HTML에 연결하는 API로 정의하며, 순수 클라이언트 렌더 HTML에 사용하는 것은
지원하지 않습니다. mismatch는 최악의 경우 잘못된 요소에 event handler가 붙을 수 있습니다. React 공식 문서
(https://react.dev/reference/react-dom/client/hydrateRoot)

또한 root child가 정확히 1개가 아니면 강제로 unmount/re-render하는 guard가 있어 packages/prepaint/src/helpers.ts:77,
정상적인 Fragment·복수 최상위 노드도 손상된 상태로 취급합니다.

권고:

- 캡처 DOM은 hydration 대상이 아닌 비상호작용 visual overlay로만 사용합니다.
- 실제 앱은 항상 깨끗한 createRoot()로 시작하고, 준비 신호 후 overlay를 제거합니다.
- 기존 hydration/root guard는 제거하거나 명시적인 experimental 옵션으로 격리합니다.
- SSR-level, automatic hydration, 0ms 마케팅 표현은 측정 가능한 표현으로 낮춥니다.

2. P0 Prepaint 저장·보안 기본값 수정

현재 기본 동작은 모든 route의 DOM과 같은 출처 CSS를 저장하고, packages/prepaint/src/types.ts:1 보관합니다. 제품이 권
장하는 CRM·대시보드가 오히려 PII 위험이 큰 surface입니다.

캡처도 packages/prepaint/src/capture.ts:339에서 시작하면서 CSS fetch까지 수행합니다. Chrome은 beforeunload를 종료
신호로 사용하지 말라고 권고하고, 종료 상태의 callback 기반 비동기 API는 신뢰할 수 없다고 명시합니다. Chrome Page
Lifecycle 가이드 (https://developer.chrome.com/docs/web-platform/page-lifecycle-api)

CSP nonce도 packages/prepaint/src/plugin/vite.ts:69되는데, nonce는 응답마다 달라야 합니다. 정적 Vite 출력에는 hash
또는 외부 script 방식이 맞습니다. MDN CSP 가이드
(https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP#nonces)

권고:

- route allowlist를 기본값으로 전환
- TTL·최대 snapshot 크기·저장 CSS 여부를 설정 가능하게 변경
- beforeunload 제거, 활성/유휴 시점에 미리 snapshot 준비
- 민감 화면에서는 명시적 opt-in 없이는 저장하지 않기
- 정적 Vite는 CSP hash/external asset, server adapter만 runtime nonce 지원

3. P0 Local-First의 데이터 계약 보강 또는 명칭 축소

실제 구현에는 충돌 감지가 없습니다. isConflicted는 packages/local-first/src/types.ts:51이고, merge는 서버 replace에
만 적용됩니다. 멀티 탭 patch는 read-modify-write 경쟁에서 last writer가 이깁니다.

구체적인 falsy 데이터 결함도 있습니다.

- version/initialData 판정이 truthiness 기반입니다. packages/local-first/src/storage-manager.ts:46
- Suspense도 false, 0, ""를 데이터 없음으로 처리합니다. packages/local-first/src/suspense.ts:24
- initialData: false 마이그레이션을 직접 재현했으며 결과는 { snapshot: null, stored: null }이었습니다.
- 모델마다 등록하는 BroadcastChannel listener의 해제 경로도 없습니다. packages/local-first/src/model.ts:60

권고:

- 단기: “local-first” 대신 “persistent client cache”로 설명하고 conflict-resolution 주장을 제거
- 중기: record revision/CAS, transaction complete 기준 저장, 충돌 상태·재시도 정책 도입
- 모든 generic 값 판정을 data !== null / initialData !== undefined로 수정
- React 18/19 × Zod 3/4 소비자 테스트 매트릭스 추가
- 현재 문서의 version: "1"도 실제 number 타입과 불일치합니다. apps/docs/content/docs/local-first.ko.mdx:53

4. P1 Tx를 atomic transaction이 아닌 saga로 명확화

엔진 자체는 보상 작업을 역순 실행하는 saga에 가깝습니다. 원격 API와 IndexedDB를 원자적으로 commit하지 않으므로
“atomic” 표현은 제거하는 편이 정확합니다.

useTx는 모든 동시 mutation이 하나의 abort/cancel ref와 boolean 상태를 공유합니다. packages/tx/src/hooks.ts:40 먼저
끝난 작업이 isPending=false와 controller 초기화를 수행해 나머지 작업 상태를 깨뜨릴 수 있습니다. 동시성 테스트도 실제
독립성을 확인하지 않고, 세 요청 결과가 모두 [3, 3, 3]인 것을 성공으로 간주합니다. packages/tx/tests/
hooks.test.ts:423

useTx는 single-flight, queue, latest-wins, parallel 중 하나를 명시적으로 선택하도록 API를 재설계해야 합니다.

5. P1 DevTools protocol을 단일 계약으로 통합

현재 producer와 DevTools의 event 타입이 서로 다릅니다. 예를 들어 Tx producer는 hasTransition, attempt, duration을 보
내지만 packages/devtools/src/bridge/types.ts:214은 useTransition, attemptNumber, totalDuration을 기대합니다. 연결 타
입을 unknown으로 두어 typecheck가 이를 검출하지 못합니다.

추가 결함:

- HIGH event 저장 직후 매번 오래된 event를 최대 200개 삭제하므로, 데이터가 적을 때는 방금 저장한 event까지 삭제됩니
  다. packages/devtools/src/bridge/core.ts:434

- panel command는 background에서 로그만 남기고 전달하지 않습니다. packages/devtools/src/extension/background.ts:57
- npm package는 0.1.30, extension manifest와 ready event는 0.1.0입니다. packages/devtools/package.json:2, packages/
  devtools/src/extension/manifest.json:1

독립 protocol 모듈을 source of truth로 만들고 producer·bridge·panel이 동일 타입과 runtime validator를 소비해야 합니
다.

## 버전 업데이트 판단

즉시 처리할 항목:

- [완료] Next 16.1.6 / eslint-config-next 16.1.6 / lock의 @next/mdx 16.2.10을 현재 16.2.10으로 정렬합니다. npm registry
  (https://registry.npmjs.org/next/latest)

- [완료] DOMPurify 3.3.1 → 3.4.12: 보안 경계 의존성이므로 우선 업데이트하거나, 실제 공개 API에서 사용하지 않는 peer라면
  제거합니다. npm registry (https://registry.npmjs.org/dompurify/latest)

- [완료] ~~pnpm 11.11.0 → 11.12.0~~, Turbo lock 2.10.4 → 2.10.5
- React는 lockfile이 이미 최신 19.2.7이므로 manifest/override만 실제 설치 버전과 정렬합니다. npm registry
  (https://registry.npmjs.org/react/latest)

별도 migration으로 분리할 항목:

- Vite 7.3.6 → 8.1.4: Prepaint plugin을 Vite 7/8 양쪽에서 검증한 후 peer range를 확장합니다. npm registry
  (https://registry.npmjs.org/vite/latest)

- TypeScript 5.9 → 7, ESLint 9 → 10
- AI SDK 5 → 7, @ai-sdk/* 2 → 4

이 major 업데이트들은 한 PR에서 묶지 않는 편이 좋습니다.

공개 브라우저 패키지의 engines.node >=24도 재검토해야 합니다. repo와 앱의 개발 런타임은 Node 24로 유지하되, 라이브러
리는 ES2022 정도로 빌드하고 실제 소비자 최소 Node 버전을 별도로 선언하는 편이 배포 범위를 훨씬 넓힙니다.

## 검증 상태

- typecheck: 성공
- test:run: Turbo 9개 task 성공
- ESLint 직접 실행: packages/docs 성공, playground hook dependency 경고 1건
- docs·공개 패키지·playground·devtools build: 성공
- docs build 경고: metadataBase 누락
- 브라우저 E2E와 실제 npm packed-consumer 검증은 미실행
- 작업 트리는 변경 없이 깨끗합니다.

탐색은 주요 source, 테스트, 패키지 manifest/lockfile, 문서 계약, CI/release 설정을 직접 확인했습니다. UI 컴포넌트 전
체와 운영 로그는 전수 감사 대상에서 제외했습니다.
