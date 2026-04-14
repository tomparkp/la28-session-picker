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
- `pnpm rate-sessions` — Recompute rating fields in D1 (see [Database](#database))

## Database

Session data lives in a Cloudflare D1 database (binding `DB`, defined in `wrangler.jsonc`). The schema is managed by Drizzle — source of truth is `src/db/schema.ts`.

### Local development

Dev uses Wrangler's local SQLite emulation under `.wrangler/state/`. Each worktree has its own local DB.

```bash
pnpm db:migrate:local   # apply migrations to local D1
pnpm db:studio          # browse/edit local DB at https://local.drizzle.studio
```

A fresh worktree has no local data. To populate it, run the content generation scripts (`pnpm generate-content`) or dump from remote:

```bash
pnpm wrangler d1 export la28 --remote --no-schema --output=/tmp/la28.sql
pnpm wrangler d1 execute la28 --local --file=/tmp/la28.sql
```

### Remote (production)

```bash
pnpm db:migrate:remote  # apply migrations to prod D1
pnpm db:studio:remote   # browse/edit prod DB via D1 HTTP
```

`db:studio:remote` needs a Cloudflare API token with `Account → D1 → Edit` permission. Create at https://dash.cloudflare.com/profile/api-tokens (Custom token → Account → D1 → Edit), then add to `.env`:

```
CLOUDFLARE_ACCOUNT_ID=<account id>
CLOUDFLARE_DATABASE_ID=<database id from wrangler.jsonc>
CLOUDFLARE_D1_TOKEN=<token>
```

### Schema changes

1. Edit `src/db/schema.ts`
2. `pnpm db:generate --name <short-description>` — generates `drizzle/<timestamp>_<name>.sql` (drop `--name` and Drizzle appends a random suffix)
3. Review the SQL, then `pnpm db:migrate:local` to apply
4. After merge, `pnpm db:migrate:remote` to apply to prod

### Regenerating session ratings

After changing rating logic in `src/lib/ratings.ts` or session content, recompute stored ratings:

```bash
pnpm rate-sessions           # writes to local D1
pnpm rate-sessions --remote  # writes to prod D1
```

`pnpm generate-content` and `pnpm refresh <sessionId>` follow the same local-by-default, `--remote` opt-in pattern.

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
