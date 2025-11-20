# FirstTx Docs (`apps/docs`)

Next.js (App Router) site for FirstTx packages: Prepaint, Local-First, and Tx.

## Getting Started

```bash
# install workspace deps from repo root
pnpm install

# run only the docs app
pnpm --filter @firsttx/docs dev
```

Visit `http://localhost:3000` to view the site.

## Scripts

- `pnpm --filter @firsttx/docs dev`: start dev server
- `pnpm --filter @firsttx/docs build`: build static output
- `pnpm --filter @firsttx/docs start`: run production server
- `pnpm --filter @firsttx/docs lint`: run lint

## Tech Stack

- Next.js 16 (App Router)
- React 19
- Tailwind CSS 4
- TypeScript

## Key Directories

- `app/`: routes, layouts, page components
- `app/globals.css`: global styles and Tailwind theme tokens
- `public/`: static assets
