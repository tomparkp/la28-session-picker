# AGENTS.md

This file provides guidance to AI coding agents working with code in this repository.

## Commands

- Use `pnpm` for package management in this repo. Do not use `npm` or `yarn` unless the user explicitly asks.
- Prefer existing `package.json` scripts over ad-hoc shell commands when a matching script exists.
- `pnpm dev` — Start dev server on port 3000
- `pnpm build` — Production build
- `pnpm preview` — Preview production build
- `pnpm test` — Run tests with Vitest (`vitest run`)
- `pnpm format:check` — Check formatting with oxfmt
- `pnpm lint` — Lint with oxlint
- `pnpm typecheck` — Type-check with `tsc --noEmit`

### Pre-PR checks

Before opening a pull request, run the CI-equivalent checks locally and fix any failures first: `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, and `pnpm test`. Run them in parallel when possible. This avoids pushing commits that fail CI.

## Architecture

This is a **TanStack Start** (React 19) full-stack app with SSR, file-based routing, and Tailwind CSS v4.

### Database

Session data lives in Cloudflare D1 (binding `DB`). Schema in `src/db/schema.ts` (Drizzle). Runtime reads via `drizzle(env.DB)` from `cloudflare:workers`; writer scripts (`generate-content`, `refresh`, `rate-sessions`) shell out to `wrangler d1 execute` via `scripts/lib/db.ts` — default `--local`, pass `--remote` for prod.

- `pnpm db:migrate:local` / `pnpm db:migrate:remote` — apply migrations
- `pnpm db:generate --name <desc>` — generate a new migration (omit `--name` and you get a random suffix like `needy_ma_gnuci`)
- `pnpm db:studio` — browse local D1 at https://local.drizzle.studio (local only; for prod use the Cloudflare Dashboard D1 console)

Each worktree has its own local D1 under `.wrangler/state/`. A fresh worktree needs `pnpm db:migrate:local` plus data (run content scripts or dump remote with `wrangler d1 export la28 --remote --no-schema --output=/tmp/la28.sql && wrangler d1 execute la28 --local --file=/tmp/la28.sql`).

### Routing

Routes live in `src/routes/` and are auto-generated into `src/routeTree.gen.ts` by the TanStack Router plugin. Do not edit `routeTree.gen.ts` manually.

- `__root.tsx` — Root layout wrapping all pages (HTML document, Header, Footer, devtools)
- Filename maps to path: `venues.tsx` → `/venues`, `index.tsx` → `/`
- Routes use `createFileRoute()` / `createRootRoute()`
- Router config in `src/router.tsx`: preloads on intent, scroll restoration enabled

### Path Aliases

`@/*` resolves to `./src/*` (configured in tsconfig.json).

### Styling

- Tailwind CSS v4 with `@tailwindcss/vite` plugin
- Custom CSS variables and theme system in `src/styles.css`
- Dark mode via `data-theme` attribute + `prefers-color-scheme` fallback
- Fonts: Manrope (body), Fraunces (display headings)
- Use existing CSS variables (`--lagoon`, `--sea-ink`, `--sand`, etc.) for theme colors

### Vite Plugins (order matters)

`devtools` → `tsconfigPaths` → `tailwindcss` → `tanstackStart` → `viteReact`

### Git

- Never include Co-Authored-By or other attribution lines in commits or pull requests
- Use Conventional Commits: `type(scope): description` (lowercase, imperative mood)
  - Types: `feat`, `fix`, `refactor`, `chore`, `docs`, `style`, `test`, `perf`, `ci`, `build`
  - Scope is optional but encouraged (e.g., `feat(routes): add dashboard page`)
  - Breaking changes: add `!` after type/scope (e.g., `feat!: remove legacy auth`)
- Keep commits atomic — one logical change per commit
- Write concise subject lines (under 72 chars), use body for "why" when needed
- PR titles follow the same conventional commit format (this becomes the squash commit message)
- PR descriptions should include a summary and test plan
- Squash merge all PRs — the PR title is the final commit message, so get it right
- Keep `main` history linear: prefer rebasing topic branches onto `main` instead of merge commits
- Releases are managed by Release Please — it reads conventional commits to auto-generate changelogs and version bumps
  - `feat` → minor version bump
  - `fix` → patch version bump
  - `feat!` / `fix!` / breaking change footer → major version bump

### Worktrees

- Store repo worktrees under `.worktrees/` at the repository root when creating additional checkouts for this project

### Key Conventions

- Strict TypeScript: no unused locals/parameters
- Components in `src/components/`, routes in `src/routes/`
- Server functions available via `createServerFn()` from `@tanstack/react-start`
- Navigation uses `<Link>` from `@tanstack/react-router`
