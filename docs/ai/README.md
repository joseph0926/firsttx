# AI 온보딩

이 폴더는 AI/에이전트가 빠르게 이해하도록 최적화된 요약 문서 모음입니다.

## 권장 읽기 순서

1. `docs/ai/repo-map.md`
2. `docs/ai/architecture.md`
3. `docs/ai/apps.md`
4. `docs/ai/packages.md`
5. `docs/ai/workflows.md`

## 빠른 명령

```bash
pnpm install
pnpm run lint
pnpm run typecheck
pnpm run test
pnpm run build
```

앱별 실행:

```bash
pnpm --filter @firsttx/docs dev
pnpm --filter playground dev
```

## 가드레일

- 생성물 디렉터리는 수정하지 않습니다: `dist/`, `coverage/`, `.turbo/`, `.next/`, `node_modules/`.
- 변경은 작고 검증 가능하게 유지합니다.
- Node >= 22, pnpm 10.26.0 필요 (루트 `package.json` 참고).

## 추가 참고

- `docs/project-analysis.md`
- `README.md`
