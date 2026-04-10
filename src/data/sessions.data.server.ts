import type { SessionContent, SessionWithContent } from '@/types/session'

import rawSessionContent from './session-content.json'
import rawSessions from './sessions.json'

export type SessionsPayload = {
  sessions: SessionWithContent[]
  sports: string[]
  zones: string[]
}

// Workers isolates may be evicted between requests, so this is best-effort.
let cached: SessionsPayload | null = null

export function computeSessionsPayload(): SessionsPayload {
  if (cached) return cached

  const contentBySessionId = rawSessionContent as Record<string, SessionContent>
  const sessions = (rawSessions as SessionWithContent[]).map((session) => ({
    ...session,
    ...contentBySessionId[session.id],
  }))
  const sports = [...new Set(sessions.map((s) => s.sport))].filter(Boolean).sort()
  const zones = [...new Set(sessions.map((s) => s.zone))].sort()

  cached = { sessions, sports, zones }
  return cached
}
