import { eq, sql } from 'drizzle-orm'

import {
  sessions as sessionsTable,
  sessionContent as sessionContentTable,
  sessionGrounding as sessionGroundingTable,
  sessionScoring as sessionScoringTable,
  sessionWriting as sessionWritingTable,
} from '@/db/schema'
import type {
  ContentMeta,
  ContentSource,
  Contender,
  RelatedNews,
  Scorecard,
  Session,
  SessionContent,
} from '@/types/session'

import { getDrizzleDb } from './drizzle-db'

export type DbTarget = 'local' | 'remote'

export function parseDbTargetFromArgs(argv: string[] = process.argv.slice(2)): DbTarget {
  return argv.includes('--remote') ? 'remote' : 'local'
}

export function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

// ---- Session / content reads --------------------------------------------

export async function readAllSessions(target: DbTarget): Promise<Session[]> {
  const db = getDrizzleDb(target)
  const rows = await db.select().from(sessionsTable)
  return rows as Session[]
}

export async function readSessionById(id: string, target: DbTarget): Promise<Session | null> {
  const db = getDrizzleDb(target)
  const rows = await db.select().from(sessionsTable).where(eq(sessionsTable.id, id))
  return (rows[0] as Session | undefined) ?? null
}

export async function readContentById(
  id: string,
  target: DbTarget,
): Promise<SessionContent | null> {
  const db = getDrizzleDb(target)
  const rows = await db
    .select()
    .from(sessionContentTable)
    .where(eq(sessionContentTable.sessionId, id))
  const row = rows[0]
  if (!row) return null
  return {
    blurb: row.blurb ?? undefined,
    potentialContendersIntro: row.potentialContendersIntro ?? undefined,
    potentialContenders: row.potentialContenders ?? undefined,
    relatedNews: row.relatedNews ?? undefined,
    scorecard: row.scorecard ?? undefined,
    contentMeta: row.contentMeta ?? undefined,
  }
}

// ---- Stage data + types -------------------------------------------------

export interface StageMetadata {
  model: string
  promptVersion: number
  generatedAt: string
  batchId?: string
}

export interface GroundingUpsert {
  sessionId: string
  facts: string[] | null
  relatedNews: RelatedNews[]
  sources: ContentSource[] | undefined
}

export interface WritingUpsert {
  sessionId: string
  blurb: string
  potentialContendersIntro: string | undefined
  potentialContenders: Contender[]
}

export interface ScoringUpsert {
  sessionId: string
  scorecard: Scorecard
}

export interface StageStatus {
  sessionId: string
  groundingPromptVersion: number | null
  writingPromptVersion: number | null
  scoringPromptVersion: number | null
}

export interface GroundingStageData {
  facts: string[] | null
  relatedNews: RelatedNews[]
  sources: ContentSource[] | undefined
  model: string
  promptVersion: number
  generatedAt: string
}

export interface WritingStageData {
  blurb: string
  potentialContendersIntro: string | undefined
  potentialContenders: Contender[]
  model: string
  promptVersion: number
  generatedAt: string
}

export async function readStageStatus(target: DbTarget): Promise<Map<string, StageStatus>> {
  const db = getDrizzleDb(target)
  const rows = await db
    .select({
      sessionId: sessionsTable.id,
      g: sessionGroundingTable.promptVersion,
      w: sessionWritingTable.promptVersion,
      s: sessionScoringTable.promptVersion,
    })
    .from(sessionsTable)
    .leftJoin(sessionGroundingTable, eq(sessionGroundingTable.sessionId, sessionsTable.id))
    .leftJoin(sessionWritingTable, eq(sessionWritingTable.sessionId, sessionsTable.id))
    .leftJoin(sessionScoringTable, eq(sessionScoringTable.sessionId, sessionsTable.id))
  const out = new Map<string, StageStatus>()
  for (const r of rows) {
    out.set(r.sessionId, {
      sessionId: r.sessionId,
      groundingPromptVersion: r.g ?? null,
      writingPromptVersion: r.w ?? null,
      scoringPromptVersion: r.s ?? null,
    })
  }
  return out
}

export async function readGroundingForSession(
  sessionId: string,
  target: DbTarget,
): Promise<GroundingStageData | null> {
  const db = getDrizzleDb(target)
  const rows = await db
    .select()
    .from(sessionGroundingTable)
    .where(eq(sessionGroundingTable.sessionId, sessionId))
  const row = rows[0]
  if (!row) return null
  return {
    facts: row.facts ?? null,
    relatedNews: row.relatedNews ?? [],
    sources: row.sources ?? undefined,
    model: row.model,
    promptVersion: row.promptVersion,
    generatedAt: row.generatedAt,
  }
}

export async function readWritingForSession(
  sessionId: string,
  target: DbTarget,
): Promise<WritingStageData | null> {
  const db = getDrizzleDb(target)
  const rows = await db
    .select()
    .from(sessionWritingTable)
    .where(eq(sessionWritingTable.sessionId, sessionId))
  const row = rows[0]
  if (!row) return null
  return {
    blurb: row.blurb,
    potentialContendersIntro: row.potentialContendersIntro ?? undefined,
    potentialContenders: row.potentialContenders ?? [],
    model: row.model,
    promptVersion: row.promptVersion,
    generatedAt: row.generatedAt,
  }
}

// ---- Stage upserts -------------------------------------------------------
//
// Each upsert writes to a raw staging table, then rebuilds the
// session_content projection (and for scoring, sessions.r_*) via JOIN. All
// statements ship in one db.batch() so a partial failure rolls back cleanly.

function rebuildContentSql(ids: string[]) {
  const idList = sql.join(
    ids.map((id) => sql`${id}`),
    sql`, `,
  )
  return sql`
    INSERT OR REPLACE INTO session_content
      (session_id, blurb, potential_contenders_intro, potential_contenders, related_news, scorecard, content_meta)
    SELECT
      s.id,
      w.blurb,
      w.potential_contenders_intro,
      w.potential_contenders,
      g.related_news,
      sc.scorecard,
      json_object(
        'provider', 'hybrid',
        'groundingModel', g.model,
        'writingModel', w.model,
        'scoringModel', sc.model,
        'sources', CASE WHEN g.sources IS NOT NULL THEN json(g.sources) END,
        'generatedAt', COALESCE(sc.generated_at, w.generated_at, g.generated_at)
      )
    FROM sessions s
    LEFT JOIN session_grounding g ON g.session_id = s.id
    LEFT JOIN session_writing w ON w.session_id = s.id
    LEFT JOIN session_scoring sc ON sc.session_id = s.id
    WHERE s.id IN (${idList})
  `
}

function updateRatingsSql(ids: string[]) {
  const idList = sql.join(
    ids.map((id) => sql`${id}`),
    sql`, `,
  )
  return sql`
    UPDATE sessions SET
      r_sig = (SELECT json_extract(sc.scorecard, '$.significance.score') FROM session_scoring sc WHERE sc.session_id = sessions.id),
      r_exp = (SELECT json_extract(sc.scorecard, '$.experience.score') FROM session_scoring sc WHERE sc.session_id = sessions.id),
      r_star = (SELECT json_extract(sc.scorecard, '$.starPower.score') FROM session_scoring sc WHERE sc.session_id = sessions.id),
      r_uniq = (SELECT json_extract(sc.scorecard, '$.uniqueness.score') FROM session_scoring sc WHERE sc.session_id = sessions.id),
      r_dem = (SELECT json_extract(sc.scorecard, '$.demand.score') FROM session_scoring sc WHERE sc.session_id = sessions.id),
      agg = (SELECT json_extract(sc.scorecard, '$.aggregate') FROM session_scoring sc WHERE sc.session_id = sessions.id)
    WHERE sessions.id IN (${idList})
      AND EXISTS (SELECT 1 FROM session_scoring sc WHERE sc.session_id = sessions.id)
  `
}

export async function upsertGrounding(
  rows: GroundingUpsert[],
  meta: StageMetadata,
  target: DbTarget,
): Promise<void> {
  if (rows.length === 0) return
  const db = getDrizzleDb(target)
  const values = rows.map((r) => ({
    sessionId: r.sessionId,
    facts: r.facts,
    relatedNews: r.relatedNews,
    sources: r.sources ?? null,
    model: meta.model,
    promptVersion: meta.promptVersion,
    generatedAt: meta.generatedAt,
  }))
  const ids = rows.map((r) => r.sessionId)
  await db.batch([
    db
      .insert(sessionGroundingTable)
      .values(values)
      .onConflictDoUpdate({
        target: sessionGroundingTable.sessionId,
        set: {
          facts: sql.raw('excluded.facts'),
          relatedNews: sql.raw('excluded.related_news'),
          sources: sql.raw('excluded.sources'),
          model: sql.raw('excluded.model'),
          promptVersion: sql.raw('excluded.prompt_version'),
          generatedAt: sql.raw('excluded.generated_at'),
        },
      }),
    db.run(rebuildContentSql(ids)),
  ])
}

export async function upsertWriting(
  rows: WritingUpsert[],
  meta: StageMetadata,
  target: DbTarget,
): Promise<void> {
  if (rows.length === 0) return
  const db = getDrizzleDb(target)
  const values = rows.map((r) => ({
    sessionId: r.sessionId,
    blurb: r.blurb,
    potentialContendersIntro: r.potentialContendersIntro ?? null,
    potentialContenders: r.potentialContenders,
    model: meta.model,
    promptVersion: meta.promptVersion,
    batchId: meta.batchId ?? null,
    generatedAt: meta.generatedAt,
  }))
  const ids = rows.map((r) => r.sessionId)
  await db.batch([
    db
      .insert(sessionWritingTable)
      .values(values)
      .onConflictDoUpdate({
        target: sessionWritingTable.sessionId,
        set: {
          blurb: sql.raw('excluded.blurb'),
          potentialContendersIntro: sql.raw('excluded.potential_contenders_intro'),
          potentialContenders: sql.raw('excluded.potential_contenders'),
          model: sql.raw('excluded.model'),
          promptVersion: sql.raw('excluded.prompt_version'),
          batchId: sql.raw('excluded.batch_id'),
          generatedAt: sql.raw('excluded.generated_at'),
        },
      }),
    db.run(rebuildContentSql(ids)),
  ])
}

export async function upsertScoring(
  rows: ScoringUpsert[],
  meta: StageMetadata,
  target: DbTarget,
): Promise<void> {
  if (rows.length === 0) return
  const db = getDrizzleDb(target)
  const values = rows.map((r) => ({
    sessionId: r.sessionId,
    scorecard: r.scorecard,
    model: meta.model,
    promptVersion: meta.promptVersion,
    batchId: meta.batchId ?? null,
    generatedAt: meta.generatedAt,
  }))
  const ids = rows.map((r) => r.sessionId)
  await db.batch([
    db
      .insert(sessionScoringTable)
      .values(values)
      .onConflictDoUpdate({
        target: sessionScoringTable.sessionId,
        set: {
          scorecard: sql.raw('excluded.scorecard'),
          model: sql.raw('excluded.model'),
          promptVersion: sql.raw('excluded.prompt_version'),
          batchId: sql.raw('excluded.batch_id'),
          generatedAt: sql.raw('excluded.generated_at'),
        },
      }),
    db.run(rebuildContentSql(ids)),
    db.run(updateRatingsSql(ids)),
  ])
}

// ---- Bulk session rating update (used by rate-sessions) -----------------

export interface SessionRatingUpdate {
  id: string
  rSig: number
  rExp: number
  rStar: number
  rUniq: number
  rDem: number
  agg: number
}

export async function updateSessionRatings(
  updates: SessionRatingUpdate[],
  target: DbTarget,
): Promise<void> {
  if (updates.length === 0) return
  const db = getDrizzleDb(target)
  for (const batch of chunk(updates, 50)) {
    const ops = batch.map((u) =>
      db
        .update(sessionsTable)
        .set({
          rSig: u.rSig,
          rExp: u.rExp,
          rStar: u.rStar,
          rUniq: u.rUniq,
          rDem: u.rDem,
          agg: u.agg,
        })
        .where(eq(sessionsTable.id, u.id)),
    )
    await db.batch(ops as unknown as Parameters<typeof db.batch>[0])
  }
}

export async function readScorecards(target: DbTarget): Promise<Map<string, Scorecard>> {
  const db = getDrizzleDb(target)
  const rows = await db
    .select({
      sessionId: sessionContentTable.sessionId,
      scorecard: sessionContentTable.scorecard,
    })
    .from(sessionContentTable)
  const out = new Map<string, Scorecard>()
  for (const r of rows) {
    if (r.scorecard) out.set(r.sessionId, r.scorecard as Scorecard)
  }
  return out
}

// Re-export types for callers
export type { Contender, ContentMeta, RelatedNews, Scorecard, Session, SessionContent }
