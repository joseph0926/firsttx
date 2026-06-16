# AGENTS.md

## Default

- CLAUDE.md는 `@AGENTS.md` 한줄만 유지한다.

## Project Map

- 이 저장소는 `pnpm` + Turborepo 모노레포다.
- Node 런타임은 `>=24` 기준이다.
- 앱:
  - `apps/docs`: Next.js 문서 사이트와 문서 기반 챗봇/RAG 표면
  - `apps/playground`: Vite 기반 데모/시나리오 앱
- 패키지:
  - `packages/prepaint`: CSR 재방문 DOM snapshot/capture/restore
  - `packages/local-first`: IndexedDB 기반 React data sync
  - `packages/tx`: optimistic transaction/retry/rollback
  - `packages/devtools`: Chromium DevTools companion
  - `packages/shared`: 공통 상수/유틸/에러

## Package And Runtime

- 패키지 작업은 `pnpm`을 사용한다.
- 전체 실행보다 대상 workspace에 대한 `pnpm --filter <workspace> ...` 검증을 우선한다.
- 루트 검증은 필요할 때만 `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test:run`으로 확장한다.

## Verification

- 완료 전 가능한 가장 작은 관련 검증을 실행한다.
- 검증을 실행할 수 없으면 이유와 가장 가까운 대체 확인 방법을 보고한다.
- `turbo.json`상 `lint`, `typecheck`, `test*`는 의존 패키지의 `^build`를 동반할 수 있으므로 범위를 의식해 실행한다.
