import { and, eq, gte, inArray, lte, sql } from 'drizzle-orm'

import { getDb } from '@/db/client'
import { sessionContent, sessions as sessionsTable } from '@/db/schema'
import { getSessionInsights, type SessionInsights } from '@/lib/ai-scorecard'
import { sortSessions } from '@/lib/filter'
import type {
  Filters,
  RoundType,
  Session,
  SessionContent,
  SessionWithContent,
  SortState,
} from '@/types/session'

export interface SessionsPage {
  items: Session[]
  nextOffset: number | null
  total: number
  sports: string[]
  zones: string[]
}

export interface SessionDetailPayload {
  session: Session
  insights: SessionInsights
  contentMeta?: SessionContent['contentMeta']
}

function buildFilterConditions(filters: Filters) {
  const conditions = []

  if (filters.sport) conditions.push(eq(sessionsTable.sport, filters.sport))
  if (filters.round) conditions.push(eq(sessionsTable.rt, filters.round as RoundType))
  if (filters.zone) conditions.push(eq(sessionsTable.zone, filters.zone))

  if (filters.price) {
    const [lo, hi] = filters.price.split('-').map(Number)
    if (Number.isFinite(lo)) conditions.push(gte(sessionsTable.pLo, lo))
    if (Number.isFinite(hi)) conditions.push(lte(sessionsTable.pLo, hi))
  }

  if (filters.score) {
    const scoreMin = Number(filters.score)
    if (Number.isFinite(scoreMin) && scoreMin > 0) {
      conditions.push(gte(sessionsTable.agg, scoreMin))
    }
  }

  return conditions.length > 0 ? and(...conditions) : undefined
}

async function getSportsAndZones(): Promise<{ sports: string[]; zones: string[] }> {
  const db = getDb()
  const [sportRows, zoneRows] = await Promise.all([
    db
      .selectDistinct({ sport: sessionsTable.sport })
      .from(sessionsTable)
      .orderBy(sessionsTable.sport),
    db.selectDistinct({ zone: sessionsTable.zone }).from(sessionsTable).orderBy(sessionsTable.zone),
  ])

  return {
    sports: sportRows.map((r) => r.sport).filter(Boolean),
    zones: zoneRows.map((r) => r.zone),
  }
}

export async function getSessionsPageData({
  filters,
  sort,
  offset,
  limit,
}: {
  filters: Filters
  sort: SortState
  offset: number
  limit: number
}): Promise<SessionsPage> {
  const db = getDb()
  const where = buildFilterConditions(filters)

  const [rows, { sports, zones }] = await Promise.all([
    db
      .select()
      .from(sessionsTable)
      .where(where ?? sql`1 = 1`),
    getSportsAndZones(),
  ])

  // Sort in JS to preserve the tie-breaking behavior of the existing util
  // (date sort parses `time` into minutes). Dataset is ~800 rows.
  const sorted = sortSessions(rows as Session[], sort)
  const items = sorted.slice(offset, offset + limit)
  const nextOffset = offset + items.length < sorted.length ? offset + items.length : null

  return {
    items,
    nextOffset,
    total: sorted.length,
    sports,
    zones,
  }
}

export async function getSessionDetailData(
  sessionId: string,
): Promise<SessionDetailPayload | null> {
  const db = getDb()
  const row = await db
    .select()
    .from(sessionsTable)
    .leftJoin(sessionContent, eq(sessionContent.sessionId, sessionsTable.id))
    .where(eq(sessionsTable.id, sessionId))
    .get()

  if (!row) return null

  const session = row.sessions as Session
  const content = (row.session_content ?? {}) as Partial<SessionContent>
  const withContent: SessionWithContent = { ...session, ...content }

  return {
    session,
    insights: getSessionInsights(withContent),
    contentMeta: content.contentMeta,
  }
}

export async function getSessionsByIds(ids: string[]): Promise<Session[]> {
  if (ids.length === 0) return []

  const db = getDb()
  const rows = (await db
    .select()
    .from(sessionsTable)
    .where(inArray(sessionsTable.id, ids))) as Session[]

  return rows.sort((a, b) => a.dk.localeCompare(b.dk) || a.name.localeCompare(b.name))
}
