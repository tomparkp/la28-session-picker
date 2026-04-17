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

Six independent scripts; each reads JSON output of upstream stages and writes one file. Run in order, or any subset with `--sport=<name>` / `--force` / `--dry-run`.

- `pnpm generate:paris-medals` — Rescrape Olympedia into `src/data/paris-2024-medals.json`. One-off; run only when medal data needs refreshing.
- `pnpm generate:sport-facts` — Regenerate `src/data/sport-facts.json` per sport via Perplexity, anchored on `paris-2024-medals.json`. Extra flag: `--force` regenerates even when `parisRecap` already populated.
- `pnpm generate:venue-facts` — Regenerate `src/data/venue-facts.json` per venue via Perplexity (capacity, history, spectator experience, 2028 changes). Filter: `--venue=<name>`.
- `pnpm generate:session-facts` — Per-session Perplexity grounding → `src/data/session-facts.json` (facts, related news, sources). Flag: `--concurrency=<n>`.
- `pnpm generate:session-content` — Per-session Anthropic writing → `src/data/session-content.json` (blurb, contenders). Requires `session-facts.json` populated. Flags: `--no-batch`, `--anthropic-model=<m>`.
- `pnpm generate:session-scores` — Per-session Anthropic scoring → `src/data/session-scores.json` (ratings + scorecard). Requires `session-content.json` populated. Flags: `--no-batch`, `--anthropic-model=<m>`.
- `pnpm refresh <sessionId>` — Refresh grounding+writing+scoring for a single session with an optional `--prompt "..."` correction. Flags: `--skip-grounding|writing|scoring`.

All paid API calls require `PERPLEXITY_API_KEY` and/or `ANTHROPIC_API_KEY` in `.env`. Writing and scoring stages use Anthropic prompt caching and Messages Batches (50% discount) by default — see `scripts/lib/session-content.ts` for the batching helpers.

#### Persistent corrections

Hand-edited correction files override AI output across regenerations. Three files mirror the three correction scopes:

- `src/data/session-corrections.json` — keyed by session id; injected into `generate:session-facts`, `generate:session-content`, `generate:session-scores`, and `refresh`.
- `src/data/sport-corrections.json` — keyed by sport name; injected into `generate:sport-facts`, plus per-sport prompts in writing/scoring.
- `src/data/venue-corrections.json` — keyed by venue name; injected into `generate:venue-facts`.

Shape: `{ "<key>": ["correction text", ...] }`. Each value is an array so corrections stack. Edit the file, then re-run the relevant generate command (or `pnpm refresh <id>`) — corrections are feed-forward, no version bump.

For globally-wrong Paris 2024 medal data, fix `src/data/paris-2024-medals.json` directly and rerun `generate:session-facts` for affected sessions. The medal block is already authoritative in every prompt that references it.

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
- `sport-facts.json` — per-sport Perplexity output (gamesContext, parisRecap), keyed by sport
- `venue-facts.json` — per-venue Perplexity output (capacity, yearBuilt, location, iconicMoments, spectatorExperience, changes2028), keyed by venue name
- `session-facts.json` — per-session Perplexity output (facts, related news, sources), keyed by session id
- `session-content.json` — Anthropic prose (blurb, contenders), keyed by session id
- `session-scores.json` — ratings + optional Scorecard (dimension scores with explanations), keyed by session id
- `session-corrections.json` / `sport-corrections.json` / `venue-corrections.json` — hand-edited authoritative overrides injected into prompts at generation time (see Persistent corrections above)

Runtime reads happen in `src/data/sessions.data.server.ts`, which merges sessions + session-facts + session-content + session-scores on module load. Writer scripts use `scripts/lib/content-store.ts` to upsert the generated files; each stage can be regenerated independently (e.g. refresh news without rewriting descriptions). Regenerated files are committed to the repo — there's no separate deploy step for data.

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
