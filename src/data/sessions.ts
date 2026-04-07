import type { Session } from '@/types/session'
import rawSessions from './sessions.json'

export const sessions: Session[] = rawSessions as Session[]

export const sports = [...new Set(sessions.map((s) => s.sport))].sort()
export const zones = [...new Set(sessions.map((s) => s.zone))].sort()
export const roundTypes = ['Final', 'Bronze', 'Semi', 'QF', 'Prelim', 'Ceremony'] as const
