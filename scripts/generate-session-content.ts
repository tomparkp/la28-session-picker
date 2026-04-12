import 'dotenv/config'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import Anthropic from '@anthropic-ai/sdk'
import pLimit from 'p-limit'

import type { SportKnowledge } from '../src/data/sport-knowledge.js'
import type {
  Contender,
  ContentSource,
  RelatedNews,
  Session,
  SessionContent,
} from '../src/types/session.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

const rawKnowledge = JSON.parse(
  readFileSync(resolve(ROOT, 'src/data/sport-knowledge.json'), 'utf8'),
)
const { _meta: _, ...sportEntries } = rawKnowledge
const SPORT_KNOWLEDGE = sportEntries as Record<string, SportKnowledge>
const SESSIONS_PATH = resolve(ROOT, 'src/data/sessions.json')
const CONTENT_PATH = resolve(ROOT, 'src/data/session-content.json')

const PERPLEXITY_DEFAULT_MODEL = 'sonar-pro'
const ANTHROPIC_DEFAULT_MODEL = 'claude-sonnet-4-5-20250929'
const GROUNDING_VERSION = 1
const WRITING_VERSION = 2
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 5000
const MAX_NEWS_ITEMS = 10
const WRITING_BATCH_SIZE = 15
// Conservative concurrency defaults. Perplexity sonar-pro is typically 50 req/min;
// 5 in flight averaging ~12s/call ≈ 25 req/min, well under the limit.
// Anthropic tier-1 output TPM (8k/min on sonnet-4.5) is the binding constraint;
// 2 concurrent writing batches (~2.5k output each) stays safely under the cap.
const DEFAULT_GROUNDING_CONCURRENCY = 5
const DEFAULT_WRITING_CONCURRENCY = 2

interface GroundingData {
  id: string
  groundingFacts: string[]
  relatedNews: RelatedNews[]
  sources?: ContentSource[]
}

interface WritingData {
  id: string
  blurb: string
  potentialContendersIntro: string
  potentialContenders: Contender[]
}

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

interface PerplexitySearchResult {
  title?: string
  url?: string
  date?: string
  last_updated?: string
  snippet?: string
  source?: string
}

interface PerplexityResponse {
  choices?: { message?: { content?: string } }[]
  search_results?: PerplexitySearchResult[] | null
}

const PERPLEXITY_GROUNDING_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'groundingFacts', 'relatedNews'],
  properties: {
    id: { type: 'string' },
    groundingFacts: {
      type: 'array',
      items: { type: 'string' },
    },
    relatedNews: {
      type: 'array',
      maxItems: MAX_NEWS_ITEMS,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'summary', 'sourceName', 'sourceUrl', 'publishedDate', 'tags'],
        properties: {
          title: { type: 'string' },
          summary: { type: 'string' },
          sourceName: { type: 'string' },
          sourceUrl: { type: 'string' },
          publishedDate: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  },
}

const GROUNDING_SYSTEM_PROMPT = `You gather current, cited facts for LA 2028 Olympics session entries. You do NOT write prose for readers — another stage handles that. Your job is to produce a structured grounding brief and a short list of relevant recent news.

For each session you will return:

1. groundingFacts — 5-15 short factual bullets that a writer will use. Each bullet is one sentence, plain text, factual, and sourced from your web searches. Cover:
   - Likely contenders (athletes for individual sports, teams for team sports) with recent results, world rankings, or Paris 2024 finish.
   - Known LA28-specific info: qualification status, roster announcements, venue updates, schedule changes.
   - Athlete status: retirements, injuries, pregnancies, public statements about LA28, comebacks.
   - Recent performance: major 2024-2026 results relevant to this session's event.
   - Any notable storyline (rivalry, record pursuit, comeback) that a writer could lean on.
   Each bullet must be standalone and fact-shaped — no opinion, no superlatives, no prose flourish. If uncertain, hedge plainly ("Ohtani has not publicly confirmed whether he will play in LA28 as of Oct 2025.").

2. relatedNews — 0 to ${MAX_NEWS_ITEMS} recent news articles directly relevant to this session. Pull only from your search results. Include title, one-sentence summary of why it matters, sourceName, canonical sourceUrl, ISO publishedDate (YYYY-MM-DD), and 1-4 kebab-case tags. Prioritize LA28-specific news, then recent form of probable contenders. Skip generic sport news. Empty array is fine if nothing fits.

Rules:
- Do not fabricate URLs, titles, dates, or outlets. If you don't have a source, don't include the fact.
- Do not write marketing prose — facts only.
- Do not speculate as fact. Speculation must be labeled ("projected to contend," "expected based on 2025 form").
- Return valid JSON matching the schema. No markdown, no code fences.`

const WRITING_SYSTEM_PROMPT = `You are writing session blurbs for an LA 2028 Olympics ticket-buying guide. Readers are deciding whether to attend; give them a flavorful picture of what the session actually is and why it could be worth watching.

You will receive a batch of sessions for one sport. For each session you'll get:
- The session's basic facts (name, description, round, venue, date/time, price).
- Sport-level background (venue notes, event highlights, known athletes).
- A "groundingFacts" list gathered from recent web searches — use these as your authoritative source for current information (rosters, injuries, recent results, LA28 status).

Ground truth: the Games are still ahead. Venues, event formats, Olympic history, and prior results (Paris 2024, World Championships, etc.) are confirmed facts. LA28 rosters, participation, and medal outcomes are not. Your writing should be clear about which is which — state confirmed things plainly; flag speculation as speculation with words like "projected," "likely," "expected," or "if [athlete] competes."

Produce three fields per session:

1. blurb — two to four short paragraphs separated by blank lines (two newlines between each). Each paragraph is 1-2 sentences, max ~35 words. Keep paragraphs tight and scannable — readers are skimming, not reading a magazine feature. Total length: 3-6 short sentences across all paragraphs.

   Structure guideline (vary the exact framing — don't follow this template rigidly):
   - Opening paragraph: what the session is and why it matters. Lead with a hook.
   - Middle paragraph(s): concrete specifics — event format, stakes, storylines, athlete/team angles (qualified honestly), or notable current context.
   - Closing paragraph: venue/live-experience feel — what it's like to be there.

   Lean into concrete specifics: venue geography, sightlines, crowd atmosphere, sport-specific rituals, historical context, marquee storylines. You may mention athletes, teams, or countries when it makes the writing better — qualify participation honestly. Vary the opening across sessions in a batch. Match the round type — finals carry medal stakes, prelims are an accessible entry point, ceremonies are their own thing.

2. potentialContendersIntro — 1-2 sentences introducing the projected field. Mix confirmed facts (who won Paris, who's the reigning world champion) with speculation about LA28 (clearly flagged). Empty string if the session has no meaningful contender context.

3. potentialContenders — 2-5 athletes or teams likely to appear in THIS session. The "note" for each can be factual (a Paris 2024 result, a world ranking, a career achievement) or speculative (a projection, a storyline worth watching) — make it obvious which it is.
   - Speculation is welcome — just label it. If you don't know for certain who will be in a session, make informed guesses based on recent form and world rankings, phrased with hedging words like "could appear," "projected to compete," "likely contender," "if they qualify." What you must NOT do is state speculation as fact.
   - Only return an empty array for ceremonies or sessions so generic (mass prelim of 80+ unknown qualifiers) that names would be meaningless. For any session with a final, semifinal, or marquee event, list contenders.
   - For multi-event sessions, focus contenders on the 1-2 highest-profile events. Note in the intro which event they're for.
   - Don't mix teams and individual athletes within a session's list — pick one granularity.
   - Team sports: teams for prelims/early rounds. Marquee sessions (finals, semis, rivalry matchups): specific athletes with country indicating their team.
   - Individual sports: specific athletes throughout.

Rules:
- Plain text only. Do not use **bold**, *italics*, markdown syntax, headings, lists, or HTML in any field. The UI renders these as literal characters.
- The blurb must contain at least one literal "\\n\\n" break (so 2+ paragraphs, up to 4). Do not collapse into a single dense paragraph. If any paragraph exceeds 2 sentences or ~35 words, split it.
- Prefer the groundingFacts over your training data when they conflict — they're current.
- Don't overuse superlatives. Don't claim something IS "the single greatest," "the most iconic," "the best ever." If you want that register, hedge: "could become one of the greatest games ever played."
- Don't state LA28 participation as confirmed when it isn't. If an athlete has publicly cast doubt (injury, retirement, age), acknowledge it.
- Don't refuse out of caution. Speculation is allowed as long as clearly flagged.
- Vary sentence structure and angles across the batch — don't start every blurb the same way.

Return a JSON array of objects, one per session id, each with "id", "blurb", "potentialContendersIntro", and "potentialContenders". No markdown fences around the JSON.`

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

function writeJson(path: string, data: unknown) {
  mkdirSync(dirname(path), { recursive: true })
  const tempPath = `${path}.tmp`
  writeFileSync(tempPath, `${JSON.stringify(data, null, 2)}\n`)
  renameSync(tempPath, path)
}

function normalizeRelatedNews(items: unknown, sessionId: string): RelatedNews[] {
  if (!Array.isArray(items)) return []
  const seen = new Set<string>()
  const out: RelatedNews[] = []
  let index = 0
  for (const raw of items) {
    if (!raw || typeof raw !== 'object') continue
    const item = raw as Record<string, unknown>
    const title = typeof item.title === 'string' ? item.title.trim() : ''
    const summary = typeof item.summary === 'string' ? item.summary.trim() : ''
    const sourceName = typeof item.sourceName === 'string' ? item.sourceName.trim() : ''
    const sourceUrl = typeof item.sourceUrl === 'string' ? item.sourceUrl.trim() : ''
    const publishedDate = typeof item.publishedDate === 'string' ? item.publishedDate.trim() : ''
    const tags = Array.isArray(item.tags)
      ? item.tags.filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
      : []

    if (!title || !sourceUrl || !publishedDate) continue
    let parsedUrl: URL
    try {
      parsedUrl = new URL(sourceUrl)
    } catch {
      continue
    }
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') continue

    const key = sourceUrl.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)

    out.push({
      id: `${sessionId}-n${index}`,
      title,
      summary,
      sourceName: sourceName || parsedUrl.hostname,
      sourceUrl,
      publishedDate,
      tags,
    })
    index += 1
    if (out.length >= MAX_NEWS_ITEMS) break
  }
  return out
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

function buildSportContext(sport: string): string {
  const knowledge = SPORT_KNOWLEDGE[sport]
  let out = `## Sport: ${sport}\n\n`
  if (!knowledge) return out
  out += `### Background\n${knowledge.la28Context}\n\n`
  const venueEntries = Object.entries(knowledge.venueNotes)
  if (venueEntries.length > 0) {
    out += `### Venues\n`
    for (const [venue, note] of venueEntries) out += `- ${venue}: ${note}\n`
    out += '\n'
  }
  const eventEntries = Object.entries(knowledge.eventHighlights)
  if (eventEntries.length > 0) {
    out += `### Notable Events\n`
    for (const [event, note] of eventEntries) out += `- ${event}: ${note}\n`
    out += '\n'
  }
  if (knowledge.potentialContenders.length > 0) {
    out += `### Known Athletes/Teams\n`
    for (const c of knowledge.potentialContenders) out += `- ${c.name} (${c.country}): ${c.note}\n`
    out += '\n'
  }
  return out
}

function buildGroundingPrompt(session: Session, sport: string): string {
  let prompt = buildSportContext(sport)
  prompt += `### Session to Ground\n`
  prompt += `- ID: ${session.id}\n`
  prompt += `- Name: ${session.name}\n`
  prompt += `- Description: ${session.desc}\n`
  prompt += `- Round: ${session.rt}\n`
  prompt += `- Venue: ${session.venue}\n`
  prompt += `- Date/Time: ${session.date}, ${session.time}\n\n`
  prompt += `Use current web search to find facts relevant to THIS session's event, round, venue, and likely contenders. Prioritize LA28-specific news, then 2024-2026 performance and status updates for probable contenders. Prefer official LA28, IOC/Olympics.com, international federation, team, and reputable sports-news sources.\n\n`
  prompt += `Return a single JSON object matching the required schema. Do not include markdown fences.`
  return prompt
}

function buildWritingPrompt(
  sessions: Session[],
  sport: string,
  grounding: Map<string, GroundingData>,
): string {
  let prompt = buildSportContext(sport)
  prompt += `### Sessions (${sessions.length}) — write for each\n\n`
  for (const s of sessions) {
    prompt += `#### ${s.id}: ${s.name}\n`
    prompt += `- Description: ${s.desc}\n`
    prompt += `- Round: ${s.rt}\n`
    prompt += `- Venue: ${s.venue}\n`
    prompt += `- Date/Time: ${s.date}, ${s.time}\n`
    prompt += `- Price Range: $${s.pLo}–$${s.pHi}\n`
    const g = grounding.get(s.id)
    if (g && g.groundingFacts.length > 0) {
      prompt += `- groundingFacts (use these for current info; prefer over your training data):\n`
      for (const fact of g.groundingFacts) prompt += `  - ${fact}\n`
    } else {
      prompt += `- groundingFacts: (none provided; rely on your general knowledge, hedge speculation)\n`
    }
    prompt += '\n'
  }
  prompt += `Return a JSON array with ${sessions.length} objects, one for each session id above, with fields id, blurb, potentialContendersIntro, potentialContenders. No markdown fences.`
  return prompt
}

async function fetchGrounding(
  apiKey: string,
  session: Session,
  sport: string,
  model: string,
): Promise<GroundingData | null> {
  const prompt = buildGroundingPrompt(session, sport)
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch('https://api.perplexity.ai/v1/sonar', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: GROUNDING_SYSTEM_PROMPT },
            { role: 'user', content: prompt },
          ],
          max_tokens: 3000,
          temperature: 0.1,
          response_format: {
            type: 'json_schema',
            json_schema: { schema: PERPLEXITY_GROUNDING_SCHEMA },
          },
          web_search_options: { search_mode: 'web' },
        }),
      })
      if (!response.ok) {
        const text = await response.text()
        throw new Error(`Perplexity API ${response.status}: ${text.slice(0, 500)}`)
      }
      const body = (await response.json()) as PerplexityResponse
      const text = body.choices?.[0]?.message?.content
      if (!text) throw new Error('No Perplexity message content')
      const parsed = JSON.parse(text) as {
        id: string
        groundingFacts?: unknown
        relatedNews?: unknown
      }
      const facts = Array.isArray(parsed.groundingFacts)
        ? parsed.groundingFacts.filter(
            (f): f is string => typeof f === 'string' && f.trim().length > 0,
          )
        : []
      return {
        id: session.id,
        groundingFacts: facts,
        relatedNews: normalizeRelatedNews(parsed.relatedNews, session.id),
        sources: normalizePerplexitySources(body.search_results),
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(
        `    Grounding attempt ${attempt}/${MAX_RETRIES} failed for ${session.id}: ${msg}`,
      )
      if (attempt < MAX_RETRIES) await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * attempt))
    }
  }
  console.error(`    Grounding FAILED after ${MAX_RETRIES} attempts for ${session.id}`)
  return null
}

async function generateWriting(
  client: Anthropic,
  sessions: Session[],
  sport: string,
  grounding: Map<string, GroundingData>,
  model: string,
): Promise<WritingData[]> {
  const prompt = buildWritingPrompt(sessions, sport, grounding)
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await client.messages.create({
        model,
        max_tokens: 8192,
        system: WRITING_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: prompt }],
      })
      const text = response.content[0].type === 'text' ? response.content[0].text : ''
      const jsonMatch = text.match(/\[[\s\S]*\]/)
      if (!jsonMatch) throw new Error('No JSON array in Anthropic response')
      const parsed = JSON.parse(jsonMatch[0]) as unknown
      if (!Array.isArray(parsed)) throw new Error('Expected array')
      const results: WritingData[] = []
      for (const raw of parsed) {
        if (!raw || typeof raw !== 'object') continue
        const item = raw as Record<string, unknown>
        if (typeof item.id !== 'string' || typeof item.blurb !== 'string') continue
        if (typeof item.potentialContendersIntro !== 'string') continue
        if (!Array.isArray(item.potentialContenders)) continue
        const contenders = item.potentialContenders.filter(
          (c): c is Contender =>
            !!c &&
            typeof c === 'object' &&
            typeof (c as Contender).name === 'string' &&
            typeof (c as Contender).country === 'string' &&
            typeof (c as Contender).note === 'string',
        )
        results.push({
          id: item.id,
          blurb: item.blurb,
          potentialContendersIntro: item.potentialContendersIntro,
          potentialContenders: contenders,
        })
      }
      return results
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`    Writing attempt ${attempt}/${MAX_RETRIES} failed: ${msg}`)
      if (attempt < MAX_RETRIES) await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * attempt))
    }
  }
  console.error(`    Writing FAILED after ${MAX_RETRIES} attempts for ${sport} batch`)
  return []
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

function groupBySport(sessions: Session[]): Map<string, Session[]> {
  const groups = new Map<string, Session[]>()
  for (const s of sessions) {
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
  const sportFilter = getArgValue('--sport')
  const groundingConcurrency = parsePositiveInt(
    getArgValue('--grounding-concurrency'),
    DEFAULT_GROUNDING_CONCURRENCY,
  )
  const writingConcurrency = parsePositiveInt(
    getArgValue('--writing-concurrency'),
    DEFAULT_WRITING_CONCURRENCY,
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
  }

  const anthropicClient = anthropicKey ? new Anthropic({ apiKey: anthropicKey }) : null

  const groundingPath = getGroundingPath(perplexityModel, sportFilter, forceAll)
  const writingPath = getWritingPath(anthropicModel, sportFilter, forceAll)

  console.log(`Reading ${SESSIONS_PATH}`)
  console.log(`Reading ${CONTENT_PATH}`)
  console.log(`Grounding: perplexity ${perplexityModel}  concurrency=${groundingConcurrency}`)
  console.log(`  → ${groundingPath}`)
  console.log(`Writing:   anthropic  ${anthropicModel}  concurrency=${writingConcurrency}`)
  console.log(`  → ${writingPath}`)

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
  console.log(
    `Checkpoints: ${Object.keys(groundingCheckpoint.results).length} grounded, ${Object.keys(writingCheckpoint.results).length} written`,
  )

  const sessionMap = new Map(sessions.map((s) => [s.id, s]))
  const needsContent = sessions.filter((s) => {
    if (sportFilter && s.sport !== sportFilter) return false
    if (forceAll) return true
    return !s.blurb
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

  // Merge into session-content.json
  if (!dryRun) {
    const nextSessionContent = { ...sessionContent }
    for (const session of needsContent) {
      const writing = writingCheckpoint.results[session.id]
      const grounding = groundingCheckpoint.results[session.id]
      if (!writing) continue
      nextSessionContent[session.id] = {
        blurb: writing.blurb,
        potentialContendersIntro: writing.potentialContendersIntro,
        potentialContenders: writing.potentialContenders,
        relatedNews: grounding?.relatedNews ?? nextSessionContent[session.id]?.relatedNews ?? [],
        contentMeta: {
          provider: 'hybrid',
          groundingModel: grounding ? perplexityModel : undefined,
          writingModel: anthropicModel,
          generatedAt: new Date().toISOString(),
          sources: grounding?.sources,
        },
      }
    }
    const output = JSON.stringify(nextSessionContent, null, 2)
    writeFileSync(CONTENT_PATH, `${output}\n`)
    console.log(`\nWrote ${Object.keys(nextSessionContent).length} entries to ${CONTENT_PATH}`)
  }

  const grounded = Object.keys(groundingCheckpoint.results).length
  const written = Object.keys(writingCheckpoint.results).length
  console.log(`\nDone: ${grounded} grounded, ${written} written`)
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
