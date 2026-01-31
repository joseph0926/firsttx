# FirstTx - Multi-Agent Instructions

이 문서는 Cursor, Windsurf, Cline 등 다양한 AI 에이전트가 FirstTx 모노레포에서 작업할 때 참조하는 공통 지침입니다.

## Quick Reference

| 항목              | 값                              |
| ----------------- | ------------------------------- |
| **런타임**        | Node >= 22                      |
| **패키지 매니저** | pnpm 10.26.0                    |
| **모듈 시스템**   | ESM only                        |
| **테스트**        | Vitest (단위), Playwright (E2E) |
| **빌드**          | turbo + tsup                    |

## Repository Layout

```
firsttx/
├── apps/
│   ├── docs/          # Next.js 16 + MDX
│   └── playground/    # Vite 7 + React Router 7
├── packages/
│   ├── prepaint/      # UI snapshot restore
│   ├── local-first/   # IndexedDB + React sync
│   ├── tx/            # Transaction engine
│   ├── shared/        # Common utilities
│   └── devtools/      # Chrome DevTools extension
├── docs/
│   └── ai/            # AI-optimized documentation
├── turbo.json         # Task orchestration
├── tsconfig.base.json # Shared TS config
└── pnpm-workspace.yaml
```

## Commands

### Development

```bash
# Install
pnpm install

# Run specific app
pnpm --filter @firsttx/docs dev
pnpm --filter playground dev

# Run specific package in watch mode
pnpm --filter @firsttx/prepaint dev
```

### Validation

```bash
# All checks (parallelized via turbo)
pnpm run lint
pnpm run typecheck
pnpm run test

# Single package
pnpm --filter @firsttx/tx test
pnpm --filter @firsttx/tx typecheck
```

### Build

```bash
# All packages
pnpm run build

# Single package
pnpm --filter @firsttx/prepaint build
```

## Package Dependencies

```
shared ← prepaint, local-first, tx
devtools ← shared, prepaint, local-first, tx
playground ← prepaint, local-first, tx
docs ← (standalone)
```

## Tech Stack by Workspace

### apps/docs

- Next.js 16 (App Router)
- React 19
- Tailwind CSS 4
- MDX + next-intl

### apps/playground

- Vite 7
- React 19
- React Router 7
- Tailwind CSS 4
- Playwright (E2E)

### packages/\*

- TypeScript 5.9
- tsup (build)
- Vitest (test)

## Guardrails

### DO NOT modify:

- `dist/`, `coverage/`, `.turbo/`, `.next/`, `node_modules/`
- Generated files or build artifacts

### DO maintain:

- `workspace:*` protocol for internal dependencies
- Existing code style and patterns
- Test coverage for changes

### DO verify before committing:

```bash
pnpm run lint && pnpm run typecheck && pnpm run test
```

## Testing Guidelines

| Package     | Environment | Command                                   |
| ----------- | ----------- | ----------------------------------------- |
| prepaint    | happy-dom   | `pnpm --filter @firsttx/prepaint test`    |
| local-first | node        | `pnpm --filter @firsttx/local-first test` |
| tx          | happy-dom   | `pnpm --filter @firsttx/tx test`          |
| playground  | chromium    | `pnpm --filter playground test`           |

## Release Process

```bash
# Version bump (creates changeset PR)
pnpm run release:version

# Publish (CI handles this via Trusted Publishing)
pnpm run release:publish
```

Note: `apps/docs` and `apps/playground` are excluded from npm publish.

## Environment Variables

### Build-time (turbo.json)

- `NEXT_PUBLIC_ENABLE_CHAT`
- `OPENAI_API_KEY`
- `UPSTASH_*`

### Runtime (Playground)

- `VITE_METRICS_BASE_URL`

## Additional Resources

- `docs/ai/README.md` - AI onboarding
- `docs/ai/architecture.md` - System design
- `docs/project-analysis.md` - Detailed analysis (Korean)
