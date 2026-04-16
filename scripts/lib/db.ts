import { execFile } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { promisify } from 'node:util'

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

const execFileP = promisify(execFile)
const DB_NAME = 'la28'

const D1_CHUNK_SIZE_6_COLS = 16
const D1_CHUNK_SIZE_7_COLS = 14
const D1_CHUNK_SIZE_8_COLS = 12

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

// ---- Remote write path (wrangler shellout) ------------------------------
//
// The Cloudflare D1 REST /query endpoint accepts only single-statement
// {sql, params} requests and has no batch endpoint we can hit reliably from
// the Drizzle sqlite-proxy. wrangler's `d1 execute --file` uses Cloudflare's
// purpose-built /import flow and works for arbitrary multi-statement SQL.
// Local writes stay on better-sqlite3 (via Drizzle) because that's fast and
// already correct.

function sqlString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`
}

function sqlValue(value: unknown): string {
  if (value === null || value === undefined) return 'NULL'
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'NULL'
  if (typeof value === 'boolean') return value ? '1' : '0'
  if (typeof value === 'string') return sqlString(value)
  return sqlString(JSON.stringify(value))
}

function sqlIdList(ids: string[]): string {
  return ids.map(sqlValue).join(', ')
}

async function executeRemoteSql(statements: string[], label: string): Promise<void> {
  if (statements.length === 0) return
  const tmpDir = resolve(process.cwd(), '.wrangler/tmp')
  const stamp = `${Date.now()}-${process.pid}-${Math.random().toString(36).slice(2, 8)}`
  const tmpPath = resolve(tmpDir, `${label}-${stamp}.sql`)
  mkdirSync(dirname(tmpPath), { recursive: true })
  writeFileSync(tmpPath, statements.join('\n'))
  try {
    await execFileP(
      'pnpm',
      ['--silent', 'wrangler', 'd1', 'execute', DB_NAME, '--remote', `--file=${tmpPath}`],
      { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 },
    )
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string }
    if (e.stdout) process.stderr.write(String(e.stdout))
    if (e.stderr) process.stderr.write(String(e.stderr))
    throw err
  }
}

function buildGroundingUpsertSql(rows: GroundingUpsert[], meta: StageMetadata): string {
  const tuples = rows
    .map((r) => {
      const vals = [
        r.sessionId,
        r.facts === null ? null : JSON.stringify(r.facts),
        JSON.stringify(r.relatedNews),
        r.sources === undefined ? null : JSON.stringify(r.sources),
        meta.model,
        meta.promptVersion,
        meta.generatedAt,
      ]
      return `(${vals.map(sqlValue).join(', ')})`
    })
    .join(',\n  ')
  return `INSERT INTO session_grounding (session_id, facts, related_news, sources, model, prompt_version, generated_at) VALUES
  ${tuples}
ON CONFLICT(session_id) DO UPDATE SET
  facts = excluded.facts,
  related_news = excluded.related_news,
  sources = excluded.sources,
  model = excluded.model,
  prompt_version = excluded.prompt_version,
  generated_at = excluded.generated_at;`
}

function buildWritingUpsertSql(rows: WritingUpsert[], meta: StageMetadata): string {
  const tuples = rows
    .map((r) => {
      const vals = [
        r.sessionId,
        r.blurb,
        r.potentialContendersIntro ?? null,
        JSON.stringify(r.potentialContenders),
        meta.model,
        meta.promptVersion,
        meta.batchId ?? null,
        meta.generatedAt,
      ]
      return `(${vals.map(sqlValue).join(', ')})`
    })
    .join(',\n  ')
  return `INSERT INTO session_writing (session_id, blurb, potential_contenders_intro, potential_contenders, model, prompt_version, batch_id, generated_at) VALUES
  ${tuples}
ON CONFLICT(session_id) DO UPDATE SET
  blurb = excluded.blurb,
  potential_contenders_intro = excluded.potential_contenders_intro,
  potential_contenders = excluded.potential_contenders,
  model = excluded.model,
  prompt_version = excluded.prompt_version,
  batch_id = excluded.batch_id,
  generated_at = excluded.generated_at;`
}

function buildScoringUpsertSql(rows: ScoringUpsert[], meta: StageMetadata): string {
  const tuples = rows
    .map((r) => {
      const vals = [
        r.sessionId,
        JSON.stringify(r.scorecard),
        meta.model,
        meta.promptVersion,
        meta.batchId ?? null,
        meta.generatedAt,
      ]
      return `(${vals.map(sqlValue).join(', ')})`
    })
    .join(',\n  ')
  return `INSERT INTO session_scoring (session_id, scorecard, model, prompt_version, batch_id, generated_at) VALUES
  ${tuples}
ON CONFLICT(session_id) DO UPDATE SET
  scorecard = excluded.scorecard,
  model = excluded.model,
  prompt_version = excluded.prompt_version,
  batch_id = excluded.batch_id,
  generated_at = excluded.generated_at;`
}

function buildRebuildContentSqlString(ids: string[]): string {
  return `INSERT OR REPLACE INTO session_content
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
WHERE s.id IN (${sqlIdList(ids)});`
}

function buildUpdateRatingsSqlString(ids: string[]): string {
  return `UPDATE sessions SET
  r_sig = (SELECT json_extract(sc.scorecard, '$.significance.score') FROM session_scoring sc WHERE sc.session_id = sessions.id),
  r_exp = (SELECT json_extract(sc.scorecard, '$.experience.score') FROM session_scoring sc WHERE sc.session_id = sessions.id),
  r_star = (SELECT json_extract(sc.scorecard, '$.starPower.score') FROM session_scoring sc WHERE sc.session_id = sessions.id),
  r_uniq = (SELECT json_extract(sc.scorecard, '$.uniqueness.score') FROM session_scoring sc WHERE sc.session_id = sessions.id),
  r_dem = (SELECT json_extract(sc.scorecard, '$.demand.score') FROM session_scoring sc WHERE sc.session_id = sessions.id),
  agg = (SELECT json_extract(sc.scorecard, '$.aggregate') FROM session_scoring sc WHERE sc.session_id = sessions.id)
WHERE sessions.id IN (${sqlIdList(ids)})
  AND EXISTS (SELECT 1 FROM session_scoring sc WHERE sc.session_id = sessions.id);`
}

// ---- Stage upserts -------------------------------------------------------
//
// Each upsert writes to a raw staging table, then rebuilds the
// session_content projection (and for scoring, sessions.r_*) via JOIN.
// Local: Drizzle/better-sqlite3 in a single batch (atomic).
// Remote: SQL string written to a tempfile and replayed via `wrangler d1
// execute --file` — statements run sequentially, each auto-commits.

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
  if (target === 'remote') {
    const statements: string[] = []
    for (const batch of chunk(rows, D1_CHUNK_SIZE_7_COLS)) {
      statements.push(buildGroundingUpsertSql(batch, meta))
      statements.push(buildRebuildContentSqlString(batch.map((r) => r.sessionId)))
    }
    await executeRemoteSql(statements, 'grounding')
    return
  }
  const db = getDrizzleDb(target)
  for (const batch of chunk(rows, D1_CHUNK_SIZE_7_COLS)) {
    const values = batch.map((r) => ({
      sessionId: r.sessionId,
      facts: r.facts,
      relatedNews: r.relatedNews,
      sources: r.sources ?? null,
      model: meta.model,
      promptVersion: meta.promptVersion,
      generatedAt: meta.generatedAt,
    }))
    const ids = batch.map((r) => r.sessionId)
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
}

export async function upsertWriting(
  rows: WritingUpsert[],
  meta: StageMetadata,
  target: DbTarget,
): Promise<void> {
  if (rows.length === 0) return
  if (target === 'remote') {
    const statements: string[] = []
    for (const batch of chunk(rows, D1_CHUNK_SIZE_8_COLS)) {
      statements.push(buildWritingUpsertSql(batch, meta))
      statements.push(buildRebuildContentSqlString(batch.map((r) => r.sessionId)))
    }
    await executeRemoteSql(statements, 'writing')
    return
  }
  const db = getDrizzleDb(target)
  for (const batch of chunk(rows, D1_CHUNK_SIZE_8_COLS)) {
    const values = batch.map((r) => ({
      sessionId: r.sessionId,
      blurb: r.blurb,
      potentialContendersIntro: r.potentialContendersIntro ?? null,
      potentialContenders: r.potentialContenders,
      model: meta.model,
      promptVersion: meta.promptVersion,
      batchId: meta.batchId ?? null,
      generatedAt: meta.generatedAt,
    }))
    const ids = batch.map((r) => r.sessionId)
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
}

export async function upsertScoring(
  rows: ScoringUpsert[],
  meta: StageMetadata,
  target: DbTarget,
): Promise<void> {
  if (rows.length === 0) return
  if (target === 'remote') {
    const statements: string[] = []
    for (const batch of chunk(rows, D1_CHUNK_SIZE_6_COLS)) {
      const ids = batch.map((r) => r.sessionId)
      statements.push(buildScoringUpsertSql(batch, meta))
      statements.push(buildRebuildContentSqlString(ids))
      statements.push(buildUpdateRatingsSqlString(ids))
    }
    await executeRemoteSql(statements, 'scoring')
    return
  }
  const db = getDrizzleDb(target)
  for (const batch of chunk(rows, D1_CHUNK_SIZE_6_COLS)) {
    const values = batch.map((r) => ({
      sessionId: r.sessionId,
      scorecard: r.scorecard,
      model: meta.model,
      promptVersion: meta.promptVersion,
      batchId: meta.batchId ?? null,
      generatedAt: meta.generatedAt,
    }))
    const ids = batch.map((r) => r.sessionId)
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
}

// Re-export types for callers
export type { Contender, ContentMeta, RelatedNews, Scorecard, Session, SessionContent }
