import { createFileRoute } from '@tanstack/react-router'

import { getSessionsPayload } from '@/data/sessions.rpc'

export const Route = createFileRoute('/schedule')({
  loader: async () => await getSessionsPayload(),
  headers: () => ({
    'Cache-Control': 'public, max-age=0, s-maxage=600, stale-while-revalidate=86400',
  }),
})

// Component is code-split into `schedule.lazy.tsx`
