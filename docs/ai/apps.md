# 앱

## apps/docs

- 스택: Next.js 16 (App Router), React 19, Tailwind CSS 4, MDX, next-intl
- 주요 경로:
  - `app/[locale]/`: locale 기반 라우팅
  - `content/`: MDX 콘텐츠
  - `components/`, `hooks/`, `lib/`, `providers/`
- 설정:
  - `next.config.ts` (MDX + next-intl)
  - `postcss.config.mjs` (`@tailwindcss/postcss`)
  - `components.json` (shadcn/ui)

## apps/playground

- 스택: Vite 7, React 19, React Router 7, Tailwind CSS 4
- 주요 경로:
  - `src/pages/`: 시나리오 라우트
  - `src/router.tsx`: 라우트 정의
  - `src/models/`, `src/hooks/`, `src/components/`
- E2E:
  - `playwright.config.ts`
  - `tests/` (메트릭 중심 테스트)
- Tailwind 통합:
  - `vite.config.ts`에서 `@tailwindcss/vite` 사용
