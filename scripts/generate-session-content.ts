import 'dotenv/config'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

import Anthropic from '@anthropic-ai/sdk'
import pLimit from 'p-limit'

import type { Session, SessionContent } from '../src/types/session.js'
import {
  ANTHROPIC_DEFAULT_MODEL,
  CONTENT_PATH,
  GROUNDING_VERSION,
  type GroundingData,
  PERPLEXITY_DEFAULT_MODEL,
  ROOT,
  SCORING_BATCH_SIZE,
  SCORING_VERSION,
  type ScoringData,
  SESSIONS_PATH,
  WRITING_BATCH_SIZE,
  WRITING_VERSION,
  type WritingData,
  fetchGrounding,
  generateScoring,
  generateWriting,
  writeJson,
} from './lib/session-content.js'

// Conservative concurrency defaults. Perplexity sonar-pro is typically 50 req/min;
// 5 in flight averaging ~12s/call ≈ 25 req/min, well under the limit.
// Anthropic tier-1 output TPM (8k/min on sonnet-4.5) is the binding constraint;
// 2 concurrent writing batches (~2.5k output each) stays safely under the cap.
const DEFAULT_GROUNDING_CONCURRENCY = 5
const DEFAULT_WRITING_CONCURRENCY = 2
const DEFAULT_SCORING_CONCURRENCY = 2

interface GroundingCheckpoint {
  meta: {
    model: string
    promptVersion: number
    sportFilter?: string
    forceAll: boolean
  }
  generatedAt: string
  updatedAt: string
  results: Record<string, GroundingData>
}

interface WritingCheckpoint {
  meta: {
    model: string
    promptVersion: number
    groundingVersion: number
    sportFilter?: string
    forceAll: boolean
  }
  generatedAt: string
  updatedAt: string
  results: Record<string, WritingData>
}

interface ScoringCheckpoint {
  meta: {
    model: string
    promptVersion: number
    groundingVersion: number
    writingVersion: number
    sportFilter?: string
    forceAll: boolean
  }
  generatedAt: string
  updatedAt: string
  results: Record<string, ScoringData>
}

function getArgValue(name: string): string | undefined {
  const prefix = `${name}=`
  const arg = process.argv.find((a) => a.startsWith(prefix))
  return arg ? arg.slice(prefix.length) : undefined
}

function safeName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, '-')
}

function sportSlug(sportFilter: string | undefined) {
  return sportFilter ? safeName(sportFilter) : 'all'
}

function modeSlug(forceAll: boolean) {
  return forceAll ? 'force' : 'missing'
}

function getGroundingPath(model: string, sportFilter: string | undefined, forceAll: boolean) {
  return resolve(
    ROOT,
    '.cache',
    'generate-session-content',
    `grounding-v${GROUNDING_VERSION}-perplexity-${safeName(model)}-${sportSlug(sportFilter)}-${modeSlug(forceAll)}.json`,
  )
}

function getWritingPath(model: string, sportFilter: string | undefined, forceAll: boolean) {
  return resolve(
    ROOT,
    '.cache',
    'generate-session-content',
    `writing-v${WRITING_VERSION}-anthropic-${safeName(model)}-${sportSlug(sportFilter)}-${modeSlug(forceAll)}.json`,
  )
}

function getScoringPath(model: string, sportFilter: string | undefined, forceAll: boolean) {
  return resolve(
    ROOT,
    '.cache',
    'generate-session-content',
    `scoring-v${SCORING_VERSION}-anthropic-${safeName(model)}-${sportSlug(sportFilter)}-${modeSlug(forceAll)}.json`,
  )
}

function loadGroundingCheckpoint(
  path: string,
  model: string,
  sportFilter: string | undefined,
  forceAll: boolean,
): GroundingCheckpoint {
  const now = new Date().toISOString()
  const fresh: GroundingCheckpoint = {
    meta: { model, promptVersion: GROUNDING_VERSION, sportFilter, forceAll },
    generatedAt: now,
    updatedAt: now,
    results: {},
  }
  if (!existsSync(path)) return fresh
  const existing = JSON.parse(readFileSync(path, 'utf8')) as GroundingCheckpoint
  const same =
    existing.meta.model === model &&
    existing.meta.promptVersion === GROUNDING_VERSION &&
    existing.meta.sportFilter === sportFilter &&
    existing.meta.forceAll === forceAll
  if (!same) {
    throw new Error(`Grounding checkpoint metadata mismatch in ${path}.`)
  }
  return existing
}

function loadWritingCheckpoint(
  path: string,
  model: string,
  sportFilter: string | undefined,
  forceAll: boolean,
): WritingCheckpoint {
  const now = new Date().toISOString()
  const fresh: WritingCheckpoint = {
    meta: {
      model,
      promptVersion: WRITING_VERSION,
      groundingVersion: GROUNDING_VERSION,
      sportFilter,
      forceAll,
    },
    generatedAt: now,
    updatedAt: now,
    results: {},
  }
  if (!existsSync(path)) return fresh
  const existing = JSON.parse(readFileSync(path, 'utf8')) as WritingCheckpoint
  const same =
    existing.meta.model === model &&
    existing.meta.promptVersion === WRITING_VERSION &&
    existing.meta.groundingVersion === GROUNDING_VERSION &&
    existing.meta.sportFilter === sportFilter &&
    existing.meta.forceAll === forceAll
  if (!same) {
    throw new Error(`Writing checkpoint metadata mismatch in ${path}.`)
  }
  return existing
}

function loadScoringCheckpoint(
  path: string,
  model: string,
  sportFilter: string | undefined,
  forceAll: boolean,
): ScoringCheckpoint {
  const now = new Date().toISOString()
  const fresh: ScoringCheckpoint = {
    meta: {
      model,
      promptVersion: SCORING_VERSION,
      groundingVersion: GROUNDING_VERSION,
      writingVersion: WRITING_VERSION,
      sportFilter,
      forceAll,
    },
    generatedAt: now,
    updatedAt: now,
    results: {},
  }
  if (!existsSync(path)) return fresh
  const existing = JSON.parse(readFileSync(path, 'utf8')) as ScoringCheckpoint
  const same =
    existing.meta.model === model &&
    existing.meta.promptVersion === SCORING_VERSION &&
    existing.meta.groundingVersion === GROUNDING_VERSION &&
    existing.meta.writingVersion === WRITING_VERSION &&
    existing.meta.sportFilter === sportFilter &&
    existing.meta.forceAll === forceAll
  if (!same) {
    throw new Error(`Scoring checkpoint metadata mismatch in ${path}.`)
  }
  return existing
}

function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size))
  return chunks
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback
  const n = Number.parseInt(value, 10)
  if (!Number.isFinite(n) || n < 1) return fallback
  return n
}

// Serialize checkpoint writes so parallel workers don't race the same file.
function createWriteQueue() {
  let tail: Promise<void> = Promise.resolve()
  return function enqueue(fn: () => void): Promise<void> {
    const next = tail.then(() => {
      fn()
    })
    tail = next.catch(() => {})
    return next
  }
}

function groupBySport<T extends { sport: string }>(items: T[]): Map<string, T[]> {
  const groups = new Map<string, T[]>()
  for (const s of items) {
    const list = groups.get(s.sport)
    if (list) list.push(s)
    else groups.set(s.sport, [s])
  }
  return groups
}

async function main() {
  const perplexityModel = getArgValue('--perplexity-model') ?? PERPLEXITY_DEFAULT_MODEL
  const anthropicModel = getArgValue('--anthropic-model') ?? ANTHROPIC_DEFAULT_MODEL
  const forceAll = process.argv.includes('--force')
  const dryRun = process.argv.includes('--dry-run')
  const skipGrounding = process.argv.includes('--skip-grounding')
  const skipWriting = process.argv.includes('--skip-writing')
  const skipScoring = process.argv.includes('--skip-scoring')
  const sportFilter = getArgValue('--sport')
  const groundingConcurrency = parsePositiveInt(
    getArgValue('--grounding-concurrency'),
    DEFAULT_GROUNDING_CONCURRENCY,
  )
  const writingConcurrency = parsePositiveInt(
    getArgValue('--writing-concurrency'),
    DEFAULT_WRITING_CONCURRENCY,
  )
  const scoringConcurrency = parsePositiveInt(
    getArgValue('--scoring-concurrency'),
    DEFAULT_SCORING_CONCURRENCY,
  )

  const perplexityKey = process.env.PERPLEXITY_API_KEY
  const anthropicKey = process.env.ANTHROPIC_API_KEY

  if (!dryRun) {
    if (!skipGrounding && !perplexityKey) {
      console.error('Error: PERPLEXITY_API_KEY is required (or use --skip-grounding)')
      process.exit(1)
    }
    if (!skipWriting && !anthropicKey) {
      console.error('Error: ANTHROPIC_API_KEY is required (or use --skip-writing)')
      process.exit(1)
    }
    if (!skipScoring && !anthropicKey) {
      console.error('Error: ANTHROPIC_API_KEY is required (or use --skip-scoring)')
      process.exit(1)
    }
  }

  const anthropicClient = anthropicKey ? new Anthropic({ apiKey: anthropicKey }) : null

  const groundingPath = getGroundingPath(perplexityModel, sportFilter, forceAll)
  const writingPath = getWritingPath(anthropicModel, sportFilter, forceAll)
  const scoringPath = getScoringPath(anthropicModel, sportFilter, forceAll)

  console.log(`Reading ${SESSIONS_PATH}`)
  console.log(`Reading ${CONTENT_PATH}`)
  console.log(`Grounding: perplexity ${perplexityModel}  concurrency=${groundingConcurrency}`)
  console.log(`  → ${groundingPath}`)
  console.log(`Writing:   anthropic  ${anthropicModel}  concurrency=${writingConcurrency}`)
  console.log(`  → ${writingPath}`)
  console.log(`Scoring:   anthropic  ${anthropicModel}  concurrency=${scoringConcurrency}`)
  console.log(`  → ${scoringPath}`)

  const rawSessions = JSON.parse(readFileSync(SESSIONS_PATH, 'utf8')) as Session[]
  const sessionContent = JSON.parse(readFileSync(CONTENT_PATH, 'utf8')) as Record<
    string,
    SessionContent
  >
  const sessions = rawSessions.map((session) => ({ ...session, ...sessionContent[session.id] }))
  console.log(`Loaded ${sessions.length} sessions`)

  const groundingCheckpoint = loadGroundingCheckpoint(
    groundingPath,
    perplexityModel,
    sportFilter,
    forceAll,
  )
  const writingCheckpoint = loadWritingCheckpoint(
    writingPath,
    anthropicModel,
    sportFilter,
    forceAll,
  )
  const scoringCheckpoint = loadScoringCheckpoint(
    scoringPath,
    anthropicModel,
    sportFilter,
    forceAll,
  )
  console.log(
    `Checkpoints: ${Object.keys(groundingCheckpoint.results).length} grounded, ${Object.keys(writingCheckpoint.results).length} written, ${Object.keys(scoringCheckpoint.results).length} scored`,
  )

  const sessionMap = new Map(sessions.map((s) => [s.id, s]))
  const rawSessionMap = new Map(rawSessions.map((s) => [s.id, s]))
  const needsContent = sessions.filter((s) => {
    if (sportFilter && s.sport !== sportFilter) return false
    if (forceAll) return true
    return !s.blurb || !sessionContent[s.id]?.scorecard
  })

  console.log(`${needsContent.length} session(s) to process`)
  if (needsContent.length === 0) {
    console.log('Nothing to do.')
    return
  }

  const checkpointWriter = createWriteQueue()

  // Stage 1: Grounding (parallel, rate-limited)
  if (!skipGrounding) {
    const needsGrounding = needsContent.filter((s) => !groundingCheckpoint.results[s.id])
    console.log(`\n=== Stage 1: Grounding ===`)
    console.log(`${needsGrounding.length} session(s) need grounding`)
    if (dryRun) {
      for (const s of needsGrounding) console.log(`  [dry-run] ${s.id} (${s.sport})`)
    } else if (needsGrounding.length > 0) {
      const limit = pLimit(groundingConcurrency)
      let done = 0
      await Promise.all(
        needsGrounding.map((session) =>
          limit(async () => {
            const g = await fetchGrounding(perplexityKey!, session, session.sport, perplexityModel)
            done += 1
            if (g) {
              await checkpointWriter(() => {
                groundingCheckpoint.results[session.id] = g
                groundingCheckpoint.updatedAt = new Date().toISOString()
                writeJson(groundingPath, groundingCheckpoint)
              })
              console.log(
                `  [${done}/${needsGrounding.length}] ${session.id} ✓ facts:${g.groundingFacts.length} news:${g.relatedNews.length}`,
              )
            } else {
              console.log(`  [${done}/${needsGrounding.length}] ${session.id} ✗ failed`)
            }
          }),
        ),
      )
    }
  } else {
    console.log('\n=== Stage 1: Grounding (skipped) ===')
  }

  // Stage 2: Writing (batched per sport, batches run in parallel)
  if (!skipWriting && anthropicClient) {
    const needsWriting = needsContent.filter((s) => {
      if (writingCheckpoint.results[s.id]) return false
      return skipGrounding || groundingCheckpoint.results[s.id] !== undefined
    })
    console.log(`\n=== Stage 2: Writing ===`)
    console.log(`${needsWriting.length} session(s) need writing`)
    const bySport = groupBySport(needsWriting)
    const sports = [...bySport.keys()].sort()
    type Job = { sport: string; batch: Session[] }
    const jobs: Job[] = []
    for (const sport of sports) {
      const list = bySport.get(sport)!
      for (const batch of chunk(list, WRITING_BATCH_SIZE)) jobs.push({ sport, batch })
    }
    console.log(`${jobs.length} batch(es) across ${sports.length} sport(s)`)
    if (dryRun) {
      for (const job of jobs)
        console.log(`  [dry-run] ${job.sport} batch (${job.batch.length} sessions)`)
    } else if (jobs.length > 0) {
      const limit = pLimit(writingConcurrency)
      let done = 0
      await Promise.all(
        jobs.map((job) =>
          limit(async () => {
            const groundingForBatch = new Map<string, GroundingData>()
            for (const s of job.batch) {
              const g = groundingCheckpoint.results[s.id]
              if (g) groundingForBatch.set(s.id, g)
            }
            const results = await generateWriting(
              anthropicClient,
              job.batch,
              job.sport,
              groundingForBatch,
              anthropicModel,
            )
            const gotIds = new Set<string>()
            for (const r of results) {
              if (!sessionMap.has(r.id)) continue
              gotIds.add(r.id)
            }
            await checkpointWriter(() => {
              for (const r of results) {
                if (sessionMap.has(r.id)) writingCheckpoint.results[r.id] = r
              }
              writingCheckpoint.updatedAt = new Date().toISOString()
              writeJson(writingPath, writingCheckpoint)
            })
            done += 1
            const missing = job.batch.filter((s) => !gotIds.has(s.id))
            console.log(
              `  [${done}/${jobs.length}] ${job.sport} (${job.batch.length}) ✓ wrote ${gotIds.size}${missing.length > 0 ? ` ✗ missing ${missing.map((s) => s.id).join(',')}` : ''}`,
            )
          }),
        ),
      )
    }
  } else {
    console.log('\n=== Stage 2: Writing (skipped) ===')
  }

  // Stage 3: Scoring (batched per sport, batches run in parallel)
  if (!skipScoring && anthropicClient) {
    const needsScoring = needsContent.filter((s) => {
      if (scoringCheckpoint.results[s.id]) return false
      // Need a blurb to score against — either from this run or already in content
      return !!(writingCheckpoint.results[s.id] || sessionContent[s.id]?.blurb)
    })
    console.log(`\n=== Stage 3: Scoring ===`)
    console.log(`${needsScoring.length} session(s) need scoring`)
    const bySport = groupBySport(needsScoring)
    const sports = [...bySport.keys()].sort()
    type Job = { sport: string; batch: Session[] }
    const jobs: Job[] = []
    for (const sport of sports) {
      const list = bySport.get(sport)!
      for (const batch of chunk(list, SCORING_BATCH_SIZE)) jobs.push({ sport, batch })
    }
    console.log(`${jobs.length} batch(es) across ${sports.length} sport(s)`)
    if (dryRun) {
      for (const job of jobs)
        console.log(`  [dry-run] ${job.sport} batch (${job.batch.length} sessions)`)
    } else if (jobs.length > 0) {
      const limit = pLimit(scoringConcurrency)
      let done = 0
      await Promise.all(
        jobs.map((job) =>
          limit(async () => {
            const groundingForBatch = new Map<string, GroundingData>()
            const writingForBatch = new Map<string, WritingData>()
            for (const s of job.batch) {
              const g = groundingCheckpoint.results[s.id]
              if (g) groundingForBatch.set(s.id, g)
              const w = writingCheckpoint.results[s.id]
              const existingContent = sessionContent[s.id]
              if (w) {
                writingForBatch.set(s.id, w)
              } else if (existingContent?.blurb) {
                writingForBatch.set(s.id, {
                  id: s.id,
                  blurb: existingContent.blurb,
                  potentialContendersIntro: existingContent.potentialContendersIntro ?? '',
                  potentialContenders: existingContent.potentialContenders ?? [],
                })
              }
            }
            const results = await generateScoring(
              anthropicClient,
              job.batch,
              job.sport,
              groundingForBatch,
              writingForBatch,
              anthropicModel,
            )
            const gotIds = new Set<string>()
            for (const r of results) {
              if (sessionMap.has(r.id)) gotIds.add(r.id)
            }
            await checkpointWriter(() => {
              for (const r of results) {
                if (sessionMap.has(r.id)) scoringCheckpoint.results[r.id] = r
              }
              scoringCheckpoint.updatedAt = new Date().toISOString()
              writeJson(scoringPath, scoringCheckpoint)
            })
            done += 1
            const missing = job.batch.filter((s) => !gotIds.has(s.id))
            console.log(
              `  [${done}/${jobs.length}] ${job.sport} (${job.batch.length}) ✓ scored ${gotIds.size}${missing.length > 0 ? ` ✗ missing ${missing.map((s) => s.id).join(',')}` : ''}`,
            )
          }),
        ),
      )
    }
  } else {
    console.log('\n=== Stage 3: Scoring (skipped) ===')
  }

  // Merge into session-content.json + sessions.json
  if (!dryRun) {
    const nextSessionContent = { ...sessionContent }
    for (const session of needsContent) {
      const writing = writingCheckpoint.results[session.id]
      const grounding = groundingCheckpoint.results[session.id]
      const scoring = scoringCheckpoint.results[session.id]
      const existing = nextSessionContent[session.id] ?? {}
      if (!writing && !scoring && !grounding) continue
      nextSessionContent[session.id] = {
        blurb: writing?.blurb ?? existing.blurb,
        potentialContendersIntro:
          writing?.potentialContendersIntro ?? existing.potentialContendersIntro,
        potentialContenders: writing?.potentialContenders ?? existing.potentialContenders,
        relatedNews: grounding?.relatedNews ?? existing.relatedNews ?? [],
        scorecard: scoring?.scorecard ?? existing.scorecard,
        contentMeta: {
          provider: 'hybrid',
          groundingModel: grounding ? perplexityModel : existing.contentMeta?.groundingModel,
          writingModel: writing || scoring ? anthropicModel : existing.contentMeta?.writingModel,
          generatedAt: new Date().toISOString(),
          sources: grounding?.sources ?? existing.contentMeta?.sources,
        },
      }
    }
    const output = JSON.stringify(nextSessionContent, null, 2)
    writeFileSync(CONTENT_PATH, `${output}\n`)
    console.log(`\nWrote ${Object.keys(nextSessionContent).length} entries to ${CONTENT_PATH}`)

    // Backfill flat r* fields on sessions.json from scorecards
    let updatedSessions = 0
    for (const session of rawSessions) {
      const sc = nextSessionContent[session.id]?.scorecard
      if (!sc) continue
      const target = rawSessionMap.get(session.id)
      if (!target) continue
      target.rSig = sc.significance.score
      target.rExp = sc.experience.score
      target.rStar = sc.starPower.score
      target.rUniq = sc.uniqueness.score
      target.rDem = sc.demand.score
      target.agg = sc.aggregate
      updatedSessions += 1
    }
    if (updatedSessions > 0) {
      writeFileSync(SESSIONS_PATH, `${JSON.stringify(rawSessions, null, 2)}\n`)
      console.log(`Updated ${updatedSessions} session r* fields in ${SESSIONS_PATH}`)
    }
  }

  const grounded = Object.keys(groundingCheckpoint.results).length
  const written = Object.keys(writingCheckpoint.results).length
  const scored = Object.keys(scoringCheckpoint.results).length
  console.log(`\nDone: ${grounded} grounded, ${written} written, ${scored} scored`)
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
