import 'dotenv/config'
import pLimit from 'p-limit'

import type { SessionSource } from '../src/types/session.js'
import {
  chunk as chunkList,
  readAllSessions,
  readStageStatus,
  upsertGrounding,
  type StageStatus,
} from './lib/content-store.js'
import {
  GROUNDING_BATCH_SIZE,
  GROUNDING_VERSION,
  PERPLEXITY_DEFAULT_MODEL,
  buildCorrectionContext,
  fetchGroundingBatch,
} from './lib/session-content.js'

// Perplexity sonar-pro is typically 50 req/min; 5 in flight averaging ~12s/call
// ≈ 25 req/min.
const DEFAULT_CONCURRENCY = 5

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

async function main() {
  const perplexityModel = getArgValue('--perplexity-model') ?? PERPLEXITY_DEFAULT_MODEL
  const forceAll = process.argv.includes('--force')
  const dryRun = process.argv.includes('--dry-run')
  const sportFilter = getArgValue('--sport')
  const concurrency = parsePositiveInt(getArgValue('--concurrency'), DEFAULT_CONCURRENCY)

  const perplexityKey = process.env.PERPLEXITY_API_KEY
  if (!dryRun && !perplexityKey) {
    console.error('Error: PERPLEXITY_API_KEY is required (or use --dry-run)')
    process.exit(1)
  }

  console.log(`Grounding: perplexity ${perplexityModel}  concurrency=${concurrency}`)

  const sessions = readAllSessions()
  const stageStatus = readStageStatus()
  console.log(`Loaded ${sessions.length} sessions from src/data/sessions.json`)

  const targets = sessions.filter((s) => {
    if (sportFilter && s.sport !== sportFilter) return false
    return needsGrounding(stageStatus.get(s.id), forceAll)
  })
  console.log(`${targets.length} session(s) need grounding`)

  if (dryRun) {
    for (const s of targets) console.log(`  [dry-run] ${s.id} (${s.sport})`)
    return
  }
  if (targets.length === 0) return

  const bySport = groupBySport(targets)
  const sports = [...bySport.keys()].sort()
  type GroundingJob = { sport: string; batch: SessionSource[] }
  const jobs: GroundingJob[] = []
  for (const sport of sports) {
    const list = bySport.get(sport)!
    for (const batch of chunkList(list, GROUNDING_BATCH_SIZE)) {
      jobs.push({ sport, batch })
    }
  }
  console.log(`${jobs.length} batch(es) across ${sports.length} sport(s)`)

  const limit = pLimit(concurrency)
  let done = 0
  await Promise.all(
    jobs.map((job) =>
      limit(async () => {
        const extraInstructions = buildCorrectionContext({
          sessionIds: job.batch.map((s) => s.id),
          sport: job.sport,
        })
        const results = await fetchGroundingBatch(
          perplexityKey!,
          job.batch,
          job.sport,
          perplexityModel,
          extraInstructions,
        )
        const got = new Set(results.map((r) => r.id))
        const upserts = results.map((g) => ({
          sessionId: g.id,
          facts: g.groundingFacts,
          relatedNews: g.relatedNews,
          sources: g.sources,
        }))
        if (upserts.length > 0) {
          await upsertGrounding(upserts, {
            model: perplexityModel,
            promptVersion: GROUNDING_VERSION,
            generatedAt: new Date().toISOString(),
          })
        }
        done += 1
        const missing = job.batch.filter((s) => !got.has(s.id))
        const tail = missing.length > 0 ? ` ✗ missing ${missing.map((s) => s.id).join(',')}` : ''
        console.log(
          `  [${done}/${jobs.length}] ${job.sport} (${job.batch.length}) ✓ ${results.length} grounded${tail}`,
        )
      }),
    ),
  )

  const finalStatus = readStageStatus()
  const grounded = [...finalStatus.values()].filter(
    (s) => (s.groundingPromptVersion ?? -1) >= GROUNDING_VERSION,
  ).length
  console.log(`\nDone: ${grounded} grounded (v${GROUNDING_VERSION})`)
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
