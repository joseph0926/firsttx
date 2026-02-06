# 성능 병목 분석

> 감사일: 2026-02-06 | 대상: `packages/prepaint/`, `packages/devtools/`, `apps/playground/`

## 전체 평가

Prepaint의 DOM 직렬화/새니타이즈 이중 루프가 핵심 성능 병목. DevTools bridge의 프로덕션 side-effect와 메모리 관리도 개선 필요. Playground는 양호.

---

## 이슈 목록

### PERF-01: serializeRoot DANGEROUS_ATTRIBUTES 이중 루프 (Critical)

- **심각도**: Critical
- **위치**: `packages/prepaint/src/capture.ts:151-172`
- **설명**: `clone.querySelectorAll('*')` 전체 자손 요소 배열화 후 `DANGEROUS_ATTRIBUTES.forEach` 이중 루프. 1000 요소 DOM에서 53,000회 `hasAttribute` + `removeAttribute` 호출.
- **영향**: DOM이 클수록 캡처 시간 O(N×M)으로 증가. `visibilitychange` 핸들러 내 실행으로 느린 디바이스에서 bfcache 이탈 가능.
- **권장 수정**:

  ```typescript
  // Before: O(N × M)
  allElements.forEach((el) => {
    DANGEROUS_ATTRIBUTES.forEach((attr) => el.removeAttribute(attr));
  });

  // After: O(N × A) where A = actual attributes per element
  const dangerousSet = new Set(DANGEROUS_ATTRIBUTES);
  allElements.forEach((el) => {
    for (let i = el.attributes.length - 1; i >= 0; i--) {
      const name = el.attributes[i].name;
      if (dangerousSet.has(name) || name.startsWith('on')) {
        el.removeAttribute(name);
      }
    }
  });
  ```

### PERF-02: fallbackSanitize 이중 루프 (boot critical path)

- **심각도**: High
- **위치**: `packages/prepaint/src/sanitize.ts:24-57`
- **설명**: PERF-01과 동일 패턴. 추가로 DOMParser 파싱 + `Array.from(el.attributes)` 배열 복사. boot critical path에 위치.
- **영향**: boot 시점 복원 시간(restoreDuration) 증가. "0ms 빈 화면" 목표에 반하는 오버헤드.
- **권장 수정**: `DANGEROUS_ATTRIBUTES`를 `Set`으로 캐시. `name.startsWith('on')` 우선 체크로 Set 조회 최소화. DOMPurify 필수화로 fallback 경로 자체를 최소화.

### PERF-03: invalid snapshot 시 DB 불필요 재오픈

- **심각도**: High
- **위치**: `packages/prepaint/src/boot.ts:153-171`
- **설명**: 스냅샷 유효하지 않을 때 `db.close()` 후 `openDB()` 재호출. 유효성 검사 전에 DB를 닫아 삭제를 위해 다시 열어야 함.
- **영향**: 손상된 스냅샷 시 boot 시간에 DB open 대기 시간 추가.
- **권장 수정**: snapshot 읽기 전 db를 닫지 않고, 유효성 검사 + 삭제 완료 후 한 번에 닫도록 변경.

### PERF-04: DevTools bridge 자동 초기화 side-effect

- **심각도**: High
- **위치**: `packages/devtools/src/bridge/index.ts:29-31`
- **설명**: `index.ts` 모듈 로드 시 즉시 `createDevToolsBridge()` 실행. import만으로 BroadcastChannel 생성, IndexedDB 열기, window.addEventListener 등록 발생. `"sideEffects": false` 미선언으로 tree-shaking 불가.
- **영향**: 프로덕션에서 DevTools 미사용 시에도 모든 이벤트가 buffer에 쌓이고 BroadcastChannel로 전송.
- **권장 수정**: 자동 초기화 제거. `__FIRSTTX_DEV__` 플래그로 게이팅. `"sideEffects": false` 선언 추가.

### PERF-05: cleanupOldEvents 무조건 실행

- **심각도**: Medium
- **위치**: `packages/devtools/src/bridge/core.ts:485-536`
- **설명**: 매 HIGH priority 이벤트 persist 후 호출. 삭제 필요 없어도 매번 IndexedDB transaction + cursor open 수행. 200개 미만이면 전부 삭제.
- **권장 수정**: 조건부 실행 (buffer.length > threshold). `count` 쿼리로 수 확인 후 초과분만 삭제.

### PERF-06: filterEvents JSON.stringify 반복

- **심각도**: Medium
- **위치**: `packages/devtools/src/panel/utils/filter.ts:42`
- **설명**: 검색 시 매 이벤트마다 `JSON.stringify(event.data).toLowerCase().includes(searchLower)` 호출. 타이핑마다 전체 목록 직렬화 반복.
- **권장 수정**: 이벤트 추가 시 검색용 문자열 미리 캐시. 또는 debounce 적용.

### PERF-07: DevTools 패널 무한 성장 events 배열

- **심각도**: Medium
- **위치**: `packages/devtools/src/panel/App.tsx:41`
- **설명**: `setEvents((prev) => [...prev, ...message.events!])`로 무한 누적. 매 업데이트마다 전체 배열 spread 복사.
- **권장 수정**: 최대 이벤트 수 제한 (예: 최근 1000개). CircularBuffer 패턴 또는 slice 적용.

### PERF-08: collectStyles STYLE_FETCH_TIMEOUT 5초

- **심각도**: Medium
- **위치**: `packages/prepaint/src/capture.ts:79-149`
- **설명**: 외부 스타일시트 fetch timeout이 5초. `visibilitychange` 시점에서 과도한 대기.
- **권장 수정**: timeout 1-2초로 축소. 또는 `visibilitychange`에서는 캐시된 스타일만 사용.

### PERF-09: TimelineSVG config 객체 참조 불안정

- **심각도**: Medium
- **위치**: `packages/devtools/src/panel/components/TimelineSVG.tsx:33`
- **설명**: `{ ...DEFAULT_TIMELINE_CONFIG, ...configOverride }` 매 렌더마다 새 객체 생성 → `useMemo` 의존성 항상 변경 → 재계산 매번 실행.
- **권장 수정**: `config`를 `useMemo`로 감싸서 `configOverride` 변경 시에만 재생성.

### PERF-10: shared 패키지 sideEffects 미선언

- **심각도**: Low
- **위치**: `packages/shared/package.json`
- **설명**: `"sideEffects": false` 미선언. 다른 패키지는 이미 선언됨.
- **권장 수정**: `"sideEffects": false` 추가.

### PERF-11: resolveHref anchor 요소 매번 생성

- **심각도**: Low
- **위치**: `packages/prepaint/src/capture.ts:46-63`
- **설명**: href 해석을 위해 매번 `document.createElement('a')` 생성. 스타일시트 많으면 GC 비용 누적.
- **권장 수정**: `new URL(href, document.baseURI)` 직접 사용.
