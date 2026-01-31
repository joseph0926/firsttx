# 워크플로

## 설치

```bash
pnpm install
```

## 빌드 / 린트 / 테스트

```bash
pnpm run build
pnpm run lint
pnpm run typecheck
pnpm run test
```

## 앱 개발

```bash
pnpm --filter @firsttx/docs dev
pnpm --filter playground dev
```

## 패키지 개발

```bash
pnpm --filter @firsttx/prepaint dev
pnpm --filter @firsttx/local-first dev
pnpm --filter @firsttx/tx dev
```

## 릴리스 (Changesets)

```bash
pnpm run release:version
pnpm run release:publish
```

참고:

- `apps/docs`, `apps/playground`는 `.changeset/config.json`에서 퍼블리시 제외.
- CI는 lint/typecheck/test/build 및 Changesets 배포를 수행.
