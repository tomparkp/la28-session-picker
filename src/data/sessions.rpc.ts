import { createServerFn } from '@tanstack/react-start'
import { setResponseHeaders } from '@tanstack/react-start/server'

import type { Session } from '@/types/session'

export type SessionsPayload = {
  sessions: Session[]
  sports: string[]
  zones: string[]
}

export const getSessionsPayload = createServerFn({ method: 'GET' }).handler(async () => {
  setResponseHeaders(
    new Headers({
      'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
    }),
  )

  const { computeSessionsPayload } = await import('./sessions.data.server')
  return computeSessionsPayload()
})

