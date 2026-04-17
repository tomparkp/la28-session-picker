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

### Content pipeline commands

- `pnpm generate-content` — Three-stage AI pipeline: grounding (Perplexity) → writing (Claude Sonnet, batches API) → scoring (Claude Haiku, batches API). Scoped via `--sport=<name>`, `--force`, `--dry-run`. Escape hatches: `--writing-no-batch`, `--scoring-no-batch`, `--skip-grounding|writing|scoring`.
- `pnpm generate-sport-facts` — Regenerate `src/data/sport-facts.json` per sport via Perplexity, anchored on `paris-2024-medals.json`. Flags: `--sport=<name>`, `--force` (regen even when `parisRecap` already populated), `--dry-run`.
- `pnpm refresh <sessionId>` — Refresh one session with an optional `--prompt "..."` correction; same skip/stage flags as `generate-content`.
- `pnpm fetch:paris-medals` — Rescrape Olympedia into `paris-2024-medals.json`. One-off; run only when medal data needs refreshing.

All paid API calls require `PERPLEXITY_API_KEY` and/or `ANTHROPIC_API_KEY` in `.env`. Every stage uses Anthropic prompt caching and, where possible, Messages Batches (50% discount) — see `scripts/lib/session-content.ts` for the batching helpers.

### Pre-PR checks

Before opening a pull request, run the CI-equivalent checks locally and fix any failures first: `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, and `pnpm test`. Run them in parallel when possible. This avoids pushing commits that fail CI.

### Deploying

Production deploys happen automatically when Release Please cuts a release. `.github/workflows/release.yml` runs on every push to `main`; when it creates a release (release PR merged), a follow-up `deploy` job in the same workflow ships to Cloudflare. **Manual deploys are forbidden.** Do not run `wrangler deploy`, do not re-add a `deploy` script to `package.json`, and do not add a manual-trigger workflow. Shipping code means: merge feature PRs to `main` → let Release Please open its release PR → user merges that → CI deploys.

### Cloudflare operations

Always ask the user before using any Cloudflare MCP tools or running `wrangler` commands that touch remote resources. Local-only commands (`wrangler types`, `wrangler dev`) are fine without asking.

## Architecture

This is a **TanStack Start** (React 19) full-stack app with SSR, file-based routing, and Tailwind CSS v4.

### Data

Session data lives in JSON files under `src/data/`, committed to the repo and bundled into the worker at build time:

- `sessions.json` — hand-validated source data (id, sport, venue, date, price, etc.); no generated content
- `paris-2024-medals.json` — Olympedia-scraped medal results; authoritative history, used as grounding anchor
- `sport-facts.json` — per-sport Perplexity output (gamesContext, venueNotes, eventHighlights, parisRecap), keyed by sport
- `session-facts.json` — per-session Perplexity output (facts, related news, sources), keyed by session id
- `writing.json` — Anthropic prose (blurb, contenders), keyed by session id
- `scoring.json` — ratings + optional Scorecard (dimension scores with explanations), keyed by session id

Runtime reads happen in `src/data/sessions.data.server.ts`, which merges sessions + session-facts + writing + scoring on module load. Writer scripts use `scripts/lib/content-store.ts` to upsert the generated files; each stage can be regenerated independently (e.g. refresh news without rewriting descriptions). Regenerated files are committed to the repo — there's no separate deploy step for data.

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
