# Contributing

## Getting Started

```bash
pnpm install
pnpm dev
```

The dev server runs on port 3000.

## Commands

- `pnpm dev` — Start dev server
- `pnpm build` — Production build
- `pnpm preview` — Preview production build
- `pnpm test` — Run tests with Vitest
- `pnpm generate-content` — Run the AI content + scorecard pipeline (see [Database](#database))

## Database

Session data lives in a Cloudflare D1 database (binding `DB`, defined in `wrangler.jsonc`). The schema is managed by Drizzle — source of truth is `src/db/schema.ts`.

### Local development

Dev uses Wrangler's local SQLite emulation under `.wrangler/state/`. Each worktree has its own local DB.

```bash
pnpm db:migrate:local   # apply migrations to local D1
pnpm db:studio          # browse/edit local DB at https://local.drizzle.studio
```

A fresh worktree has no local data. Options:

- **External contributors**: ask the maintainer for a seed SQL dump, then `pnpm wrangler d1 execute la28 --local --file=<dump>`. `pnpm db:pull` won't work without maintainer credentials since Cloudflare doesn't support per-database scoped access.
- **Maintainer** (or anyone authed to the Cloudflare account owning this D1):

  ```bash
  pnpm wrangler login   # one-time per machine
  pnpm db:pull          # exports remote D1 and upserts into local
  ```

- **If you have Anthropic/Perplexity API keys**: `pnpm generate-content` will build content from scratch against the 2028 Games schedule, no remote access required. Note this makes paid API calls (Perplexity grounding + Claude writing + Claude scoring for each of ~850 sessions) and costs real money — scope with `--sport="Athletics (Track & Field)"` or similar to limit spend while developing.

### Remote (production)

```bash
pnpm db:migrate:remote  # apply migrations to prod D1
```

To browse/edit prod data, use the official [Cloudflare Dashboard D1 console](https://dash.cloudflare.com) (Workers & Pages → D1 → `la28` → Console). Drizzle Studio is local-only in this repo — Cloudflare doesn't support scoping API tokens to a single D1 database, so we avoid creating tokens with account-wide D1 access.

### Schema changes

1. Edit `src/db/schema.ts`
2. `pnpm db:generate --name <short-description>` — generates `drizzle/<timestamp>_<name>.sql` (drop `--name` and Drizzle appends a random suffix)
3. Review the SQL, then `pnpm db:migrate:local` to apply
4. After merge, `pnpm db:migrate:remote` to apply to prod

### Regenerating session content and ratings

`pnpm generate-content` runs the full AI pipeline (grounding → writing → scoring) and writes the resulting blurb, scorecard, and aggregate rating back to D1 in one pass. `pnpm refresh <sessionId>` refreshes a single session. Both default to local D1; pass `--remote` to target prod.

## Routing

This project uses [TanStack Router](https://tanstack.com/router) with file-based routing. Routes are managed as files in `src/routes/`.

To add a new route, create a file in `src/routes/` — TanStack will automatically generate the route entry. Use the `Link` component from `@tanstack/react-router` for SPA navigation:

```tsx
import { Link } from '@tanstack/react-router'
;<Link to="/venues">Venues</Link>
```

The root layout lives in `src/routes/__root.tsx`. More info in the [Layouts documentation](https://tanstack.com/router/latest/docs/framework/react/guide/routing-concepts#layouts).

## Server Functions

TanStack Start provides server functions that integrate with client components:

```tsx
import { createServerFn } from '@tanstack/react-start'

const getServerTime = createServerFn({
  method: 'GET',
}).handler(async () => {
  return new Date().toISOString()
})
```

## Data Fetching

Use the `loader` functionality built into TanStack Router to load data for a route before it renders:

```tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/people')({
  loader: async () => {
    const response = await fetch('https://swapi.dev/api/people')
    return response.json()
  },
  component: PeopleComponent,
})

function PeopleComponent() {
  const data = Route.useLoaderData()
  return (
    <ul>
      {data.results.map((person) => (
        <li key={person.name}>{person.name}</li>
      ))}
    </ul>
  )
}
```

More info in the [Loader documentation](https://tanstack.com/router/latest/docs/framework/react/guide/data-loading#loader-parameters).

## Styling

This project uses [Tailwind CSS](https://tailwindcss.com/) v4.

## Learn More

- [TanStack documentation](https://tanstack.com)
- [TanStack Start](https://tanstack.com/start)
