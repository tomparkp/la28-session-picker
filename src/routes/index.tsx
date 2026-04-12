import { createFileRoute, stripSearchParams } from '@tanstack/react-router'

import { sessionDetailQueryOptions, sessionsInfiniteQueryOptions } from '@/lib/session-query'
import { DEFAULT_FILTERS, DEFAULT_SORT, validateSessionSearch } from '@/lib/session-search'

export const Route = createFileRoute('/')({
  validateSearch: validateSessionSearch,
  search: {
    middlewares: [
      stripSearchParams({
        ...DEFAULT_FILTERS,
        sortCol: DEFAULT_SORT.col,
        sortDir: DEFAULT_SORT.dir,
      }),
    ],
  },
  loaderDeps: ({ search }) => search,
  loader: async ({ context, deps }) => {
    await context.queryClient.prefetchInfiniteQuery(sessionsInfiniteQueryOptions(deps))

    if (deps.session) {
      await context.queryClient.prefetchQuery(sessionDetailQueryOptions(deps.session))
    }
  },
  headers: () => ({
    'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
  }),
})

// Component is code-split into `index.lazy.tsx`
