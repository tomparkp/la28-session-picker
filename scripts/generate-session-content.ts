import 'dotenv/config'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import Anthropic from '@anthropic-ai/sdk'

import type { SportKnowledge } from '../src/data/sport-knowledge.js'
import type { Contender, ContentProvider, ContentSource, Session } from '../src/types/session.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

const rawKnowledge = JSON.parse(
  readFileSync(resolve(ROOT, 'src/data/sport-knowledge.json'), 'utf8'),
)
const { _meta: _, ...sportEntries } = rawKnowledge
const SPORT_KNOWLEDGE = sportEntries as Record<string, SportKnowledge>
const DATA_PATH = resolve(ROOT, 'src/data/sessions.json')

const BATCH_SIZE = 15
const ANTHROPIC_DEFAULT_MODEL = 'claude-sonnet-4-20250514'
const PERPLEXITY_DEFAULT_MODEL = 'sonar-pro'
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 5000

type Provider = ContentProvider

interface GeneratedContent {
  id: string
  blurb: string
  potentialContendersIntro?: string
  potentialContenders: Contender[]
  contentMeta?: {
    provider: Provider
    model: string
    generatedAt: string
    sources?: ContentSource[]
  }
}

interface PerplexitySearchResult {
  title?: string
  url?: string
  date?: string
  last_updated?: string
  snippet?: string
  source?: string
}

interface PerplexityResponse {
  choices?: {
    message?: {
      content?: string
    }
  }[]
  search_results?: PerplexitySearchResult[] | null
}

const PERPLEXITY_RESPONSE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'blurb', 'potentialContendersIntro', 'potentialContenders'],
  properties: {
    id: { type: 'string' },
    blurb: { type: 'string' },
    potentialContendersIntro: { type: 'string' },
    potentialContenders: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'country', 'note'],
        properties: {
          name: { type: 'string' },
          country: { type: 'string' },
          note: { type: 'string' },
        },
      },
    },
  },
}

const SYSTEM_PROMPT = `You are a sports journalist writing for an informational LA 2028 Olympics session guide. Your tone is:
- Factual and informative — lead with what the session contains, which events or rounds, and what's at stake
- Specific — reference event formats, venue details, and relevant Olympic history where accurate
- Balanced — describe the event and likely fields without over-promising outcomes; use "projected" or "likely contender" when uncertain
- Concise — 2-4 clear sentences per blurb, no filler or excessive superlatives

IMPORTANT CONTEXT: The LA 2028 Games are still over two years away. Official rosters have NOT been announced for any country. Athletes listed as potential contenders are projections based on recent results (primarily Paris 2024). Always frame potential contenders as "projected" or "likely" rather than confirmed participants. If an athlete has not confirmed whether they will compete in LA28, say so plainly in the athlete-focused fields; for example, "Simone Biles has not confirmed whether she will compete in LA28."

You will receive a batch of Olympic sessions grouped by sport, along with background knowledge about the sport, venue, and athletes.

For each session, produce:
1. A "blurb" — an informative paragraph (2-4 sentences) explaining what this session covers, how the event works, what's at stake, and what the live experience may feel like. Focus on the nature of the competition itself: e.g. "The 100m dash is a marquee event to crown the fastest man alive." Vary the framing based on the round type:
   - Finals/medal sessions: explain which medals are decided, why the event matters, and the competitive format
   - Semifinals/QFs: note the elimination stakes, bracket/qualification pressure, and how the session narrows the field
   - Prelims: describe the format, note that it's an opportunity to see the sport at an accessible price point, and highlight the breadth of competition
   - Ceremonies: describe the event (opening/closing) and what attendees can expect

2. A "potentialContendersIntro" — 1-2 athlete/country-focused sentences to display above the contenders list. Discuss the projected athlete/team/country field, but be explicit that LA28 participation is not confirmed. If there are no useful contenders for this session, return an empty string.

3. "potentialContenders" — an array of 2-5 athletes/teams projected to appear in THIS specific session, with a one-line factual note (e.g., their Paris result, world ranking, or key achievement). For prelim rounds, pick a mix of established names and emerging competitors. For finals, focus on likely medal contenders. If the session doesn't lend itself to specific potential contenders (e.g., ceremonies), return an empty array.

CRITICAL RULES:
- Never use generic phrases like "high significance rating" or "the AI score leans positive"
- Never reference ratings, scores, or algorithmic analysis
- Do not mention current or prospective athlete names or countries in the blurb. Keep athlete/country discussion in "potentialContendersIntro" and "potentialContenders".
- Historical athlete references are allowed in the blurb only when they explain the event's history or nature, not future LA28 participation.
- Every blurb must mention something SPECIFIC — event format, a venue fact, a round/stakes detail, or a competition detail
- Vary your sentence structures across sessions — don't start every blurb the same way
- For preliminary rounds, don't be dismissive — find a genuine angle (format, price, emerging athletes)
- "potentialContendersIntro" must use projected/likely language and must not imply confirmed rosters
- Potential contender "note" should be a single factual sentence — focus on their most relevant recent achievement, not hype
- Do NOT overuse superlatives (e.g., "the greatest," "the most iconic," "pure drama"). State facts and let readers draw their own conclusions
- Do NOT speculate about athletes competing if there's known doubt about their participation (injury, retirement, age)

Return valid JSON matching the requested response shape with "id", "blurb", "potentialContendersIntro", and "potentialContenders" fields.`

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

    if (knowledge.potentialContenders.length > 0) {
      prompt += `### Key Athletes/Teams to Reference\n`
      for (const c of knowledge.potentialContenders) {
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
  prompt +=
    '```json\n[\n  {\n    "id": "...",\n    "blurb": "...",\n    "potentialContendersIntro": "...",\n    "potentialContenders": [{"name": "...", "country": "...", "note": "..."}]\n  }\n]\n```'

  return prompt
}

function buildPerplexityPrompt(session: Session, sport: string): string {
  const basePrompt = buildBatchPrompt([session], sport)

  return `${basePrompt}

Use current web search results to verify facts that may have changed, especially LA28 venues, session schedules, qualification status, injuries, retirements, and current athlete form. Prefer official LA28, IOC/Olympics.com, international federation, team, and reputable sports-news sources. If current sources conflict with the background context above, prioritize the current cited source.

Return a single JSON object, not an array. Do not include markdown fences.`
}

function getArgValue(name: string): string | undefined {
  const prefix = `${name}=`
  const arg = process.argv.find((a) => a.startsWith(prefix))
  return arg ? arg.slice(prefix.length) : undefined
}

function parseProvider(value: string | undefined): Provider {
  if (!value) return 'anthropic'
  if (value === 'anthropic' || value === 'perplexity') return value
  throw new Error(`Invalid --provider=${value}. Expected "anthropic" or "perplexity".`)
}

function validateGeneratedContent(item: GeneratedContent): GeneratedContent {
  if (!item.id || !item.blurb) {
    throw new Error(`Invalid item: missing id or blurb in ${JSON.stringify(item).slice(0, 100)}`)
  }
  if (typeof item.potentialContendersIntro !== 'string') {
    throw new Error(`Invalid item: potentialContendersIntro must be a string for ${item.id}`)
  }
  if (!Array.isArray(item.potentialContenders)) {
    throw new Error(`Invalid item: potentialContenders must be an array for ${item.id}`)
  }
  return item
}

function normalizePerplexitySources(
  results: PerplexitySearchResult[] | null | undefined,
): ContentSource[] {
  if (!results) return []

  const seen = new Set<string>()
  const sources: ContentSource[] = []

  for (const result of results) {
    if (!result.url || seen.has(result.url)) continue
    seen.add(result.url)
    sources.push({
      title: result.title?.trim() || result.url,
      url: result.url,
      date: result.date,
      lastUpdated: result.last_updated,
      snippet: result.snippet,
      source: result.source,
    })
  }

  return sources
}

async function generateAnthropicBatch(
  client: Anthropic,
  sessions: Session[],
  sport: string,
  model: string,
): Promise<GeneratedContent[]> {
  const prompt = buildBatchPrompt(sessions, sport)

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await client.messages.create({
        model,
        max_tokens: 8192,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: prompt }],
      })

      const text = response.content[0].type === 'text' ? response.content[0].text : ''

      const jsonMatch = text.match(/\[[\s\S]*\]/)
      if (!jsonMatch) {
        throw new Error('No JSON array found in response')
      }

      const parsed = JSON.parse(jsonMatch[0]) as GeneratedContent[]

      for (const item of parsed) {
        validateGeneratedContent(item)
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

async function generatePerplexitySession(
  apiKey: string,
  session: Session,
  sport: string,
  model: string,
): Promise<GeneratedContent[]> {
  const prompt = buildPerplexityPrompt(session, sport)

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch('https://api.perplexity.ai/v1/sonar', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: prompt },
          ],
          max_tokens: 2048,
          temperature: 0.2,
          response_format: {
            type: 'json_schema',
            json_schema: {
              schema: PERPLEXITY_RESPONSE_SCHEMA,
            },
          },
          web_search_options: {
            search_mode: 'web',
          },
        }),
      })

      if (!response.ok) {
        const text = await response.text()
        throw new Error(`Perplexity API ${response.status}: ${text.slice(0, 500)}`)
      }

      const body = (await response.json()) as PerplexityResponse
      const text = body.choices?.[0]?.message?.content
      if (!text) {
        throw new Error('No Perplexity message content returned')
      }

      const item = validateGeneratedContent(JSON.parse(text) as GeneratedContent)
      const sources = normalizePerplexitySources(body.search_results)

      item.contentMeta = {
        provider: 'perplexity',
        model,
        generatedAt: new Date().toISOString(),
        ...(sources.length > 0 ? { sources } : {}),
      }

      return [item]
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`  Attempt ${attempt}/${MAX_RETRIES} failed for ${session.id}: ${msg}`)
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * attempt))
      }
    }
  }

  console.error(`  FAILED after ${MAX_RETRIES} attempts for ${session.id}. Skipping.`)
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
  const provider = parseProvider(getArgValue('--provider'))
  const model =
    getArgValue('--model') ??
    (provider === 'anthropic' ? ANTHROPIC_DEFAULT_MODEL : PERPLEXITY_DEFAULT_MODEL)
  const forceAll = process.argv.includes('--force')
  const dryRun = process.argv.includes('--dry-run')
  const sportFilter = getArgValue('--sport')
  const apiKey =
    provider === 'anthropic' ? process.env.ANTHROPIC_API_KEY : process.env.PERPLEXITY_API_KEY

  if (!apiKey && !dryRun) {
    const envName = provider === 'anthropic' ? 'ANTHROPIC_API_KEY' : 'PERPLEXITY_API_KEY'
    console.error(`Error: ${envName} environment variable is required for provider "${provider}"`)
    process.exit(1)
  }

  const anthropicClient = provider === 'anthropic' && apiKey ? new Anthropic({ apiKey }) : null

  console.log(`Reading ${DATA_PATH}`)
  console.log(`Provider: ${provider} (${model})`)
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
    const batches =
      provider === 'anthropic' ? chunk(sportSessions, BATCH_SIZE) : sportSessions.map((s) => [s])
    console.log(`\n${sport}: ${sportSessions.length} sessions in ${batches.length} batch(es)`)

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i]
      console.log(`  Batch ${i + 1}/${batches.length} (${batch.length} sessions)...`)

      if (dryRun) {
        console.log(`  [dry-run] Would generate content for: ${batch.map((s) => s.id).join(', ')}`)
        continue
      }

      const results =
        provider === 'anthropic'
          ? await generateAnthropicBatch(anthropicClient!, batch, sport, model)
          : await generatePerplexitySession(apiKey!, batch[0]!, sport, model)

      for (const result of results) {
        const session = sessionMap.get(result.id)
        if (session) {
          session.blurb = result.blurb
          session.potentialContendersIntro = result.potentialContendersIntro
          session.potentialContenders = result.potentialContenders
          session.contentMeta = result.contentMeta ?? {
            provider,
            model,
            generatedAt: new Date().toISOString(),
          }
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
