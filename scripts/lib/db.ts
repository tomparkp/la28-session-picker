import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

import type {
  ContentMeta,
  ContentSource,
  Contender,
  RelatedNews,
  Scorecard,
  Session,
  SessionContent,
} from '@/types/session'

const DB_NAME = 'la28'

export type DbTarget = 'local' | 'remote'

export function parseDbTargetFromArgs(argv: string[] = process.argv.slice(2)): DbTarget {
  return argv.includes('--remote') ? 'remote' : 'local'
}

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

export function buildSessionUpsertSql(session: Session): string {
  const cols = [
    'id',
    'sport',
    'name',
    'desc',
    'venue',
    'zone',
    'date',
    'dk',
    'time',
    'rt',
    'p_lo',
    'p_hi',
    'soccer',
    'r_sig',
    'r_exp',
    'r_star',
    'r_uniq',
    'r_dem',
    'agg',
  ]
  const vals = [
    session.id,
    session.sport,
    session.name,
    session.desc,
    session.venue,
    session.zone,
    session.date,
    session.dk,
    session.time,
    session.rt,
    session.pLo,
    session.pHi,
    session.soccer,
    session.rSig,
    session.rExp,
    session.rStar,
    session.rUniq,
    session.rDem,
    session.agg,
  ].map(sqlValue)

  const updates = cols
    .filter((c) => c !== 'id')
    .map((c) => `${c} = excluded.${c}`)
    .join(', ')

  return `INSERT INTO sessions (${cols.join(', ')}) VALUES (${vals.join(', ')}) ON CONFLICT(id) DO UPDATE SET ${updates};`
}

export function buildSessionContentUpsertSql(sessionId: string, content: SessionContent): string {
  const cols = [
    'session_id',
    'blurb',
    'potential_contenders_intro',
    'potential_contenders',
    'related_news',
    'scorecard',
    'content_meta',
  ]
  const vals = [
    sessionId,
    content.blurb ?? null,
    content.potentialContendersIntro ?? null,
    content.potentialContenders ? JSON.stringify(content.potentialContenders) : null,
    content.relatedNews ? JSON.stringify(content.relatedNews) : null,
    content.scorecard ? JSON.stringify(content.scorecard) : null,
    content.contentMeta ? JSON.stringify(content.contentMeta) : null,
  ].map(sqlValue)

  const updates = cols
    .filter((c) => c !== 'session_id')
    .map((c) => `${c} = excluded.${c}`)
    .join(', ')

  return `INSERT INTO session_content (${cols.join(', ')}) VALUES (${vals.join(', ')}) ON CONFLICT(session_id) DO UPDATE SET ${updates};`
}

export function executeSqlFile(sqlPath: string, target: DbTarget): void {
  const targetFlag = target === 'remote' ? '--remote' : '--local'
  execFileSync('pnpm', ['wrangler', 'd1', 'execute', DB_NAME, targetFlag, `--file=${sqlPath}`], {
    stdio: 'inherit',
  })
}

export function querySql<T = Record<string, unknown>>(command: string, target: DbTarget): T[] {
  const targetFlag = target === 'remote' ? '--remote' : '--local'
  const out = execFileSync(
    'pnpm',
    [
      '--silent',
      'wrangler',
      'd1',
      'execute',
      DB_NAME,
      targetFlag,
      '--json',
      `--command=${command}`,
    ],
    { encoding: 'utf8' },
  )
  const parsed = JSON.parse(out) as Array<{ results: T[] }>
  return parsed[0]?.results ?? []
}

export function executeSql(statements: string[], target: DbTarget, label = 'stmt'): void {
  if (statements.length === 0) return
  const tmpDir = resolve(process.cwd(), '.wrangler/tmp')
  const tmpPath = resolve(tmpDir, `${label}-${Date.now()}.sql`)
  mkdirSync(dirname(tmpPath), { recursive: true })
  writeFileSync(tmpPath, statements.join('\n'))
  executeSqlFile(tmpPath, target)
}

interface SessionRow {
  id: string
  sport: string
  name: string
  desc: string
  venue: string
  zone: string
  date: string
  dk: string
  time: string
  rt: string
  p_lo: number
  p_hi: number
  soccer: number
  r_sig: number
  r_exp: number
  r_star: number
  r_uniq: number
  r_dem: number
  agg: number
}

interface ContentDbRow {
  session_id: string
  blurb: string | null
  potential_contenders_intro: string | null
  potential_contenders: string | null
  related_news: string | null
  scorecard: string | null
  content_meta: string | null
}

function rowToSession(r: SessionRow): Session {
  return {
    id: r.id,
    sport: r.sport,
    name: r.name,
    desc: r.desc,
    venue: r.venue,
    zone: r.zone,
    date: r.date,
    dk: r.dk,
    time: r.time,
    rt: r.rt as Session['rt'],
    pLo: r.p_lo,
    pHi: r.p_hi,
    soccer: Boolean(r.soccer),
    rSig: r.r_sig,
    rExp: r.r_exp,
    rStar: r.r_star,
    rUniq: r.r_uniq,
    rDem: r.r_dem,
    agg: r.agg,
  }
}

function rowToContent(r: ContentDbRow): SessionContent {
  return {
    blurb: r.blurb ?? undefined,
    potentialContendersIntro: r.potential_contenders_intro ?? undefined,
    potentialContenders: r.potential_contenders
      ? (JSON.parse(r.potential_contenders) as Contender[])
      : undefined,
    relatedNews: r.related_news ? (JSON.parse(r.related_news) as RelatedNews[]) : undefined,
    scorecard: r.scorecard ? (JSON.parse(r.scorecard) as Scorecard) : undefined,
    contentMeta: r.content_meta ? (JSON.parse(r.content_meta) as ContentMeta) : undefined,
  }
}

export function readAllSessions(target: DbTarget): Session[] {
  return querySql<SessionRow>('SELECT * FROM sessions', target).map(rowToSession)
}

export function readAllContent(target: DbTarget): Record<string, SessionContent> {
  const rows = querySql<ContentDbRow>('SELECT * FROM session_content', target)
  const out: Record<string, SessionContent> = {}
  for (const row of rows) out[row.session_id] = rowToContent(row)
  return out
}

export function readSessionById(id: string, target: DbTarget): Session | null {
  const rows = querySql<SessionRow>(
    `SELECT * FROM sessions WHERE id='${id.replace(/'/g, "''")}'`,
    target,
  )
  return rows[0] ? rowToSession(rows[0]) : null
}

export function readContentById(id: string, target: DbTarget): SessionContent | null {
  const rows = querySql<ContentDbRow>(
    `SELECT * FROM session_content WHERE session_id='${id.replace(/'/g, "''")}'`,
    target,
  )
  return rows[0] ? rowToContent(rows[0]) : null
}

export function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

// ---- Staging table helpers ----------------------------------------------
//
// The content pipeline writes raw stage outputs to session_grounding,
// session_writing, and session_scoring. After each upsert the projection
// `session_content` (and for scoring, `sessions.r_*`/`agg`) gets rebuilt
// via JOIN so the runtime always reads a denormalized row.

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

function quoteIdList(ids: string[]): string {
  return ids.map((id) => sqlString(id)).join(', ')
}

function buildRebuildSessionContentSql(sessionIds: string[]): string {
  const inList = quoteIdList(sessionIds)
  return `
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
WHERE s.id IN (${inList});`.trim()
}

function buildSessionRatingUpdateSql(sessionIds: string[]): string {
  // After scoring, denormalize scorecard scores onto sessions.r_* so the list
  // view can sort without touching session_content.
  const inList = quoteIdList(sessionIds)
  return `
UPDATE sessions SET
  r_sig = (SELECT json_extract(sc.scorecard, '$.significance.score') FROM session_scoring sc WHERE sc.session_id = sessions.id),
  r_exp = (SELECT json_extract(sc.scorecard, '$.experience.score') FROM session_scoring sc WHERE sc.session_id = sessions.id),
  r_star = (SELECT json_extract(sc.scorecard, '$.starPower.score') FROM session_scoring sc WHERE sc.session_id = sessions.id),
  r_uniq = (SELECT json_extract(sc.scorecard, '$.uniqueness.score') FROM session_scoring sc WHERE sc.session_id = sessions.id),
  r_dem = (SELECT json_extract(sc.scorecard, '$.demand.score') FROM session_scoring sc WHERE sc.session_id = sessions.id),
  agg = (SELECT json_extract(sc.scorecard, '$.aggregate') FROM session_scoring sc WHERE sc.session_id = sessions.id)
WHERE sessions.id IN (${inList})
  AND EXISTS (SELECT 1 FROM session_scoring sc WHERE sc.session_id = sessions.id);`.trim()
}

export function upsertGrounding(
  rows: GroundingUpsert[],
  meta: StageMetadata,
  target: DbTarget,
): void {
  if (rows.length === 0) return
  const stmts = rows.map((r) => {
    const vals = [
      r.sessionId,
      r.facts ? JSON.stringify(r.facts) : null,
      JSON.stringify(r.relatedNews),
      r.sources ? JSON.stringify(r.sources) : null,
      meta.model,
      meta.promptVersion,
      meta.generatedAt,
    ].map(sqlValue)
    return `INSERT OR REPLACE INTO session_grounding (session_id, facts, related_news, sources, model, prompt_version, generated_at) VALUES (${vals.join(', ')});`
  })
  stmts.push(buildRebuildSessionContentSql(rows.map((r) => r.sessionId)))
  executeSql(stmts, target, 'grounding-upsert')
}

export function upsertWriting(rows: WritingUpsert[], meta: StageMetadata, target: DbTarget): void {
  if (rows.length === 0) return
  const stmts = rows.map((r) => {
    const vals = [
      r.sessionId,
      r.blurb,
      r.potentialContendersIntro ?? null,
      JSON.stringify(r.potentialContenders),
      meta.model,
      meta.promptVersion,
      meta.batchId ?? null,
      meta.generatedAt,
    ].map(sqlValue)
    return `INSERT OR REPLACE INTO session_writing (session_id, blurb, potential_contenders_intro, potential_contenders, model, prompt_version, batch_id, generated_at) VALUES (${vals.join(', ')});`
  })
  stmts.push(buildRebuildSessionContentSql(rows.map((r) => r.sessionId)))
  executeSql(stmts, target, 'writing-upsert')
}

export function upsertScoring(rows: ScoringUpsert[], meta: StageMetadata, target: DbTarget): void {
  if (rows.length === 0) return
  const ids = rows.map((r) => r.sessionId)
  const stmts = rows.map((r) => {
    const vals = [
      r.sessionId,
      JSON.stringify(r.scorecard),
      meta.model,
      meta.promptVersion,
      meta.batchId ?? null,
      meta.generatedAt,
    ].map(sqlValue)
    return `INSERT OR REPLACE INTO session_scoring (session_id, scorecard, model, prompt_version, batch_id, generated_at) VALUES (${vals.join(', ')});`
  })
  stmts.push(buildRebuildSessionContentSql(ids))
  stmts.push(buildSessionRatingUpdateSql(ids))
  executeSql(stmts, target, 'scoring-upsert')
}

// ---- Staging read helpers ------------------------------------------------

export interface StageStatus {
  sessionId: string
  groundingPromptVersion: number | null
  writingPromptVersion: number | null
  scoringPromptVersion: number | null
}

interface StageStatusRow {
  session_id: string
  g_ver: number | null
  w_ver: number | null
  s_ver: number | null
}

export function readStageStatus(target: DbTarget): Map<string, StageStatus> {
  const rows = querySql<StageStatusRow>(
    `SELECT s.id as session_id,
        g.prompt_version as g_ver,
        w.prompt_version as w_ver,
        sc.prompt_version as s_ver
     FROM sessions s
     LEFT JOIN session_grounding g ON g.session_id = s.id
     LEFT JOIN session_writing w ON w.session_id = s.id
     LEFT JOIN session_scoring sc ON sc.session_id = s.id`,
    target,
  )
  const out = new Map<string, StageStatus>()
  for (const r of rows) {
    out.set(r.session_id, {
      sessionId: r.session_id,
      groundingPromptVersion: r.g_ver ?? null,
      writingPromptVersion: r.w_ver ?? null,
      scoringPromptVersion: r.s_ver ?? null,
    })
  }
  return out
}

interface GroundingRow {
  session_id: string
  facts: string | null
  related_news: string
  sources: string | null
  model: string
  prompt_version: number
  generated_at: string
}

interface WritingRow {
  session_id: string
  blurb: string
  potential_contenders_intro: string | null
  potential_contenders: string
  model: string
  prompt_version: number
  batch_id: string | null
  generated_at: string
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

export function readGroundingForSession(
  sessionId: string,
  target: DbTarget,
): GroundingStageData | null {
  const rows = querySql<GroundingRow>(
    `SELECT * FROM session_grounding WHERE session_id=${sqlString(sessionId)}`,
    target,
  )
  const row = rows[0]
  if (!row) return null
  return {
    facts: row.facts ? (JSON.parse(row.facts) as string[]) : null,
    relatedNews: JSON.parse(row.related_news) as RelatedNews[],
    sources: row.sources ? (JSON.parse(row.sources) as ContentSource[]) : undefined,
    model: row.model,
    promptVersion: row.prompt_version,
    generatedAt: row.generated_at,
  }
}

export function readWritingForSession(
  sessionId: string,
  target: DbTarget,
): WritingStageData | null {
  const rows = querySql<WritingRow>(
    `SELECT * FROM session_writing WHERE session_id=${sqlString(sessionId)}`,
    target,
  )
  const row = rows[0]
  if (!row) return null
  return {
    blurb: row.blurb,
    potentialContendersIntro: row.potential_contenders_intro ?? undefined,
    potentialContenders: JSON.parse(row.potential_contenders) as Contender[],
    model: row.model,
    promptVersion: row.prompt_version,
    generatedAt: row.generated_at,
  }
}

// Types re-exported so callers don't need to import from @/types
export type { Contender, ContentMeta, RelatedNews, Scorecard, Session, SessionContent }
