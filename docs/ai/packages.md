# 패키지

## @firsttx/prepaint

- 목적: React 로드 전 마지막 UI 스냅샷 재생
- 엔트리: `packages/prepaint/src/index.ts`
- 주요 모듈: `boot.ts`, `capture.ts`, `handoff.ts`, `plugin/vite.ts`
- 빌드/테스트: `tsup`, `vitest`

## @firsttx/local-first

- 목적: IndexedDB 모델 + React 동기화 레이어
- 엔트리: `packages/local-first/src/index.ts`
- 주요 모듈: `model.ts`, `storage-manager.ts`, `sync-manager.ts`, `hooks.ts`
- 테스트는 `node` 환경에서 실행

## @firsttx/tx

- 목적: 낙관적 UI를 위한 원자적 트랜잭션 엔진
- 엔트리: `packages/tx/src/index.ts`
- 주요 모듈: `transaction.ts`, `retry.ts`, `hooks.ts`

## @firsttx/shared

- 목적: 공통 유틸/타입 제공
- 엔트리: `packages/shared/src/index.ts`
- 주요 모듈: `constants.ts`, `errors.ts`, `type-guards.ts`

## @firsttx/devtools

- 목적: 이벤트 가시화를 위한 Chrome DevTools 확장
- 영역: `src/bridge`, `src/extension`, `src/panel`
- 패널 빌드는 Vite, 확장은 `tsup` 사용
