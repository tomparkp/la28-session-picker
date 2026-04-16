import 'dotenv/config'
import Anthropic from '@anthropic-ai/sdk'
import pLimit from 'p-limit'

import type { Session } from '../src/types/session.js'
import {
  chunk as chunkList,
  parseDbTargetFromArgs,
  readAllSessions,
  readStageStatus,
  upsertGrounding,
  upsertScoring,
  upsertWriting,
  type StageStatus,
} from './lib/db.js'
import {
  ANTHROPIC_SCORING_DEFAULT_MODEL,
  ANTHROPIC_WRITING_DEFAULT_MODEL,
  GROUNDING_VERSION,
  type GroundingData,
  PERPLEXITY_DEFAULT_MODEL,
  SCORING_BATCH_SIZE,
  SCORING_VERSION,
  WRITING_BATCH_SIZE,
  WRITING_VERSION,
  type WritingData,
  type WritingJob,
  fetchGrounding,
  generateScoring,
  generateWriting,
  generateWritingViaBatches,
} from './lib/session-content.js'

// Conservative concurrency defaults. Perplexity sonar-pro is typically 50
// req/min; 5 in flight averaging ~12s/call ≈ 25 req/min. Anthropic tier-1
// output TPM (8k/min on sonnet-4.5) is the binding constraint for writing;
// 2 concurrent writing batches (~2.5k output each) stays safely under.
const DEFAULT_GROUNDING_CONCURRENCY = 5
const DEFAULT_WRITING_CONCURRENCY = 2
const DEFAULT_SCORING_CONCURRENCY = 2

function getArgValue(name: string): string | undefined {
  const prefix = `${name}=`
  const arg = process.argv.find((a) => a.startsWith(prefix))
  return arg ? arg.slice(prefix.length) : undefined
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback
  const n = Number.parseInt(value, 10)
  if (!Number.isFinite(n) || n < 1) return fallback
  return n
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

function needsGrounding(status: StageStatus | undefined, forceAll: boolean): boolean {
  if (forceAll) return true
  if (!status) return true
  return (status.groundingPromptVersion ?? -1) < GROUNDING_VERSION
}

function needsWriting(status: StageStatus | undefined, forceAll: boolean): boolean {
  if (forceAll) return true
  if (!status) return true
  return (status.writingPromptVersion ?? -1) < WRITING_VERSION
}

function needsScoring(status: StageStatus | undefined, forceAll: boolean): boolean {
  if (forceAll) return true
  if (!status) return true
  return (status.scoringPromptVersion ?? -1) < SCORING_VERSION
}

async function main() {
  const perplexityModel = getArgValue('--perplexity-model') ?? PERPLEXITY_DEFAULT_MODEL
  // --anthropic-model overrides both stages (back-compat); per-stage flags win.
  const legacyAnthropicModel = getArgValue('--anthropic-model')
  const writingModel =
    getArgValue('--anthropic-writing-model') ??
    legacyAnthropicModel ??
    ANTHROPIC_WRITING_DEFAULT_MODEL
  const scoringModel =
    getArgValue('--anthropic-scoring-model') ??
    legacyAnthropicModel ??
    ANTHROPIC_SCORING_DEFAULT_MODEL
  const forceAll = process.argv.includes('--force')
  const dryRun = process.argv.includes('--dry-run')
  const skipGrounding = process.argv.includes('--skip-grounding')
  const skipWriting = process.argv.includes('--skip-writing')
  const skipScoring = process.argv.includes('--skip-scoring')
  const noWritingBatch = process.argv.includes('--writing-no-batch')
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
    if ((!skipWriting || !skipScoring) && !anthropicKey) {
      console.error('Error: ANTHROPIC_API_KEY is required (or use --skip-writing/--skip-scoring)')
      process.exit(1)
    }
  }

  const dbTarget = parseDbTargetFromArgs()
  console.log(`D1 target: ${dbTarget}`)
  const writingMode = noWritingBatch ? `sync concurrency=${writingConcurrency}` : 'batches-api'
  console.log(`Grounding: perplexity ${perplexityModel}  concurrency=${groundingConcurrency}`)
  console.log(`Writing:   anthropic  ${writingModel}  ${writingMode}`)
  console.log(`Scoring:   anthropic  ${scoringModel}  concurrency=${scoringConcurrency}`)

  const sessions = await readAllSessions(dbTarget)
  const stageStatus = await readStageStatus(dbTarget)
  const sessionMap = new Map(sessions.map((s) => [s.id, s]))
  console.log(`Loaded ${sessions.length} sessions from D1`)

  const candidates = sessions.filter((s) => {
    if (sportFilter && s.sport !== sportFilter) return false
    const status = stageStatus.get(s.id)
    return (
      needsGrounding(status, forceAll) ||
      needsWriting(status, forceAll) ||
      needsScoring(status, forceAll)
    )
  })
  console.log(`${candidates.length} session(s) have at least one stage outstanding`)

  // Track grounding results from this run so stage 2 can use them without a
  // second DB read. Not required for resume (DB is source of truth) — just a
  // hot cache for the in-progress run.
  const groundingThisRun = new Map<string, GroundingData>()

  // Stage 1: Grounding (parallel, rate-limited)
  if (skipGrounding) {
    console.log('\n=== Stage 1: Grounding (skipped) ===')
  } else {
    const groundingTargets = candidates.filter((s) =>
      needsGrounding(stageStatus.get(s.id), forceAll),
    )
    console.log(`\n=== Stage 1: Grounding ===`)
    console.log(`${groundingTargets.length} session(s) need grounding`)

    if (dryRun) {
      for (const s of groundingTargets) console.log(`  [dry-run] ${s.id} (${s.sport})`)
    } else if (groundingTargets.length > 0) {
      const limit = pLimit(groundingConcurrency)
      let done = 0
      await Promise.all(
        groundingTargets.map((session) =>
          limit(async () => {
            const g = await fetchGrounding(perplexityKey!, session, session.sport, perplexityModel)
            done += 1
            if (!g) {
              console.log(`  [${done}/${groundingTargets.length}] ${session.id} ✗ failed`)
              return
            }
            groundingThisRun.set(session.id, g)
            await upsertGrounding(
              [
                {
                  sessionId: session.id,
                  facts: g.groundingFacts,
                  relatedNews: g.relatedNews,
                  sources: g.sources,
                },
              ],
              {
                model: perplexityModel,
                promptVersion: GROUNDING_VERSION,
                generatedAt: new Date().toISOString(),
              },
              dbTarget,
            )
            console.log(
              `  [${done}/${groundingTargets.length}] ${session.id} ✓ facts:${g.groundingFacts.length} news:${g.relatedNews.length}`,
            )
          }),
        ),
      )
    }
  }

  const anthropicClient = anthropicKey ? new Anthropic({ apiKey: anthropicKey }) : null

  // Stage 2: Writing
  if (skipWriting || !anthropicClient) {
    if (skipWriting) console.log('\n=== Stage 2: Writing (skipped) ===')
  } else {
    // Re-read stage status so we pick up grounding rows written moments ago.
    const freshStatus = await readStageStatus(dbTarget)
    const writingTargets = candidates.filter((s) => {
      const st = freshStatus.get(s.id)
      const stageDone = !needsWriting(st, forceAll)
      // Skip if writing complete AND we didn't just re-ground (force)
      if (stageDone && !forceAll) return false
      // Can't write without grounding at current version (skip-grounding allows reuse)
      return (st?.groundingPromptVersion ?? -1) >= GROUNDING_VERSION
    })
    console.log(`\n=== Stage 2: Writing ===`)
    console.log(`${writingTargets.length} session(s) ready for writing`)

    if (!dryRun && writingTargets.length > 0) {
      // Preload grounding data for sessions that haven't been loaded this run.
      const missingGrounding = writingTargets.filter((s) => !groundingThisRun.has(s.id))
      if (missingGrounding.length > 0) {
        const { readGroundingForSession } = await import('./lib/db.js')
        for (const s of missingGrounding) {
          const g = await readGroundingForSession(s.id, dbTarget)
          if (g && g.facts) {
            groundingThisRun.set(s.id, {
              id: s.id,
              groundingFacts: g.facts,
              relatedNews: g.relatedNews,
              sources: g.sources,
            })
          }
        }
      }
    }

    const bySport = groupBySport(writingTargets)
    const sports = [...bySport.keys()].sort()
    const jobs: WritingJob[] = []
    for (const sport of sports) {
      const list = bySport.get(sport)!
      for (const batch of chunkList(list, WRITING_BATCH_SIZE)) {
        const grounding = new Map<string, GroundingData>()
        for (const s of batch) {
          const g = groundingThisRun.get(s.id)
          if (g) grounding.set(s.id, g)
        }
        jobs.push({ sport, batch, grounding })
      }
    }
    console.log(`${jobs.length} batch(es) across ${sports.length} sport(s)`)

    if (dryRun) {
      for (const job of jobs)
        console.log(`  [dry-run] ${job.sport} batch (${job.batch.length} sessions)`)
    } else if (jobs.length > 0 && noWritingBatch) {
      const limit = pLimit(writingConcurrency)
      let done = 0
      await Promise.all(
        jobs.map((job) =>
          limit(async () => {
            const results = await generateWriting(
              anthropicClient,
              job.batch,
              job.sport,
              job.grounding,
              writingModel,
            )
            const toUpsert = results
              .filter((r) => sessionMap.has(r.id))
              .map((r) => ({
                sessionId: r.id,
                blurb: r.blurb,
                potentialContendersIntro: r.potentialContendersIntro || undefined,
                potentialContenders: r.potentialContenders,
              }))
            await upsertWriting(
              toUpsert,
              {
                model: writingModel,
                promptVersion: WRITING_VERSION,
                generatedAt: new Date().toISOString(),
              },
              dbTarget,
            )
            done += 1
            const missing = job.batch.filter((s) => !toUpsert.find((w) => w.sessionId === s.id))
            const tail =
              missing.length > 0 ? ` ✗ missing ${missing.map((s) => s.id).join(',')}` : ''
            console.log(
              `  [${done}/${jobs.length}] ${job.sport} (${job.batch.length}) ✓ wrote ${toUpsert.length}${tail}`,
            )
          }),
        ),
      )
    } else if (jobs.length > 0) {
      await generateWritingViaBatches(anthropicClient, jobs, writingModel, {
        onSportComplete: async ({ sport, outcomes, elapsedSec }) => {
          let wrote = 0
          let failed = 0
          const missing: string[] = []
          const toUpsert: Parameters<typeof upsertWriting>[0] = []
          for (const { job, results, error } of outcomes) {
            if (error) {
              failed += 1
              for (const s of job.batch) missing.push(s.id)
              continue
            }
            const got = new Set<string>()
            for (const r of results) {
              if (!sessionMap.has(r.id)) continue
              toUpsert.push({
                sessionId: r.id,
                blurb: r.blurb,
                potentialContendersIntro: r.potentialContendersIntro || undefined,
                potentialContenders: r.potentialContenders,
              })
              got.add(r.id)
              wrote += 1
            }
            for (const s of job.batch) if (!got.has(s.id)) missing.push(s.id)
            // Per-batch upsert so partial failures don't lose work from other
            // batches in the same sport.
            if (toUpsert.length > 0) {
              await upsertWriting(
                toUpsert.splice(0, toUpsert.length),
                {
                  model: writingModel,
                  promptVersion: WRITING_VERSION,
                  generatedAt: new Date().toISOString(),
                },
                dbTarget,
              )
            }
          }
          const tail = missing.length > 0 ? ` ✗ missing ${missing.join(',')}` : ''
          const fail = failed > 0 ? ` (${failed} batch error(s))` : ''
          console.log(`    ✓ ${sport} done in ${elapsedSec}s — wrote ${wrote}${fail}${tail}`)
        },
      })
    }
  }

  // Stage 3: Scoring
  if (skipScoring || !anthropicClient) {
    if (skipScoring) console.log('\n=== Stage 3: Scoring (skipped) ===')
  } else {
    const freshStatus = await readStageStatus(dbTarget)
    const scoringTargets = candidates.filter((s) => {
      const st = freshStatus.get(s.id)
      const stageDone = !needsScoring(st, forceAll)
      if (stageDone && !forceAll) return false
      // Scoring needs a blurb (writing at current version).
      return (st?.writingPromptVersion ?? -1) >= WRITING_VERSION
    })
    console.log(`\n=== Stage 3: Scoring ===`)
    console.log(`${scoringTargets.length} session(s) ready for scoring`)

    const bySport = groupBySport(scoringTargets)
    const sports = [...bySport.keys()].sort()
    type Job = { sport: string; batch: Session[] }
    const jobs: Job[] = []
    for (const sport of sports) {
      const list = bySport.get(sport)!
      for (const batch of chunkList(list, SCORING_BATCH_SIZE)) jobs.push({ sport, batch })
    }
    console.log(`${jobs.length} batch(es) across ${sports.length} sport(s)`)

    if (dryRun) {
      for (const job of jobs)
        console.log(`  [dry-run] ${job.sport} batch (${job.batch.length} sessions)`)
    } else if (jobs.length > 0) {
      const { readWritingForSession } = await import('./lib/db.js')
      const limit = pLimit(scoringConcurrency)
      let done = 0
      await Promise.all(
        jobs.map((job) =>
          limit(async () => {
            const grounding = new Map<string, GroundingData>()
            const writing = new Map<string, WritingData>()
            for (const s of job.batch) {
              const g = groundingThisRun.get(s.id)
              if (g) grounding.set(s.id, g)
              const w = await readWritingForSession(s.id, dbTarget)
              if (w) {
                writing.set(s.id, {
                  id: s.id,
                  blurb: w.blurb,
                  potentialContendersIntro: w.potentialContendersIntro ?? '',
                  potentialContenders: w.potentialContenders,
                })
              }
            }
            const results = await generateScoring(
              anthropicClient,
              job.batch,
              job.sport,
              grounding,
              writing,
              scoringModel,
            )
            const toUpsert = results
              .filter((r) => sessionMap.has(r.id))
              .map((r) => ({ sessionId: r.id, scorecard: r.scorecard }))
            await upsertScoring(
              toUpsert,
              {
                model: scoringModel,
                promptVersion: SCORING_VERSION,
                generatedAt: new Date().toISOString(),
              },
              dbTarget,
            )
            done += 1
            const missing = job.batch.filter((s) => !toUpsert.find((r) => r.sessionId === s.id))
            const tail =
              missing.length > 0 ? ` ✗ missing ${missing.map((s) => s.id).join(',')}` : ''
            console.log(
              `  [${done}/${jobs.length}] ${job.sport} (${job.batch.length}) ✓ scored ${toUpsert.length}${tail}`,
            )
          }),
        ),
      )
    }
  }

  // Report final stage coverage.
  const finalStatus = await readStageStatus(dbTarget)
  const grounded = [...finalStatus.values()].filter(
    (s) => (s.groundingPromptVersion ?? -1) >= GROUNDING_VERSION,
  ).length
  const written = [...finalStatus.values()].filter(
    (s) => (s.writingPromptVersion ?? -1) >= WRITING_VERSION,
  ).length
  const scored = [...finalStatus.values()].filter(
    (s) => (s.scoringPromptVersion ?? -1) >= SCORING_VERSION,
  ).length
  console.log(
    `\nDone: ${grounded} grounded (v${GROUNDING_VERSION}), ${written} written (v${WRITING_VERSION}), ${scored} scored (v${SCORING_VERSION})`,
  )
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
