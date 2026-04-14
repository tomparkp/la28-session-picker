import 'dotenv/config'
import Anthropic from '@anthropic-ai/sdk'

import type { SessionContent } from '../src/types/session.js'
import {
  buildSessionContentUpsertSql,
  buildSessionUpsertSql,
  executeSql,
  parseDbTargetFromArgs,
  readContentById,
  readSessionById,
} from './lib/db.js'
import {
  ANTHROPIC_SCORING_DEFAULT_MODEL,
  ANTHROPIC_WRITING_DEFAULT_MODEL,
  type GroundingData,
  PERPLEXITY_DEFAULT_MODEL,
  type WritingData,
  buildGroundingPrompt,
  buildScoringPrompt,
  buildWritingPrompt,
  fetchGrounding,
  generateScoring,
  generateWriting,
} from './lib/session-content.js'

interface ParsedArgs {
  sessionId?: string
  prompt?: string
  skipGrounding: boolean
  skipWriting: boolean
  skipScoring: boolean
  dryRun: boolean
  perplexityModel: string
  writingModel: string
  scoringModel: string
}

function parseArgs(argv: string[]): ParsedArgs {
  const parsed: ParsedArgs = {
    skipGrounding: false,
    skipWriting: false,
    skipScoring: false,
    dryRun: false,
    perplexityModel: PERPLEXITY_DEFAULT_MODEL,
    writingModel: ANTHROPIC_WRITING_DEFAULT_MODEL,
    scoringModel: ANTHROPIC_SCORING_DEFAULT_MODEL,
  }
  const args = argv.slice(2)
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--prompt') {
      parsed.prompt = args[++i]
    } else if (arg.startsWith('--prompt=')) {
      parsed.prompt = arg.slice('--prompt='.length)
    } else if (arg === '--skip-grounding') {
      parsed.skipGrounding = true
    } else if (arg === '--skip-writing') {
      parsed.skipWriting = true
    } else if (arg === '--skip-scoring') {
      parsed.skipScoring = true
    } else if (arg === '--dry-run') {
      parsed.dryRun = true
    } else if (arg === '--perplexity-model') {
      parsed.perplexityModel = args[++i]
    } else if (arg.startsWith('--perplexity-model=')) {
      parsed.perplexityModel = arg.slice('--perplexity-model='.length)
    } else if (arg === '--anthropic-model') {
      // back-compat: apply to both writing and scoring
      parsed.writingModel = args[++i]
      parsed.scoringModel = parsed.writingModel
    } else if (arg.startsWith('--anthropic-model=')) {
      parsed.writingModel = arg.slice('--anthropic-model='.length)
      parsed.scoringModel = parsed.writingModel
    } else if (arg === '--anthropic-writing-model') {
      parsed.writingModel = args[++i]
    } else if (arg.startsWith('--anthropic-writing-model=')) {
      parsed.writingModel = arg.slice('--anthropic-writing-model='.length)
    } else if (arg === '--anthropic-scoring-model') {
      parsed.scoringModel = args[++i]
    } else if (arg.startsWith('--anthropic-scoring-model=')) {
      parsed.scoringModel = arg.slice('--anthropic-scoring-model='.length)
    } else if (!arg.startsWith('-') && !parsed.sessionId) {
      parsed.sessionId = arg
    } else {
      console.error(`Unknown argument: ${arg}`)
      process.exit(1)
    }
  }
  return parsed
}

function usage(): never {
  console.error(`Usage: pnpm refresh <sessionId> [options]

Regenerates blurb, contenders, and related news for a single session.
Bypasses the checkpoint cache; writes directly to D1 (default: --local).

Options:
  --prompt <text>          Extra instructions appended to both grounding and writing prompts
                           (e.g. "Athlete X has been ruled out"). Treated as authoritative.
  --skip-grounding         Skip Perplexity; reuse existing relatedNews/sources for this id.
  --skip-writing           Skip Anthropic writing; only refresh grounding / relatedNews.
  --skip-scoring           Skip Anthropic scoring; leave the existing scorecard in place.
  --dry-run                Print resolved session and prompts, make no API calls.
  --perplexity-model <m>         Override grounding model (default: ${PERPLEXITY_DEFAULT_MODEL}).
  --anthropic-writing-model <m>  Writing model (default: ${ANTHROPIC_WRITING_DEFAULT_MODEL}).
  --anthropic-scoring-model <m>  Scoring model (default: ${ANTHROPIC_SCORING_DEFAULT_MODEL}).
  --anthropic-model <m>          Legacy: apply one model to both writing and scoring.

Example:
  pnpm refresh ATH04
  pnpm refresh ATH04 --prompt "Noah Lyles withdrew due to injury"
  pnpm refresh ATH04 --skip-grounding --prompt "Tighten the blurb"
`)
  process.exit(1)
}

async function main() {
  const args = parseArgs(process.argv)
  if (!args.sessionId) usage()

  const perplexityKey = process.env.PERPLEXITY_API_KEY
  const anthropicKey = process.env.ANTHROPIC_API_KEY

  if (!args.dryRun) {
    if (!args.skipGrounding && !perplexityKey) {
      console.error('Error: PERPLEXITY_API_KEY is required (or use --skip-grounding)')
      process.exit(1)
    }
    if (!args.skipWriting && !anthropicKey) {
      console.error('Error: ANTHROPIC_API_KEY is required (or use --skip-writing)')
      process.exit(1)
    }
    if (!args.skipScoring && !anthropicKey) {
      console.error('Error: ANTHROPIC_API_KEY is required (or use --skip-scoring)')
      process.exit(1)
    }
  }

  const dbTarget = parseDbTargetFromArgs(process.argv.slice(2))
  console.log(`D1 target: ${dbTarget}`)

  const session = readSessionById(args.sessionId, dbTarget)
  if (!session) {
    console.error(`Error: session "${args.sessionId}" not found in D1 (${dbTarget})`)
    process.exit(1)
  }

  const existing = readContentById(session.id, dbTarget) ?? undefined
  console.log(`Session:       ${session.id} — ${session.name}`)
  console.log(`Sport/Venue:   ${session.sport} @ ${session.venue}`)
  console.log(`Date/Time:     ${session.date}, ${session.time}`)
  if (args.prompt) console.log(`Augmentation:  ${args.prompt}`)
  if (existing?.blurb) {
    console.log(`\n--- Existing blurb ---\n${existing.blurb}\n----------------------`)
  }

  if (args.dryRun) {
    console.log('\n[dry-run] Grounding prompt:')
    console.log(buildGroundingPrompt(session, session.sport, args.prompt))
    console.log('\n[dry-run] Writing prompt:')
    console.log(buildWritingPrompt([session], session.sport, new Map(), args.prompt))
    console.log('\n[dry-run] Scoring prompt:')
    console.log(buildScoringPrompt([session], session.sport, new Map(), new Map(), args.prompt))
    return
  }

  // Stage 1: Grounding
  let grounding: GroundingData | null = null
  if (!args.skipGrounding) {
    console.log(`\n=== Stage 1: Grounding (${args.perplexityModel}) ===`)
    grounding = await fetchGrounding(
      perplexityKey!,
      session,
      session.sport,
      args.perplexityModel,
      args.prompt,
    )
    if (!grounding) {
      console.error('Grounding failed; aborting.')
      process.exit(1)
    }
    console.log(
      `  ✓ facts:${grounding.groundingFacts.length} news:${grounding.relatedNews.length} sources:${grounding.sources?.length ?? 0}`,
    )
  } else {
    console.log('\n=== Stage 1: Grounding (skipped) ===')
  }

  const anthropicClient =
    !args.skipWriting || !args.skipScoring ? new Anthropic({ apiKey: anthropicKey! }) : null

  // Stage 2: Writing
  let writing: WritingResult | null = null
  if (!args.skipWriting && anthropicClient) {
    console.log(`\n=== Stage 2: Writing (${args.writingModel}) ===`)
    const groundingMap = new Map<string, GroundingData>()
    if (grounding) groundingMap.set(session.id, grounding)
    const results = await generateWriting(
      anthropicClient,
      [session],
      session.sport,
      groundingMap,
      args.writingModel,
      args.prompt,
    )
    writing = results.find((r) => r.id === session.id) ?? null
    if (!writing) {
      console.error('Writing failed; aborting.')
      process.exit(1)
    }
    console.log(
      `  ✓ blurb:${writing.blurb.length}ch contenders:${writing.potentialContenders.length}`,
    )
  } else {
    console.log('\n=== Stage 2: Writing (skipped) ===')
  }

  // Stage 3: Scoring
  let scoring: ScoringResult | null = null
  if (!args.skipScoring && anthropicClient) {
    console.log(`\n=== Stage 3: Scoring (${args.scoringModel}) ===`)
    const groundingMap = new Map<string, GroundingData>()
    if (grounding) groundingMap.set(session.id, grounding)
    const writingMap = new Map<string, WritingData>()
    const writingForScoring: WritingData | null =
      writing ?? buildWritingFromExisting(session.id, existing)
    if (writingForScoring) writingMap.set(session.id, writingForScoring)
    if (!writingForScoring) {
      console.error('No blurb available for scoring (run without --skip-writing or seed content).')
      process.exit(1)
    }
    const results = await generateScoring(
      anthropicClient,
      [session],
      session.sport,
      groundingMap,
      writingMap,
      args.scoringModel,
      args.prompt,
    )
    scoring = results.find((r) => r.id === session.id) ?? null
    if (!scoring) {
      console.error('Scoring failed; aborting.')
      process.exit(1)
    }
    const sc = scoring.scorecard
    console.log(
      `  ✓ Sig${sc.significance.score} Exp${sc.experience.score} Star${sc.starPower.score} Uniq${sc.uniqueness.score} Dem${sc.demand.score} = ${sc.aggregate}`,
    )
  } else {
    console.log('\n=== Stage 3: Scoring (skipped) ===')
  }

  // Merge back into session-content.json
  const next: SessionContent = {
    blurb: writing?.blurb ?? existing?.blurb,
    potentialContendersIntro:
      writing?.potentialContendersIntro ?? existing?.potentialContendersIntro,
    potentialContenders: writing?.potentialContenders ?? existing?.potentialContenders,
    relatedNews: grounding?.relatedNews ?? existing?.relatedNews ?? [],
    scorecard: scoring?.scorecard ?? existing?.scorecard,
    contentMeta: {
      provider: 'hybrid',
      groundingModel: grounding ? args.perplexityModel : existing?.contentMeta?.groundingModel,
      writingModel: writing ? args.writingModel : existing?.contentMeta?.writingModel,
      scoringModel: scoring ? args.scoringModel : existing?.contentMeta?.scoringModel,
      generatedAt: new Date().toISOString(),
      sources: grounding?.sources ?? existing?.contentMeta?.sources,
      promptAugmentation: args.prompt,
    },
  }

  executeSql(
    [buildSessionContentUpsertSql(session.id, next)],
    dbTarget,
    `refresh-content-${session.id}`,
  )
  console.log(`\nWrote ${session.id} content to D1`)

  if (scoring) {
    const sc = scoring.scorecard
    const updatedSession = {
      ...session,
      rSig: sc.significance.score,
      rExp: sc.experience.score,
      rStar: sc.starPower.score,
      rUniq: sc.uniqueness.score,
      rDem: sc.demand.score,
      agg: sc.aggregate,
    }
    executeSql([buildSessionUpsertSql(updatedSession)], dbTarget, `refresh-session-${session.id}`)
    console.log(`Updated r* fields for ${session.id} in D1`)
  }

  if (writing) {
    console.log(`\n--- New blurb ---\n${writing.blurb}\n-----------------`)
  }
}

function buildWritingFromExisting(
  id: string,
  existing: SessionContent | undefined,
): WritingData | null {
  if (!existing?.blurb) return null
  return {
    id,
    blurb: existing.blurb,
    potentialContendersIntro: existing.potentialContendersIntro ?? '',
    potentialContenders: existing.potentialContenders ?? [],
  }
}

type WritingResult = Awaited<ReturnType<typeof generateWriting>>[number]
type ScoringResult = Awaited<ReturnType<typeof generateScoring>>[number]

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
