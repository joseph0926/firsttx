# 종합 요약 및 액션 아이템

> 감사일: 2026-02-06

## Critical 이슈 (즉시 대응 — 6건)

### 1. Background revalidation Race Condition

- **관점**: 데이터 무결성
- **위치**: `packages/local-first/src/sync-manager.ts:88-117`
- **설명**: `revalidateInBackground()`가 네트워크 응답을 기다리는 동안 사용자가 `patch()` 또는 `replace()`로 데이터를 변경하면, 백그라운드 revalidation이 `this.replace(fresh)`를 호출하여 사용자의 최근 변경을 덮어쓴다.
- **영향**: 사용자 데이터 사일런트 손실
- **수정 방향**: generation counter 도입 — 로컬 변경이 있었으면 revalidation 결과 폐기. 또는 revalidation 전후 데이터를 비교하여 중간 변경 감지.

### 2. DOM 직렬화 DANGEROUS_ATTRIBUTES 이중 루프

- **관점**: 성능
- **위치**: `packages/prepaint/src/capture.ts:151-172`
- **설명**: `querySelectorAll('*')` + `DANGEROUS_ATTRIBUTES.forEach` 이중 루프로 O(N×M) 복잡도. 1000 요소 DOM에서 53,000회 `hasAttribute`/`removeAttribute` 호출.
- **영향**: 큰 DOM에서 캡처 시간 급증, `visibilitychange` 핸들러 내 실행으로 bfcache 이탈 가능
- **수정 방향**: `DANGEROUS_ATTRIBUTES`를 `Set`으로 캐시하고 `el.attributes` 단일 순회로 변경. 또는 `TreeWalker` API 사용.

### 3-6. 핵심 모듈 테스트 전무

| #   | 모듈                             | 미테스트 핵심 로직                                           |
| --- | -------------------------------- | ------------------------------------------------------------ |
| 3   | `local-first/cache-manager.ts`   | 상태 전이, subscriber 알림, snapshot 참조 동등성             |
| 4   | `local-first/sync-manager.ts`    | getSyncPromise dedupe, revalidateInBackground, replace merge |
| 5   | `local-first/storage-manager.ts` | load 버전 마이그레이션, Zod 실패 시 삭제, enqueue 직렬화     |
| 6   | `devtools/bridge/core.ts`        | 이벤트 버퍼링, BroadcastChannel 통신, 고우선순위 영속화      |

---

## 우선순위별 액션 아이템

### P0 — 이번 스프린트

1. `sync-manager.ts` revalidation race condition 수정
2. `capture.ts` / `sanitize.ts` DANGEROUS_ATTRIBUTES Set 최적화
3. `cache-manager`, `sync-manager`, `storage-manager` 단위 테스트 추가

### P1 — 다음 스프린트

4. DevTools bridge 자동 초기화 → 조건부 초기화로 변경 (`__FIRSTTX_DEV__` 플래그)
5. 트랜잭션 `CompensationFailedError` 발생 시 사용자 피드백 강화
6. IndexedDB `onversionchange` 커넥션 유실 복구 로직 추가
7. `devtools/bridge/core.ts` 테스트 추가
8. `operationQueue` 에러 격리 — 실패 시 후속 operation 취소 또는 상태 보장

### P2 — 백로그

9. DOMPurify를 필수 의존성(dependency)으로 격상 검토
10. Vite 플러그인 nonce 값 검증 (base64 알파벳 제한)
11. fallbackSanitize `data:` URI 필터링 강화
12. 스타일시트 href origin 검증 (`boot.ts`, `overlay.ts`)
13. E2E 오프라인/크로스탭 시나리오 추가
14. DevTools 패널 이벤트 배열 상한 제한 (CircularBuffer)
15. `@firsttx/shared` `"sideEffects": false` 추가
16. 패키지 간 통합 테스트 추가 (tx + local-first 연동)
