import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import type Anthropic from '@anthropic-ai/sdk'

import type { SportKnowledge } from '../../src/data/sport-knowledge.js'
import type {
  Contender,
  ContentSource,
  RelatedNews,
  Scorecard,
  ScorecardDimension,
  Session,
} from '../../src/types/session.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
export const ROOT = resolve(__dirname, '..', '..')

const rawKnowledge = JSON.parse(
  readFileSync(resolve(ROOT, 'src/data/sport-knowledge.json'), 'utf8'),
)
const { _meta: _, ...sportEntries } = rawKnowledge
const SPORT_KNOWLEDGE = sportEntries as Record<string, SportKnowledge>

export const SESSIONS_PATH = resolve(ROOT, 'src/data/sessions.json')
export const CONTENT_PATH = resolve(ROOT, 'src/data/session-content.json')

export const PERPLEXITY_DEFAULT_MODEL = 'sonar-pro'
export const ANTHROPIC_DEFAULT_MODEL = 'claude-sonnet-4-5-20250929'
export const GROUNDING_VERSION = 1
export const WRITING_VERSION = 2
export const SCORING_VERSION = 2
export const MAX_RETRIES = 3
export const RETRY_DELAY_MS = 5000
export const MAX_NEWS_ITEMS = 10
export const WRITING_BATCH_SIZE = 15
export const SCORING_BATCH_SIZE = 15

export const SCORE_WEIGHTS = {
  significance: 0.3,
  experience: 0.25,
  starPower: 0.15,
  uniqueness: 0.15,
  demand: 0.15,
} as const

export function computeAggregate(
  sig: number,
  exp: number,
  star: number,
  uniq: number,
  dem: number,
): number {
  const raw =
    sig * SCORE_WEIGHTS.significance +
    exp * SCORE_WEIGHTS.experience +
    star * SCORE_WEIGHTS.starPower +
    uniq * SCORE_WEIGHTS.uniqueness +
    dem * SCORE_WEIGHTS.demand
  return Math.round(raw * 10) / 10
}

export interface GroundingData {
  id: string
  groundingFacts: string[]
  relatedNews: RelatedNews[]
  sources?: ContentSource[]
}

export interface WritingData {
  id: string
  blurb: string
  potentialContendersIntro: string
  potentialContenders: Contender[]
}

export interface ScoringData {
  id: string
  scorecard: Scorecard
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

export const GROUNDING_SYSTEM_PROMPT = `You gather current, cited facts for LA 2028 Olympics session entries. You do NOT write prose for readers — another stage handles that. Your job is to produce a structured grounding brief and a short list of relevant recent news.

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
- If a "User correction / additional context" block is present in the user prompt, treat it as authoritative — it represents a human-provided fact or correction that supersedes conflicting search results. Still cite sources for other facts.
- Return valid JSON matching the schema. No markdown, no code fences.`

export const WRITING_SYSTEM_PROMPT = `You are writing session blurbs for an LA 2028 Olympics ticket-buying guide. Readers are deciding whether to attend; give them a flavorful picture of what the session actually is and why it could be worth watching.

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
- If a "User correction / additional context" block is present, treat it as authoritative — it is a human-provided fact or correction that supersedes conflicting grounding facts or training data.
- Don't overuse superlatives. Don't claim something IS "the single greatest," "the most iconic," "the best ever." If you want that register, hedge: "could become one of the greatest games ever played."
- Don't state LA28 participation as confirmed when it isn't. If an athlete has publicly cast doubt (injury, retirement, age), acknowledge it.
- Don't refuse out of caution. Speculation is allowed as long as clearly flagged.
- Vary sentence structure and angles across the batch — don't start every blurb the same way.

Return a JSON array of objects, one per session id, each with "id", "blurb", "potentialContendersIntro", and "potentialContenders". No markdown fences around the JSON.`

function augmentationBlock(extraInstructions?: string): string {
  if (!extraInstructions?.trim()) return ''
  return `\n### User correction / additional context (authoritative — supersedes conflicting information)\n${extraInstructions.trim()}\n\n`
}

export function buildSportContext(sport: string): string {
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

export function buildGroundingPrompt(
  session: Session,
  sport: string,
  extraInstructions?: string,
): string {
  let prompt = buildSportContext(sport)
  prompt += `### Session to Ground\n`
  prompt += `- ID: ${session.id}\n`
  prompt += `- Name: ${session.name}\n`
  prompt += `- Description: ${session.desc}\n`
  prompt += `- Round: ${session.rt}\n`
  prompt += `- Venue: ${session.venue}\n`
  prompt += `- Date/Time: ${session.date}, ${session.time}\n\n`
  prompt += `Use current web search to find facts relevant to THIS session's event, round, venue, and likely contenders. Prioritize LA28-specific news, then 2024-2026 performance and status updates for probable contenders. Prefer official LA28, IOC/Olympics.com, international federation, team, and reputable sports-news sources.\n\n`
  prompt += augmentationBlock(extraInstructions)
  prompt += `Return a single JSON object matching the required schema. Do not include markdown fences.`
  return prompt
}

export function buildWritingPrompt(
  sessions: Session[],
  sport: string,
  grounding: Map<string, GroundingData>,
  extraInstructions?: string,
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
  prompt += augmentationBlock(extraInstructions)
  prompt += `Return a JSON array with ${sessions.length} objects, one for each session id above, with fields id, blurb, potentialContendersIntro, potentialContenders. No markdown fences.`
  return prompt
}

export function writeJson(path: string, data: unknown) {
  mkdirSync(dirname(path), { recursive: true })
  const tempPath = `${path}.tmp`
  writeFileSync(tempPath, `${JSON.stringify(data, null, 2)}\n`)
  renameSync(tempPath, path)
}

export function normalizeRelatedNews(items: unknown, sessionId: string): RelatedNews[] {
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

export function normalizePerplexitySources(
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

export async function fetchGrounding(
  apiKey: string,
  session: Session,
  sport: string,
  model: string,
  extraInstructions?: string,
): Promise<GroundingData | null> {
  const prompt = buildGroundingPrompt(session, sport, extraInstructions)
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

export async function generateWriting(
  client: Anthropic,
  sessions: Session[],
  sport: string,
  grounding: Map<string, GroundingData>,
  model: string,
  extraInstructions?: string,
): Promise<WritingData[]> {
  const prompt = buildWritingPrompt(sessions, sport, grounding, extraInstructions)
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

export const SCORING_SYSTEM_PROMPT = `You are scoring LA 2028 Olympics sessions for a ticket-buying guide. For each session you assign integer 1-10 scores across five dimensions and write a short, specific explanation that justifies the SCORE you gave (not the venue or sport in general).

You will receive a batch of sessions for one sport, each with: basic facts, sport-level background, grounding facts from recent web searches, and the blurb already written for that session. Use the grounding facts and blurb as authoritative current context. Do not restate the blurb.

BASELINE: This is the Olympics in Los Angeles. Every session is a world-class live event, and the Games are already well into presale with most sessions tracking toward sell-out. That context sets a floor on the scale — no Olympic session scores a 1 or 2, and sessions that would be "low interest" in a normal sporting context still land in the 4-5 range here because of global scarcity and Olympic prestige. Reserve 1-3 only for truly exceptional worst-case scenarios (none should occur in practice).

Dimensions and rubric:

1. significance — Olympic stakes of THIS session.
   10 = gold-medal final in a marquee sport (Athletics, Swimming, Basketball, Football, Gymnastics) or an Opening/Closing Ceremony.
   8-9 = gold-medal final in a non-marquee sport, or session containing 3+ medal events.
   6-7 = bronze-medal match, semifinal in a marquee sport, or single non-marquee final.
   5 = quarterfinal, or semifinal in a smaller sport.
   4 = preliminary heat / round 1 / qualification — Olympic athletes competing for advancement; real stakes, just not medal-deciding.
   Do not go below 4 — every Olympic competition round carries stakes for the athletes.

2. experience — How good it'll be to attend live. Combines sport watchability + venue quality + round + time of day.
   10 = ceremony at iconic venue, OR marquee final at LA Memorial Coliseum / Rose Bowl / Dodger Stadium / 2028 Stadium / Intuit Dome.
   8-9 = high-energy sport (basketball, beach volleyball, athletics, surfing) at a strong venue, especially evening prime-time.
   6-7 = solid spectator sport at a decent venue, or marquee sport in a quieter round.
   5 = daytime/morning session, or mid-tier sport at a generic venue — still a live Olympic experience, just without prime-time energy.
   4 = lowest the scale should go: an early-morning session of a hard-to-follow sport at a small venue.
   Do not go below 4 — "It's the Olympics at LA Memorial Coliseum" sets a floor even for a 9:30am prelim session.

3. starPower — Likelihood that globally-recognized athletes are competing.
   10 = basketball final, ceremony, marquee tennis match, men's/women's 100m final.
   8-9 = medal rounds in marquee sports with confirmed superstar contenders.
   6-7 = mid-tier sport medal round, or early-round marquee sport (top athletes often compete in prelims).
   5 = early-round sessions where top athletes may or may not appear — every Olympic field contains national champions and world-level competitors even if not household names.
   4 = lowest typical score: a prelim of a sport without any globally-known names.

4. uniqueness — How rare or special this specific session is. THIS IS THE DIMENSION MOST OFTEN MIS-RATED — be careful.
   10 = Opening/Closing Ceremony, baseball final at Dodger Stadium, Athletics gold-medal final at LA Memorial Coliseum, soccer final at Rose Bowl. (Once-in-a-lifetime pairings of marquee sport + iconic venue + medal stakes.)
   7-9 = medal round of a new/returning Olympic sport (Flag Football, Lacrosse, Cricket, Squash, Baseball, 3x3 Basketball), OR a marquee final at an iconic venue.
   5-6 = early round of a new/returning Olympic sport, OR a non-medal session at an iconic venue with significant cultural pull.
   4 = standard-format medal round in an established sport at a generic venue, OR a routine session at a famous venue (e.g. one of many Athletics prelims at the Coliseum — the venue is iconic but THIS session is one of dozens like it). Every Olympic session is once-every-four-years in some sense, which sets the floor.
   Do not go below 4 — even the most "routine" Olympic session is still an Olympic session.
   CRITICAL: An iconic venue alone does NOT justify a high uniqueness score if the session itself is routine. Many ATH prelims happen at the Coliseum across the Games — uniqueness for those should be modest (4-5). Reserve 8-10 for genuinely once-in-a-lifetime combinations.

5. demand — How sought-after / hard to get tickets for.
   IMPORTANT CONTEXT: Presale is active and the vast majority of Olympic sessions are tracking toward sell-out regardless of individual session profile — Olympic scarcity drives a high floor on demand.
   10 = Opening/Closing Ceremony, basketball final, baseball final at Dodger, Athletics finals night, anything with a $3000+ price ceiling.
   8-9 = marquee sport finals/semifinals; price ceiling $1500-$3000.
   6-7 = mid-tier sport finals, marquee sport early rounds at iconic venues, or price ceiling $500-$1500.
   5 = mid-tier sport non-medal rounds at decent venues, or early-round sessions of popular sports — still generally expected to sell but less competitive to book.
   4 = lowest typical score: an early prelim of a niche sport at a generic venue with a low price ceiling. Even here, Olympic scarcity means "easier to get" does not mean "easy to get."
   Do not go below 4 — Olympic ticket scarcity sets a floor; no LA28 session is genuinely low-demand.

For each dimension produce:
- "score": integer 1-10 (in practice 4-10; do not go below 4).
- "explanation": one to two sentences (max ~40 words) that justify THIS specific score with nuanced, grounded language. The tone must match the score AND acknowledge the Olympic context:
  - A 10 reads "exceptional because…"
  - A 7-9 reads "strong because…"
  - A 5-6 reads "solid — an Olympic session at [venue], though without [the prime-time slot / medal stakes / marquee-round matchup] that would push it higher"
  - A 4 reads "Olympic-baseline — a [morning prelim] with [specific limiting factor], which is about as modest as Olympic sessions get, but still a live LA28 ticket"
- Avoid harsh language. Do NOT write "low crowd energy", "sparse attendance", "weak demand", "tickets widely available", "forgettable", "minimal stakes", "lacking". Instead use nuanced framing like "crowds may be quieter than prime-time", "easier to book relative to marquee nights", "stakes are earned through advancement rather than medals".
- Reference actual session/venue/round factors, but frame them as tradeoffs against the Olympic baseline, not flaws.

Also produce:
- "overall": one to two sentences summarizing where the session lands and what carries or limits it. Tone should be measured, not dismissive — even a low-aggregate session is still an Olympic ticket.

Rules:
- Scores are integers 1-10, effectively 4-10 given the Olympic baseline.
- Explanations are plain text. No markdown, no bold, no italics, no lists.
- Vary the opening of explanations across the batch — don't start every Uniqueness explanation with "While the venue is iconic…".
- Use the full 4-10 range honestly. A marquee final in prime time at the Coliseum earns its 9s and 10s; an early prelim earns 4-5s. Don't compress everything to the middle.
- If a "User correction / additional context" block is present in the user prompt, treat it as authoritative — it supersedes conflicting facts.
- Return a JSON array of objects, one per session id, each with "id" and "scorecard" containing the five dimensions plus "overall". No markdown fences.

Example object shape (do not copy values):
{
  "id": "ATH04",
  "scorecard": {
    "significance": { "score": 9, "explanation": "..." },
    "experience": { "score": 10, "explanation": "..." },
    "starPower": { "score": 9, "explanation": "..." },
    "uniqueness": { "score": 10, "explanation": "..." },
    "demand": { "score": 10, "explanation": "..." },
    "overall": "..."
  }
}`

export function buildScoringPrompt(
  sessions: Session[],
  sport: string,
  grounding: Map<string, GroundingData>,
  writing: Map<string, WritingData>,
  extraInstructions?: string,
): string {
  let prompt = buildSportContext(sport)
  prompt += `### Sessions (${sessions.length}) — score each\n\n`
  for (const s of sessions) {
    prompt += `#### ${s.id}: ${s.name}\n`
    prompt += `- Description: ${s.desc}\n`
    prompt += `- Round: ${s.rt}\n`
    prompt += `- Venue: ${s.venue}\n`
    prompt += `- Date/Time: ${s.date}, ${s.time}\n`
    prompt += `- Price Range: $${s.pLo}–$${s.pHi}\n`
    const w = writing.get(s.id)
    if (w?.blurb) {
      prompt += `- Blurb (already written for this session — for context, do not restate):\n`
      for (const line of w.blurb.split('\n')) prompt += `  ${line}\n`
    }
    const g = grounding.get(s.id)
    if (g && g.groundingFacts.length > 0) {
      prompt += `- groundingFacts:\n`
      for (const fact of g.groundingFacts) prompt += `  - ${fact}\n`
    }
    prompt += '\n'
  }
  prompt += augmentationBlock(extraInstructions)
  prompt += `Return a JSON array with ${sessions.length} objects, one per session id above, each shaped { id, scorecard: { significance, experience, starPower, uniqueness, demand, overall } } where each dimension is { score, explanation }. No markdown fences.`
  return prompt
}

function parseDimension(raw: unknown): ScorecardDimension | null {
  if (!raw || typeof raw !== 'object') return null
  const obj = raw as Record<string, unknown>
  const score = typeof obj.score === 'number' ? Math.round(obj.score) : NaN
  const explanation = typeof obj.explanation === 'string' ? obj.explanation.trim() : ''
  if (!Number.isFinite(score) || score < 1 || score > 10) return null
  if (!explanation) return null
  return { score, explanation }
}

export async function generateScoring(
  client: Anthropic,
  sessions: Session[],
  sport: string,
  grounding: Map<string, GroundingData>,
  writing: Map<string, WritingData>,
  model: string,
  extraInstructions?: string,
): Promise<ScoringData[]> {
  const prompt = buildScoringPrompt(sessions, sport, grounding, writing, extraInstructions)
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await client.messages.create({
        model,
        max_tokens: 8192,
        system: SCORING_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: prompt }],
      })
      const text = response.content[0].type === 'text' ? response.content[0].text : ''
      const jsonMatch = text.match(/\[[\s\S]*\]/)
      if (!jsonMatch) throw new Error('No JSON array in Anthropic response')
      const parsed = JSON.parse(jsonMatch[0]) as unknown
      if (!Array.isArray(parsed)) throw new Error('Expected array')
      const results: ScoringData[] = []
      for (const raw of parsed) {
        if (!raw || typeof raw !== 'object') continue
        const item = raw as Record<string, unknown>
        if (typeof item.id !== 'string') continue
        const sc = item.scorecard as Record<string, unknown> | undefined
        if (!sc || typeof sc !== 'object') continue
        const significance = parseDimension(sc.significance)
        const experience = parseDimension(sc.experience)
        const starPower = parseDimension(sc.starPower)
        const uniqueness = parseDimension(sc.uniqueness)
        const demand = parseDimension(sc.demand)
        const overall = typeof sc.overall === 'string' ? sc.overall.trim() : ''
        if (!significance || !experience || !starPower || !uniqueness || !demand || !overall) {
          continue
        }
        const aggregate = computeAggregate(
          significance.score,
          experience.score,
          starPower.score,
          uniqueness.score,
          demand.score,
        )
        results.push({
          id: item.id,
          scorecard: {
            significance,
            experience,
            starPower,
            uniqueness,
            demand,
            aggregate,
            overall,
          },
        })
      }
      return results
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`    Scoring attempt ${attempt}/${MAX_RETRIES} failed: ${msg}`)
      if (attempt < MAX_RETRIES) await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * attempt))
    }
  }
  console.error(`    Scoring FAILED after ${MAX_RETRIES} attempts for ${sport} batch`)
  return []
}
