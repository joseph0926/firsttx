# 보안 취약점 분석

> 감사일: 2026-02-06 | 대상: `packages/prepaint/`, `packages/shared/`

## 전체 평가: 양호 (Good)

DOMPurify 우선 사용 + fallback 패턴이 잘 설계되어 있으며, `scrubSensitiveFields()`, `DANGEROUS_ATTRIBUTES` 목록(50+), `data-firsttx-volatile/sensitive` 마킹 시스템, 스냅샷 TTL(7일), CSP nonce 지원 등 보안 설계가 전반적으로 체계적입니다.

---

## 이슈 목록

### SEC-01: fallbackSanitize의 불완전한 이벤트 핸들러 필터링

- **심각도**: Medium
- **위치**: `packages/prepaint/src/sanitize.ts:40-48`, `packages/shared/src/browser.ts:85-94`
- **설명**: `fallbackSanitize()`에서 `on*` 접두사 속성을 제거하고 `javascript:`, `data:text/html` URI를 차단하지만 다음 벡터가 누락됨:
  1. `data:` URI의 다른 변형 (`data:text/javascript`, `data:application/xhtml+xml`)
  2. `vbscript:` URI (레거시, 현대 브라우저에서는 무관)
  3. HTML 엔티티 인코딩으로 `javascript:` 검사 우회 가능성 (DOMParser가 디코딩하므로 실제 우회는 어려움)
- **영향**: DOMPurify 미설치 환경에서 특수 `data:` URI를 통한 XSS 이론적 가능성
- **권장 수정**:
  - `data:text/html` 검사를 `data:` 전체로 확장 (허용된 data URI만 화이트리스트)
  - 또는 DOMPurify를 필수 의존성으로 격상

### SEC-02: Vite 플러그인 nonce 값 HTML 인젝션

- **심각도**: Medium
- **위치**: `packages/prepaint/src/plugin/vite.ts:81, 85, 90`
- **설명**: `nonce` 옵션이 HTML attribute에 직접 삽입됨: `nonce="${nonceValue}"`. `nonceValue`에 `">`가 포함되면 HTML 인젝션 가능.
- **영향**: 빌드 타임 공격. nonce 값은 일반적으로 개발자 제어하에 있으므로 실질적 위험은 낮지만, 외부 소스에서 동적 생성 시 위험.
- **권장 수정**:
  ```typescript
  const NONCE_REGEX = /^[A-Za-z0-9+/=]+$/;
  if (nonceValue && !NONCE_REGEX.test(nonceValue)) {
    throw new Error('Invalid nonce value');
  }
  ```

### SEC-03: SanitizeOptions allowedTags/allowedAttributes 화이트리스트 위험

- **심각도**: Medium
- **위치**: `packages/shared/src/browser.ts:26-31, 61-103`
- **설명**: `sanitizeHTML()`의 `SanitizeOptions`에서 호출자가 `script`이나 `onclick` 같은 위험한 태그/속성을 화이트리스트에 추가할 수 있음.
- **영향**: 라이브러리 사용자가 잘못된 옵션 전달 시 새니타이즈 무력화
- **권장 수정**:
  - `allowedTags`에서 `script`, `iframe` 등 핵심 위험 태그는 항상 제거 (화이트리스트에 추가해도 무시)
  - `ALWAYS_FORBIDDEN_TAGS` 상수 도입

### SEC-04: boot.ts에서 sanitize 후 innerHTML 이중 파싱

- **심각도**: Low
- **위치**: `packages/prepaint/src/boot.ts:226`
- **설명**: `extractSingleRoot()`에서 새니타이즈한 HTML을 `tmp.innerHTML = sanitized`로 파싱 후 `root.innerHTML = clean`으로 재삽입하는 이중 파싱 구조.
- **영향**: 현재 경로에서는 악용 불가. DOMPurify 없는 fallback에서 이론적 mutation XSS 가능성은 매우 낮음.
- **권장 수정**: 현재 구조 유지 가능.

### SEC-05: DANGEROUS_HTML_TAGS의 link 태그와 스타일 수집 불일치

- **심각도**: Low
- **위치**: `packages/shared/src/constants.ts:11-26`, `packages/prepaint/src/boot.ts:258-276`
- **설명**: 새니타이즈 시 `link` 제거하지만, `collectStyles()`에서 `link[rel~="stylesheet"]`를 수집하고 복원 시 `appendStyleResource()`에서 `href` 값 검증 없이 새 link 요소 생성.
- **영향**: IndexedDB 스냅샷 데이터 직접 조작 시 임의 외부 리소스 로드 가능 (이미 XSS가 있어야 하므로 추가 위험 제한적)
- **권장 수정**: `appendStyleResource()`에서 URL이 동일 origin인지 검증 추가.

### SEC-06: overlay.ts shadow DOM 내 link href 미검증

- **심각도**: Low
- **위치**: `packages/prepaint/src/overlay.ts:63-67`
- **설명**: SEC-05와 동일 패턴. shadow DOM에 외부 스타일시트 로드 시 `normalized.href` 미검증.
- **권장 수정**: href origin 검증 추가.

### SEC-07: resolveRouteKey()의 전역 함수 실행

- **심각도**: Low
- **위치**: `packages/prepaint/src/utils.ts:43-48`
- **설명**: `window.__FIRSTTX_ROUTE_KEY__`가 함수인 경우 호출. 프로토타입 오염과 결합 시 임의 코드 실행 이론적 가능성.
- **영향**: 단독으로는 공격자가 이미 JS 실행 가능해야 하므로 추가 위험 제한적.
- **권장 수정**: `Object.hasOwn(window, '__FIRSTTX_ROUTE_KEY__')` 체크 추가 고려.
