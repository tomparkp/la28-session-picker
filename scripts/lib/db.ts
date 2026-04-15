import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

import type {
  ContentMeta,
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
    // session_content rows are JSON blobs and SELECT * can run into tens of MB.
    // Default maxBuffer is 1MB which hits ENOBUFS; give it plenty of headroom.
    { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 },
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

// Types re-exported so callers don't need to import from @/types
export type { Contender, ContentMeta, RelatedNews, Scorecard, Session, SessionContent }
