# 레포 맵

## 워크스페이스 구조

```
apps/
  docs/          # Next.js 문서 사이트
  playground/    # Vite + React Router 데모
packages/
  prepaint/      # UI 스냅샷 캡처 + 복원
  local-first/   # IndexedDB + React 상태 동기화
  tx/            # 트랜잭션 엔진
  shared/        # 공통 유틸리티
  devtools/      # Chrome DevTools 확장
```

## 루트 핵심 파일

- `package.json`: 워크스페이스 스크립트, Node/pnpm 버전
- `pnpm-workspace.yaml`: 워크스페이스 범위
- `turbo.json`: 태스크 그래프 + 캐시 규칙
- `tsconfig.base.json`: TS 기본 설정 + 경로 별칭
- `eslint.config.js`: 루트 린트 규칙 (apps는 제외)
- `.changeset/`: 릴리스 관리
- `.github/workflows/`: CI 파이프라인

## 생성물/외부 디렉터리

- `dist/`, `coverage/`, `.turbo/`, `.next/`, `node_modules/`는 생성물입니다.
