import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

import type { Contender, ContentSource, RelatedNews, RoundType, Scorecard } from '@/types/session'

// One-time migration helper: dump every row from D1 (sessions + staging
// tables) into the four JSON files the app will read from post-migration.
// Delete this script after the PR lands — the JSON store is the source of
// truth from then on.

const DB_NAME = 'la28'
const DATA_DIR = resolve(process.cwd(), 'src/data')

type Target = 'local' | 'remote'

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

interface GroundingRow {
  session_id: string
  facts: string | null
  related_news: string | null
  sources: string | null
  model: string
  prompt_version: number
  generated_at: string
}

interface WritingRow {
  session_id: string
  blurb: string
  potential_contenders_intro: string | null
  potential_contenders: string | null
  model: string
  prompt_version: number
  batch_id: string | null
  generated_at: string
}

interface ScoringRow {
  session_id: string
  scorecard: string
  model: string
  prompt_version: number
  batch_id: string | null
  generated_at: string
}

interface SessionOut {
  id: string
  sport: string
  name: string
  desc: string
  venue: string
  zone: string
  date: string
  dk: string
  time: string
  rt: RoundType
  pLo: number
  pHi: number
  soccer: boolean
}

interface GroundingOut {
  facts: string[] | null
  relatedNews: RelatedNews[]
  sources: ContentSource[] | null
  model: string
  promptVersion: number
  generatedAt: string
}

interface WritingOut {
  blurb: string
  potentialContendersIntro: string | null
  potentialContenders: Contender[]
  model: string
  promptVersion: number
  batchId: string | null
  generatedAt: string
}

interface ScoringOut {
  agg: number
  rSig: number
  rExp: number
  rStar: number
  rUniq: number
  rDem: number
  scorecard: Scorecard | null
  model: string
  promptVersion: number
  batchId: string | null
  generatedAt: string
}

function parseTarget(): Target {
  return process.argv.includes('--local') ? 'local' : 'remote'
}

function query<T>(target: Target, sql: string): T[] {
  const flag = target === 'remote' ? '--remote' : '--local'
  const stdout = execFileSync(
    'pnpm',
    ['--silent', 'wrangler', 'd1', 'execute', DB_NAME, flag, '--json', `--command=${sql}`],
    { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 },
  )
  const parsed = JSON.parse(stdout) as Array<{ results: T[] }>
  return parsed[0]?.results ?? []
}

function parseJsonCell<T>(raw: string | null): T | null {
  if (raw === null || raw === undefined || raw === '') return null
  return JSON.parse(raw) as T
}

function writeJson(path: string, data: unknown) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`)
}

async function main() {
  const target = parseTarget()
  console.log(`Dumping D1 (${target}) → JSON under ${DATA_DIR}`)

  const sessionRows = query<SessionRow>(target, 'SELECT * FROM sessions;')
  const groundingRows = query<GroundingRow>(target, 'SELECT * FROM session_grounding;')
  const writingRows = query<WritingRow>(target, 'SELECT * FROM session_writing;')
  const scoringRows = query<ScoringRow>(target, 'SELECT * FROM session_scoring;')

  const sessionsOut: SessionOut[] = sessionRows
    .map((r) => ({
      id: r.id,
      sport: r.sport,
      name: r.name,
      desc: r.desc,
      venue: r.venue,
      zone: r.zone,
      date: r.date,
      dk: r.dk,
      time: r.time,
      rt: r.rt as RoundType,
      pLo: r.p_lo,
      pHi: r.p_hi,
      soccer: r.soccer === 1,
    }))
    .sort((a, b) => a.id.localeCompare(b.id))

  const groundingOut: Record<string, GroundingOut> = {}
  for (const r of groundingRows.slice().sort((a, b) => a.session_id.localeCompare(b.session_id))) {
    groundingOut[r.session_id] = {
      facts: parseJsonCell<string[]>(r.facts),
      relatedNews: parseJsonCell<RelatedNews[]>(r.related_news) ?? [],
      sources: parseJsonCell<ContentSource[]>(r.sources),
      model: r.model,
      promptVersion: r.prompt_version,
      generatedAt: r.generated_at,
    }
  }

  const writingOut: Record<string, WritingOut> = {}
  for (const r of writingRows.slice().sort((a, b) => a.session_id.localeCompare(b.session_id))) {
    writingOut[r.session_id] = {
      blurb: r.blurb,
      potentialContendersIntro: r.potential_contenders_intro,
      potentialContenders: parseJsonCell<Contender[]>(r.potential_contenders) ?? [],
      model: r.model,
      promptVersion: r.prompt_version,
      batchId: r.batch_id,
      generatedAt: r.generated_at,
    }
  }

  // scoring.json is a merge of session_scoring (full scorecard, 17 rows) and
  // the legacy ratings denormalized onto sessions (all 847 rows). Modern
  // entries carry both the flat ratings and the full scorecard; legacy
  // entries carry only the flat ratings so the UI's sort/filter/table keeps
  // working until they get re-scored.
  const scoringByIdx = new Map(scoringRows.map((r) => [r.session_id, r]))
  const scoringOut: Record<string, ScoringOut> = {}
  for (const s of sessionsOut) {
    const legacy = sessionRows.find((r) => r.id === s.id)!
    const modern = scoringByIdx.get(s.id)
    if (modern) {
      const scorecard = parseJsonCell<Scorecard>(modern.scorecard)
      if (!scorecard) throw new Error(`scoring row for ${s.id} has no scorecard`)
      scoringOut[s.id] = {
        agg: scorecard.aggregate,
        rSig: scorecard.significance.score,
        rExp: scorecard.experience.score,
        rStar: scorecard.starPower.score,
        rUniq: scorecard.uniqueness.score,
        rDem: scorecard.demand.score,
        scorecard,
        model: modern.model,
        promptVersion: modern.prompt_version,
        batchId: modern.batch_id,
        generatedAt: modern.generated_at,
      }
      continue
    }
    if (legacy.agg > 0) {
      scoringOut[s.id] = {
        agg: legacy.agg,
        rSig: legacy.r_sig,
        rExp: legacy.r_exp,
        rStar: legacy.r_star,
        rUniq: legacy.r_uniq,
        rDem: legacy.r_dem,
        scorecard: null,
        model: 'legacy',
        promptVersion: 0,
        batchId: null,
        generatedAt: '',
      }
    }
  }

  writeJson(resolve(DATA_DIR, 'sessions.json'), sessionsOut)
  writeJson(resolve(DATA_DIR, 'session-facts.json'), groundingOut)
  writeJson(resolve(DATA_DIR, 'writing.json'), writingOut)
  writeJson(resolve(DATA_DIR, 'scoring.json'), scoringOut)

  const modernCount = Object.values(scoringOut).filter((v) => v.scorecard !== null).length
  const legacyCount = Object.keys(scoringOut).length - modernCount
  console.log(`  sessions.json     ${sessionsOut.length} sessions`)
  console.log(`  session-facts.json ${Object.keys(groundingOut).length} entries`)
  console.log(`  writing.json     ${Object.keys(writingOut).length} entries`)
  console.log(
    `  scoring.json     ${Object.keys(scoringOut).length} entries (${modernCount} modern, ${legacyCount} legacy)`,
  )
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
