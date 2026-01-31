# FirstTx - AI Agent Instructions

이 문서는 Claude Code 및 AI 에이전트가 FirstTx 모노레포에서 작업할 때 참조하는 지침입니다.

## 프로젝트 개요

**FirstTx**는 CSR 앱의 재방문 UX를 SSR 수준으로 개선하는 툴킷입니다.

- **Prepaint**: React 로드 전 마지막 UI 스냅샷 즉시 복원 (0ms 빈 화면)
- **Local-First**: IndexedDB + React 상태 자동 동기화
- **Tx**: 낙관적 업데이트 + 자동 롤백 트랜잭션 엔진

## 워크스페이스 구조

```
apps/
  docs/          # Next.js 16 문서 사이트
  playground/    # Vite 7 + React Router 7 데모
packages/
  prepaint/      # UI 스냅샷 캡처/복원
  local-first/   # IndexedDB + React 동기화
  tx/            # 트랜잭션 엔진
  shared/        # 공통 유틸리티
  devtools/      # Chrome DevTools 확장
```

## 빠른 명령

```bash
# 의존성 설치
pnpm install

# 전체 빌드/검증
pnpm run build
pnpm run lint
pnpm run typecheck
pnpm run test

# 앱 개발
pnpm --filter @firsttx/docs dev
pnpm --filter playground dev

# 패키지 개발
pnpm --filter @firsttx/prepaint dev
pnpm --filter @firsttx/local-first dev
pnpm --filter @firsttx/tx dev
```

## 필수 환경

- **Node**: >= 24
- **pnpm**: 10.28.2 (루트 `package.json`의 `packageManager` 참조)
- **모듈 시스템**: ESM only

## 핵심 설정 파일

| 파일                  | 용도                                       |
| --------------------- | ------------------------------------------ |
| `package.json`        | 워크스페이스 스크립트, 버전                |
| `pnpm-workspace.yaml` | 워크스페이스 범위 (`apps/*`, `packages/*`) |
| `turbo.json`          | 태스크 그래프 + 캐시 규칙                  |
| `tsconfig.base.json`  | TS 기본 설정 + 경로 별칭                   |
| `.changeset/`         | 릴리스 관리                                |

## 가드레일 (금지 사항)

1. **생성물 디렉토리 수정 금지**:
   - `dist/`, `coverage/`, `.turbo/`, `.next/`, `node_modules/`

2. **워크스페이스 프로토콜 유지**:
   - 패키지 간 의존성은 `workspace:*` 사용

3. **불필요한 파일 생성 금지**:
   - README, 문서 파일은 요청 시에만 생성

## 의존성 관계

```
@firsttx/shared
    ↑
    ├── @firsttx/prepaint
    ├── @firsttx/local-first
    └── @firsttx/tx
          ↑
          └── @firsttx/devtools (모든 패키지 의존)
```

## 테스트 환경

| 패키지      | 환경      | 프레임워크 |
| ----------- | --------- | ---------- |
| prepaint    | happy-dom | Vitest     |
| local-first | node      | Vitest     |
| tx          | happy-dom | Vitest     |
| playground  | chromium  | Playwright |

## CI/CD

- **PR**: `pr.yml` - lint/typecheck/test/coverage/build
- **릴리스**: `release.yml` - Changesets + NPM Trusted Publishing
- **E2E**: `e2e-playwright.yml` - Playground 메트릭 테스트

## 추가 문서

자세한 내용은 `docs/ai/` 디렉토리 참조:

- `docs/ai/repo-map.md`: 워크스페이스 맵
- `docs/ai/architecture.md`: 아키텍처 개요
- `docs/ai/packages.md`: 패키지별 상세
- `docs/ai/workflows.md`: 워크플로 가이드
