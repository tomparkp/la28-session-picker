import { createFileRoute } from '@tanstack/react-router'

import { getSessionsPayload } from '@/data/sessions.rpc'

export const Route = createFileRoute('/')({
  loader: async () => await getSessionsPayload(),
  headers: () => ({
    'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
  }),
})

// Component is code-split into `index.lazy.tsx`
