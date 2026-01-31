# FirstTx 프로젝트 분석

- 기준일: 2026-01-31
- 범위: 모노레포 전체 (apps/_, packages/_)

## 1. 프로젝트 개요

- 목적: CSR 앱에서 **재방문 시 빈 화면을 제거**하고, IndexedDB 기반 로컬 상태 + 낙관적 트랜잭션을 결합해 SSR 수준의 UX를 제공
- 핵심 제품군:
  - **Prepaint**: 방문 직전 UI 스냅샷을 IndexedDB에 저장/복원해 즉시 복구
  - **Local-First**: IndexedDB ↔ React 상태 동기화
  - **Tx**: 낙관적 업데이트의 원자적 실행/롤백
- 모노레포 구성: `pnpm` + `turbo` 기반 워크스페이스
- 런타임: Node >= 22

## 2. 저장소/워크스페이스 구조

```
apps/
  docs/          # Next.js 문서 사이트
  playground/    # Vite + React Router 데모
packages/
  prepaint/      # UI 스냅샷/복원
  local-first/   # IndexedDB + React 동기화
  tx/            # 트랜잭션 엔진
  shared/        # 공통 유틸리티
  devtools/      # Chrome DevTools 확장
```

- 워크스페이스 정의: `pnpm-workspace.yaml`에서 `apps/*`, `packages/*` 지정
- 태스크 오케스트레이션: `turbo.json`에서 build/test/lint/typecheck/coverage/persistent(dev) 정의
- 베이스 설정:
  - `tsconfig.base.json` (strict + paths 매핑)
  - `eslint.config.js` (루트 lint 규칙, apps/\*는 각 앱이 별도 관리)
  - `.changeset/` (릴리스 자동화)

## 3. 애플리케이션 레이어 (apps)

### 3.1 Docs (`apps/docs`)

- 스택: Next.js 16 (App Router), React 19, Tailwind CSS 4, next-intl, MDX
- 국제화: `i18n/routing.ts`에서 `ko`/`en` 로케일 지원
- 주요 디렉터리
  - `app/[locale]/`: locale 기반 라우팅
  - `content/`: 문서/AI 관련 콘텐츠 (MDX)
  - `components/`, `hooks/`, `lib/`, `providers/`: UI 및 공통 로직
- 설정 요약
  - `next.config.ts`: MDX + next-intl 플러그인 조합
  - `components.json`: shadcn/ui 구성

### 3.2 Playground (`apps/playground`)

- 스택: Vite 7, React 19, React Router 7, Tailwind CSS 4
- 라우팅: `src/router.tsx`에서 `createBrowserRouter` + lazy route 구성
- Prepaint 통합: `vite.config.ts`에서 `firstTx()` 플러그인 사용
- 주요 디렉터리
  - `src/pages/`: 시나리오별 페이지
  - `src/models/`, `src/hooks/`, `src/components/`: 도메인 로직/뷰 구성
- E2E 및 지표
  - `playwright.config.ts`: dev server 연동, trace/video 보관
  - `tests/README.md`: 시나리오별 지표 수집 계획

## 4. 패키지 레이어 (packages)

### 4.1 `@firsttx/prepaint`

- 역할: CSR 재방문 시 **UI 스냅샷을 즉시 복원**
- 엔트리/빌드: `exports` + `tsup` 기반 빌드
- 주요 모듈: `boot.ts`, `capture.ts`, `handoff.ts`, `plugin/vite.ts`

### 4.2 `@firsttx/local-first`

- 역할: IndexedDB 모델 정의 + React 동기화
- 엔트리/빌드: `exports` + `tsup` 기반 빌드
- 주요 모듈: `model.ts`, `storage-manager.ts`, `sync-manager.ts`, `hooks.ts`
- 테스트: Vitest (node 환경)

### 4.3 `@firsttx/tx`

- 역할: 트랜잭션 실행/롤백 + 재시도 로직
- 엔트리/빌드: `exports` + `tsup` 기반 빌드
- 주요 모듈: `transaction.ts`, `retry.ts`, `hooks.ts`

### 4.4 `@firsttx/shared`

- 역할: 공통 유틸리티/타입
- 엔트리/빌드: `exports` + `tsup` 기반 빌드
- 주요 모듈: `constants.ts`, `errors.ts`, `type-guards.ts`

### 4.5 `@firsttx/devtools`

- 역할: Chrome DevTools 확장 (Prepaint/Local-First/Tx 이벤트 가시화)
- 구조: `src/bridge`, `src/extension`, `src/panel`
- 빌드
  - 패널: `vite.config.ts`로 `src/panel` 번들
  - 확장: `tsup` + 패키징 스크립트

## 5. 공통 툴링/품질

- TypeScript
  - `tsconfig.base.json`: `strict`, `moduleResolution: bundler`, workspace `paths` 매핑
- Lint/Format
  - 루트 ESLint 설정 + 앱별 ESLint 설정
  - Prettier + Tailwind CSS 플러그인
  - Husky + lint-staged
- 테스트
  - 패키지: Vitest (대부분 `happy-dom`, local-first는 `node`)
  - 앱: Playground는 Playwright E2E
- 빌드/번들
  - 라이브러리: `tsup`
  - 앱: `next build` / `vite build`

## 6. CI/CD & 릴리스

- GitHub Actions
  - `pr.yml`: lint/typecheck/test/coverage/build
  - `release.yml`: Changesets 기반 릴리스/배포
  - `e2e-playwright.yml`, `playground-metrics.yml`, `codeql.yml`, `scorecard.yml`, `rollback.yml`
- Changesets
  - `.changeset/config.json`에서 `@firsttx/docs`, `playground` 패키지는 릴리스 대상 제외

## 7. 환경 변수/운영 고려

- `turbo.json` build env
  - `NEXT_PUBLIC_ENABLE_CHAT`, `OPENAI_API_KEY`, `UPSTASH_*` 등
- Playground
  - `VITE_METRICS_BASE_URL`로 지표 수집/로딩 경로 제어

## 8. 의존성 관계 요약

- 라이브러리 계층
  - `@firsttx/shared` ← `@firsttx/prepaint`, `@firsttx/local-first`, `@firsttx/tx`
  - `@firsttx/devtools` ← `@firsttx/shared`, `@firsttx/prepaint`, `@firsttx/local-first`, `@firsttx/tx`
- 앱 계층
  - `apps/playground` ← `@firsttx/prepaint`, `@firsttx/local-first`, `@firsttx/tx`
  - `apps/docs`는 독립 문서 앱 (workspace 패키지 직접 의존 없음)
