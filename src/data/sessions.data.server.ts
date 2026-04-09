import type { Session } from '@/types/session'

import rawSessions from './sessions.json'

export type SessionsPayload = {
  sessions: Session[]
  sports: string[]
  zones: string[]
}

// Workers isolates may be evicted between requests, so this is best-effort.
let cached: SessionsPayload | null = null

export function computeSessionsPayload(): SessionsPayload {
  if (cached) return cached

  const sessions = rawSessions as Session[]
  const sports = [...new Set(sessions.map((s) => s.sport))].sort()
  const zones = [...new Set(sessions.map((s) => s.zone))].sort()

  cached = { sessions, sports, zones }
  return cached
}
