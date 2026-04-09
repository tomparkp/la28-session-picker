import Anthropic from '@anthropic-ai/sdk'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import type { Contender, Session } from '../src/types/session.js'
import type { SportKnowledge } from '../src/data/sport-knowledge.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

const SPORT_KNOWLEDGE: Record<string, SportKnowledge> = JSON.parse(
  readFileSync(resolve(ROOT, 'src/data/sport-knowledge.json'), 'utf8'),
)
const DATA_PATH = resolve(ROOT, 'src/data/sessions.json')

const BATCH_SIZE = 15
const MODEL = 'claude-sonnet-4-20250514'
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 5000

interface GeneratedContent {
  id: string
  blurb: string
  contenders: Contender[]
}

const SYSTEM_PROMPT = `You are a sports journalist writing for a premium LA 2028 Olympics guide. Your tone is:
- Specific and informed — name athletes, cite venue history, reference Olympic milestones
- Opinionated — "This is THE Olympic moment" not "This session has high significance"
- Conversational — reads like a knowledgeable friend, not a press release
- Concise — 2-4 punchy sentences per blurb, no filler

You will receive a batch of Olympic sessions grouped by sport, along with background knowledge about the sport, venue, and athletes.

For each session, produce:
1. A "blurb" — a personality-driven paragraph (2-4 sentences) explaining why someone should care about this specific session. Vary the tone based on the round type:
   - Finals/medal sessions: dramatic, stakes-driven, specific to what gold medals are on the line
   - Semifinals/QFs: tension and "who will advance" framing
   - Prelims: "this is where you see X sport up close for cheap" or "the sleeper pick" framing — make early rounds sound appealing in their own way
   - Ceremonies: grand, emotional, once-in-a-lifetime framing

2. "contenders" — an array of 2-5 athletes/teams likely to appear in THIS specific session, with a one-line note. For prelim rounds, pick a mix of favorites and dark horses. For finals, focus on medal favorites. If the session doesn't lend itself to specific contenders (e.g., ceremonies), return an empty array.

CRITICAL RULES:
- Never use generic phrases like "high significance rating" or "the AI score leans positive"
- Never reference ratings, scores, or algorithmic analysis
- Every blurb must mention something SPECIFIC — an athlete name, a venue fact, or a historical reference
- Vary your sentence structures across sessions — don't start every blurb the same way
- For preliminary rounds, don't be dismissive — find the angle that makes each session interesting
- Contender "note" should be a single punchy sentence, not a bio

Return valid JSON: an array of objects with "id", "blurb", and "contenders" fields.`

function buildBatchPrompt(sessions: Session[], sport: string): string {
  const knowledge = SPORT_KNOWLEDGE[sport]

  let prompt = `## Sport: ${sport}\n\n`

  if (knowledge) {
    prompt += `### Background\n${knowledge.la28Context}\n\n`

    const venueEntries = Object.entries(knowledge.venueNotes)
    if (venueEntries.length > 0) {
      prompt += `### Venues\n`
      for (const [venue, note] of venueEntries) {
        prompt += `- **${venue}**: ${note}\n`
      }
      prompt += '\n'
    }

    const eventEntries = Object.entries(knowledge.eventHighlights)
    if (eventEntries.length > 0) {
      prompt += `### Notable Events\n`
      for (const [event, note] of eventEntries) {
        prompt += `- **${event}**: ${note}\n`
      }
      prompt += '\n'
    }

    if (knowledge.contenders.length > 0) {
      prompt += `### Key Athletes/Teams to Reference\n`
      for (const c of knowledge.contenders) {
        prompt += `- **${c.name}** (${c.country}): ${c.note}\n`
      }
      prompt += '\n'
    }
  }

  prompt += `### Sessions to Write (${sessions.length} total)\n\n`

  for (const s of sessions) {
    prompt += `- **ID**: ${s.id}\n`
    prompt += `  - **Name**: ${s.name}\n`
    prompt += `  - **Description**: ${s.desc}\n`
    prompt += `  - **Round**: ${s.rt}\n`
    prompt += `  - **Venue**: ${s.venue}\n`
    prompt += `  - **Date/Time**: ${s.date}, ${s.time}\n`
    prompt += `  - **Price Range**: $${s.pLo}–$${s.pHi}\n\n`
  }

  prompt += `Return a JSON array of ${sessions.length} objects, one for each session ID above. Format:\n`
  prompt += '```json\n[\n  {\n    "id": "...",\n    "blurb": "...",\n    "contenders": [{"name": "...", "country": "...", "note": "..."}]\n  }\n]\n```'

  return prompt
}

async function generateBatch(
  client: Anthropic,
  sessions: Session[],
  sport: string,
): Promise<GeneratedContent[]> {
  const prompt = buildBatchPrompt(sessions, sport)

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 8192,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: prompt }],
      })

      const text =
        response.content[0].type === 'text' ? response.content[0].text : ''

      const jsonMatch = text.match(/\[[\s\S]*\]/)
      if (!jsonMatch) {
        throw new Error('No JSON array found in response')
      }

      const parsed = JSON.parse(jsonMatch[0]) as GeneratedContent[]

      for (const item of parsed) {
        if (!item.id || !item.blurb) {
          throw new Error(`Invalid item: missing id or blurb in ${JSON.stringify(item).slice(0, 100)}`)
        }
      }

      return parsed
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`  Attempt ${attempt}/${MAX_RETRIES} failed: ${msg}`)
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * attempt))
      }
    }
  }

  console.error(`  FAILED after ${MAX_RETRIES} attempts for ${sport} batch. Skipping.`)
  return []
}

function groupBySport(sessions: Session[]): Map<string, Session[]> {
  const groups = new Map<string, Session[]>()
  for (const s of sessions) {
    const list = groups.get(s.sport)
    if (list) list.push(s)
    else groups.set(s.sport, [s])
  }
  return groups
}

function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size))
  }
  return chunks
}

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    console.error('Error: ANTHROPIC_API_KEY environment variable is required')
    process.exit(1)
  }

  const forceAll = process.argv.includes('--force')
  const dryRun = process.argv.includes('--dry-run')
  const sportFilter = process.argv.find((a) => a.startsWith('--sport='))?.split('=')[1]

  const client = new Anthropic({ apiKey })

  console.log(`Reading ${DATA_PATH}`)
  const sessions = JSON.parse(readFileSync(DATA_PATH, 'utf8')) as Session[]
  console.log(`Loaded ${sessions.length} sessions`)

  const sessionMap = new Map(sessions.map((s) => [s.id, s]))
  const needsContent = sessions.filter((s) => {
    if (sportFilter && s.sport !== sportFilter) return false
    if (forceAll) return true
    return !s.blurb
  })

  console.log(`${needsContent.length} sessions need content generation`)
  if (needsContent.length === 0) {
    console.log('Nothing to do.')
    return
  }

  const sportGroups = groupBySport(needsContent)
  const sports = [...sportGroups.keys()].sort()
  let totalGenerated = 0
  let totalFailed = 0

  for (const sport of sports) {
    const sportSessions = sportGroups.get(sport)!
    const batches = chunk(sportSessions, BATCH_SIZE)
    console.log(`\n${sport}: ${sportSessions.length} sessions in ${batches.length} batch(es)`)

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i]
      console.log(`  Batch ${i + 1}/${batches.length} (${batch.length} sessions)...`)

      if (dryRun) {
        console.log(`  [dry-run] Would generate content for: ${batch.map((s) => s.id).join(', ')}`)
        continue
      }

      const results = await generateBatch(client, batch, sport)

      for (const result of results) {
        const session = sessionMap.get(result.id)
        if (session) {
          session.blurb = result.blurb
          session.contenders = result.contenders
          totalGenerated++
        } else {
          console.warn(`  Warning: generated content for unknown session ${result.id}`)
        }
      }

      const missing = batch.filter((s) => !results.find((r) => r.id === s.id))
      if (missing.length > 0) {
        console.warn(`  Warning: missing results for ${missing.map((s) => s.id).join(', ')}`)
        totalFailed += missing.length
      }

      if (i < batches.length - 1) {
        await new Promise((r) => setTimeout(r, 1000))
      }
    }
  }

  if (!dryRun) {
    const output = JSON.stringify(sessions, null, 2)
    writeFileSync(DATA_PATH, output)
    console.log(`\nWrote ${sessions.length} sessions to ${DATA_PATH}`)
  }

  console.log(`\nDone: ${totalGenerated} generated, ${totalFailed} failed`)
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
