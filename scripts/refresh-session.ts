import 'dotenv/config'
import { readFileSync, writeFileSync } from 'node:fs'

import Anthropic from '@anthropic-ai/sdk'

import type { Session, SessionContent } from '../src/types/session.js'
import {
  ANTHROPIC_DEFAULT_MODEL,
  CONTENT_PATH,
  type GroundingData,
  PERPLEXITY_DEFAULT_MODEL,
  SESSIONS_PATH,
  buildGroundingPrompt,
  buildWritingPrompt,
  fetchGrounding,
  generateWriting,
} from './lib/session-content.js'

interface ParsedArgs {
  sessionId?: string
  prompt?: string
  skipGrounding: boolean
  skipWriting: boolean
  dryRun: boolean
  perplexityModel: string
  anthropicModel: string
}

function parseArgs(argv: string[]): ParsedArgs {
  const parsed: ParsedArgs = {
    skipGrounding: false,
    skipWriting: false,
    dryRun: false,
    perplexityModel: PERPLEXITY_DEFAULT_MODEL,
    anthropicModel: ANTHROPIC_DEFAULT_MODEL,
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
    } else if (arg === '--dry-run') {
      parsed.dryRun = true
    } else if (arg === '--perplexity-model') {
      parsed.perplexityModel = args[++i]
    } else if (arg.startsWith('--perplexity-model=')) {
      parsed.perplexityModel = arg.slice('--perplexity-model='.length)
    } else if (arg === '--anthropic-model') {
      parsed.anthropicModel = args[++i]
    } else if (arg.startsWith('--anthropic-model=')) {
      parsed.anthropicModel = arg.slice('--anthropic-model='.length)
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
Bypasses the checkpoint cache; writes directly to session-content.json.

Options:
  --prompt <text>          Extra instructions appended to both grounding and writing prompts
                           (e.g. "Athlete X has been ruled out"). Treated as authoritative.
  --skip-grounding         Skip Perplexity; reuse existing relatedNews/sources for this id.
  --skip-writing           Skip Anthropic; only refresh grounding / relatedNews.
  --dry-run                Print resolved session and prompts, make no API calls.
  --perplexity-model <m>   Override grounding model (default: ${PERPLEXITY_DEFAULT_MODEL}).
  --anthropic-model <m>    Override writing model (default: ${ANTHROPIC_DEFAULT_MODEL}).

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
  }

  const rawSessions = JSON.parse(readFileSync(SESSIONS_PATH, 'utf8')) as Session[]
  const sessionContent = JSON.parse(readFileSync(CONTENT_PATH, 'utf8')) as Record<
    string,
    SessionContent
  >

  const session = rawSessions.find((s) => s.id === args.sessionId)
  if (!session) {
    console.error(`Error: session "${args.sessionId}" not found in ${SESSIONS_PATH}`)
    process.exit(1)
  }

  const existing = sessionContent[session.id]
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

  // Stage 2: Writing
  let writing: WritingResult | null = null
  if (!args.skipWriting) {
    console.log(`\n=== Stage 2: Writing (${args.anthropicModel}) ===`)
    const anthropicClient = new Anthropic({ apiKey: anthropicKey! })
    const groundingMap = new Map<string, GroundingData>()
    if (grounding) groundingMap.set(session.id, grounding)
    const results = await generateWriting(
      anthropicClient,
      [session],
      session.sport,
      groundingMap,
      args.anthropicModel,
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

  // Merge back
  const next: SessionContent = {
    blurb: writing?.blurb ?? existing?.blurb,
    potentialContendersIntro:
      writing?.potentialContendersIntro ?? existing?.potentialContendersIntro,
    potentialContenders: writing?.potentialContenders ?? existing?.potentialContenders,
    relatedNews: grounding?.relatedNews ?? existing?.relatedNews ?? [],
    contentMeta: {
      provider: 'hybrid',
      groundingModel: grounding ? args.perplexityModel : existing?.contentMeta?.groundingModel,
      writingModel: writing ? args.anthropicModel : existing?.contentMeta?.writingModel,
      generatedAt: new Date().toISOString(),
      sources: grounding?.sources ?? existing?.contentMeta?.sources,
      promptAugmentation: args.prompt,
    },
  }

  const nextSessionContent = { ...sessionContent, [session.id]: next }
  const output = JSON.stringify(nextSessionContent, null, 2)
  writeFileSync(CONTENT_PATH, `${output}\n`)
  console.log(`\nWrote ${session.id} to ${CONTENT_PATH}`)

  if (writing) {
    console.log(`\n--- New blurb ---\n${writing.blurb}\n-----------------`)
  }
}

type WritingResult = Awaited<ReturnType<typeof generateWriting>>[number]

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
