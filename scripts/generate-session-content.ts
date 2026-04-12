import 'dotenv/config'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

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
const PROMPT_VERSION = 9
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 5000
const MAX_NEWS_ITEMS = 10

interface GeneratedContent {
  id: string
  blurb: string
  potentialContendersIntro?: string
  potentialContenders: Contender[]
  relatedNews: RelatedNews[]
  contentMeta?: {
    provider: 'perplexity'
    model: string
    generatedAt: string
    sources?: ContentSource[]
  }
}

interface CheckpointFile {
  meta: {
    model: string
    promptVersion: number
    sportFilter?: string
    forceAll: boolean
  }
  generatedAt: string
  updatedAt: string
  results: Record<string, GeneratedContent>
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
  required: ['id', 'blurb', 'potentialContendersIntro', 'potentialContenders', 'relatedNews'],
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
          tags: {
            type: 'array',
            items: { type: 'string' },
          },
        },
      },
    },
  },
}

const SYSTEM_PROMPT = `You are writing session blurbs for an LA 2028 Olympics ticket-buying guide. Readers are deciding whether to attend; give them a flavorful picture of what the session actually is and why it could be worth watching.

Ground truth: the Games are still ahead. Venues, event formats, Olympic history, and prior results (Paris 2024, World Championships, etc.) are confirmed facts. LA28 rosters, participation, and medal outcomes are not. Your writing should be clear about which is which — state confirmed things plainly; flag speculation as speculation with words like "projected," "likely," "expected," or "if [athlete] competes."

You will receive a batch of sessions grouped by sport, with background on the sport, venue, and athletes.

Produce four fields per session:

1. **blurb** — two short paragraphs (blank line between), 2-4 sentences total. A flavorful description of the session: what it contains, how the event works, what's at stake, and anything noteworthy about the venue or the sport's live character. You may mention athletes, teams, or countries when it makes the writing better — just qualify participation honestly (e.g. "Shohei Ohtani could headline the tournament if MLB releases its players"). Lean into concrete specifics: venue geography, sightlines, crowd atmosphere, sport-specific rituals, historical context, marquee storylines. Vary the opening and framing across sessions in a batch. Match the round type — finals carry medal stakes, prelims are an accessible entry point, ceremonies are their own thing.

2. **potentialContendersIntro** — 1-2 sentences introducing the projected field. Mix confirmed facts (who won Paris, who's the reigning world champion) with speculation about LA28 (clearly flagged). Empty string if the session has no meaningful contender context.

3. **potentialContenders** — 2-5 athletes or teams likely to appear in THIS session. The "note" for each can be factual (a Paris 2024 result, a world ranking, a career achievement) or speculative (a projection, a storyline worth watching) — make it obvious which it is.
   - **Speculation is welcome — just label it.** If you don't know for certain who will be in a session, make informed guesses based on recent form, world rankings, or typical qualifying patterns, and phrase them with hedging words like "could appear," "projected to compete," "likely contender," "speculatively," "expected based on recent form." The goal is to be useful to the reader, not to refuse. What you must NOT do is state speculation as fact.
   - Only return an empty array when there is genuinely no plausible field to name — e.g. ceremonies, or a session so generic (a mass prelim of 80+ unknown qualifiers) that listing names would be meaningless. For any session that includes a final, semifinal, or marquee event, list contenders even if participation is uncertain.
   - For multi-event sessions, focus your contenders on the 1-2 highest-profile events (finals first, then semis, then notable prelims). Note in the intro which event the contenders are for.
   - Don't mix teams and individual athletes within the same session's list — pick one granularity per session.
   - For team sports: use teams for prelims/early rounds. For marquee sessions (finals, semis, rivalry matchups), use specific athletes (with country indicating their team) — qualify participation honestly (e.g. "Shohei Ohtani, if MLB releases its players").
   - For individual sports: use specific athletes throughout.

4. **relatedNews** — an array of 0 to ${MAX_NEWS_ITEMS} recent news items (prefer the last 18 months) that are directly relevant to THIS specific session. Pull only from your web search results — do not fabricate URLs, outlet names, dates, or titles. If the best items you can find aren't clearly relevant to the session's sport, event, gender division, or round, return an empty array rather than padding. For each item provide:
   - **title** — the article headline as published.
   - **summary** — one factual sentence explaining why it's relevant to this session.
   - **sourceName** — the publication or outlet (e.g. "ESPN", "Reuters", "The Athletic").
   - **sourceUrl** — the canonical URL from your search results.
   - **publishedDate** — ISO date (YYYY-MM-DD). Use the article's published date.
   - **tags** — 1-4 short kebab-case tags (e.g. "roster", "injury", "qualification", "venue", "schedule", plus an athlete or team slug when obvious).
   Prioritize LA28-specific news (qualification, rosters, venues, schedule), then recent performance news about probable contenders. Skip generic sport news that doesn't tie to the session.

Rules:
- Don't reference ratings, scores, algorithmic analysis, or internal metadata.
- Don't overuse superlatives ("the greatest," "pure drama") — let the facts carry it.
- Avoid absolute bombast. Don't claim something IS "the single greatest," "the most iconic," "the best ever," etc. If you want to reach for that register, hedge: "could become one of the greatest games ever played," "among the most storied venues in the sport." Make room for the reader to agree or disagree.
- Don't state LA28 participation as confirmed when it isn't. If an athlete has publicly cast doubt (injury, retirement, age), acknowledge it rather than ignoring it.
- Same for relatedNews — empty is fine when nothing fits.
- Don't refuse out of caution. Speculation is allowed everywhere in this output as long as it's clearly flagged as speculation. "Projected," "could appear," "likely contender," "speculatively," "if they qualify" are your friends. What's forbidden is stating uncertain things as fact — not making educated guesses.
- Vary sentence structure and angles across the batch — don't start every blurb the same way.

Return valid JSON with "id", "blurb", "potentialContendersIntro", "potentialContenders", and "relatedNews" fields.`

function buildSessionPrompt(session: Session, sport: string): string {
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

  prompt += `### Session\n`
  prompt += `- **ID**: ${session.id}\n`
  prompt += `- **Name**: ${session.name}\n`
  prompt += `- **Description**: ${session.desc}\n`
  prompt += `- **Round**: ${session.rt}\n`
  prompt += `- **Venue**: ${session.venue}\n`
  prompt += `- **Date/Time**: ${session.date}, ${session.time}\n`
  prompt += `- **Price Range**: $${session.pLo}–$${session.pHi}\n\n`

  prompt += `Use current web search results to verify facts that may have changed, especially LA28 venues, session schedules, qualification status, injuries, retirements, and current athlete form. Prefer official LA28, IOC/Olympics.com, international federation, team, and reputable sports-news sources. If current sources conflict with the background context above, prioritize the current cited source.\n\n`

  prompt += `Return a single JSON object matching the required schema. Do not include markdown fences.`

  return prompt
}

function getArgValue(name: string): string | undefined {
  const prefix = `${name}=`
  const arg = process.argv.find((a) => a.startsWith(prefix))
  return arg ? arg.slice(prefix.length) : undefined
}

function getCheckpointPath(model: string, sportFilter: string | undefined, forceAll: boolean) {
  const safeModel = model.replace(/[^a-zA-Z0-9._-]+/g, '-')
  const safeSport = sportFilter?.replace(/[^a-zA-Z0-9._-]+/g, '-') ?? 'all'
  const mode = forceAll ? 'force' : 'missing'

  return resolve(
    ROOT,
    '.cache',
    'generate-session-content',
    `v${PROMPT_VERSION}-perplexity-${safeModel}-${safeSport}-${mode}.json`,
  )
}

function createCheckpoint(
  model: string,
  sportFilter: string | undefined,
  forceAll: boolean,
): CheckpointFile {
  const now = new Date().toISOString()
  return {
    meta: { model, promptVersion: PROMPT_VERSION, sportFilter, forceAll },
    generatedAt: now,
    updatedAt: now,
    results: {},
  }
}

function loadCheckpoint(
  path: string,
  model: string,
  sportFilter: string | undefined,
  forceAll: boolean,
): CheckpointFile {
  if (!existsSync(path)) {
    return createCheckpoint(model, sportFilter, forceAll)
  }

  const checkpoint = JSON.parse(readFileSync(path, 'utf8')) as CheckpointFile
  const sameRun =
    checkpoint.meta.model === model &&
    checkpoint.meta.promptVersion === PROMPT_VERSION &&
    checkpoint.meta.sportFilter === sportFilter &&
    checkpoint.meta.forceAll === forceAll

  if (!sameRun) {
    throw new Error(
      `Checkpoint metadata mismatch in ${path}. Use --checkpoint with a different path.`,
    )
  }

  return checkpoint
}

function writeCheckpoint(path: string, checkpoint: CheckpointFile) {
  mkdirSync(dirname(path), { recursive: true })
  checkpoint.updatedAt = new Date().toISOString()
  const tempPath = `${path}.tmp`
  writeFileSync(tempPath, `${JSON.stringify(checkpoint, null, 2)}\n`)
  renameSync(tempPath, path)
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
  if (!Array.isArray(item.relatedNews)) {
    throw new Error(`Invalid item: relatedNews must be an array for ${item.id}`)
  }
  return item
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

async function generatePerplexitySession(
  apiKey: string,
  session: Session,
  sport: string,
  model: string,
): Promise<GeneratedContent | null> {
  const prompt = buildSessionPrompt(session, sport)

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
          max_tokens: 4096,
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

      const parsed = JSON.parse(text) as GeneratedContent
      const item = validateGeneratedContent(parsed)
      item.relatedNews = normalizeRelatedNews(item.relatedNews, session.id)
      const sources = normalizePerplexitySources(body.search_results)

      item.contentMeta = {
        provider: 'perplexity',
        model,
        generatedAt: new Date().toISOString(),
        ...(sources.length > 0 ? { sources } : {}),
      }

      return item
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`  Attempt ${attempt}/${MAX_RETRIES} failed for ${session.id}: ${msg}`)
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * attempt))
      }
    }
  }

  console.error(`  FAILED after ${MAX_RETRIES} attempts for ${session.id}. Skipping.`)
  return null
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
  const model = getArgValue('--model') ?? PERPLEXITY_DEFAULT_MODEL
  const forceAll = process.argv.includes('--force')
  const dryRun = process.argv.includes('--dry-run')
  const sportFilter = getArgValue('--sport')
  const checkpointPath =
    getArgValue('--checkpoint') ?? getCheckpointPath(model, sportFilter, forceAll)
  const apiKey = process.env.PERPLEXITY_API_KEY

  if (!apiKey && !dryRun) {
    console.error('Error: PERPLEXITY_API_KEY environment variable is required')
    process.exit(1)
  }

  console.log(`Reading ${SESSIONS_PATH}`)
  console.log(`Reading ${CONTENT_PATH}`)
  console.log(`Provider: perplexity (${model})`)
  if (!dryRun) console.log(`Checkpoint: ${checkpointPath}`)
  const rawSessions = JSON.parse(readFileSync(SESSIONS_PATH, 'utf8')) as Session[]
  const sessionContent = JSON.parse(readFileSync(CONTENT_PATH, 'utf8')) as Record<
    string,
    SessionContent
  >
  const sessions = rawSessions.map((session) => ({
    ...session,
    ...sessionContent[session.id],
  }))
  console.log(`Loaded ${sessions.length} sessions`)
  const checkpoint = loadCheckpoint(checkpointPath, model, sportFilter, forceAll)
  const totalCheckpointedCount = Object.keys(checkpoint.results).length
  if (totalCheckpointedCount > 0) {
    console.log(`Loaded ${totalCheckpointedCount} checkpointed result(s)`)
  }

  const sessionMap = new Map(sessions.map((s) => [s.id, s]))
  const needsContent = sessions.filter((s) => {
    if (sportFilter && s.sport !== sportFilter) return false
    if (forceAll) return true
    return !s.blurb
  })
  const pendingContent = needsContent.filter((s) => !checkpoint.results[s.id])
  const checkpointedNeededCount = needsContent.length - pendingContent.length

  console.log(`${needsContent.length} sessions need content generation`)
  if (checkpointedNeededCount > 0) {
    console.log(`${checkpointedNeededCount} session(s) already in checkpoint`)
  }
  if (needsContent.length === 0) {
    console.log('Nothing to do.')
    return
  }

  const sportGroups = groupBySport(pendingContent)
  const sports = [...sportGroups.keys()].sort()
  let totalGenerated = checkpointedNeededCount
  let totalFailed = 0

  if (pendingContent.length > 0) {
    for (const sport of sports) {
      const sportSessions = sportGroups.get(sport)!
      console.log(`\n${sport}: ${sportSessions.length} session(s)`)

      for (let i = 0; i < sportSessions.length; i++) {
        const session = sportSessions[i]
        console.log(`  [${i + 1}/${sportSessions.length}] ${session.id} ${session.name}`)

        if (dryRun) {
          console.log(`  [dry-run] Would generate content for ${session.id}`)
          continue
        }

        const result = await generatePerplexitySession(apiKey!, session, sport, model)
        if (result) {
          if (sessionMap.has(result.id)) {
            checkpoint.results[result.id] = result
            totalGenerated++
            writeCheckpoint(checkpointPath, checkpoint)
            console.log(
              `  Checkpointed ${Object.keys(checkpoint.results).length} result(s); news: ${result.relatedNews.length}`,
            )
          } else {
            console.warn(`  Warning: generated content for unknown session ${result.id}`)
          }
        } else {
          totalFailed += 1
        }

        if (i < sportSessions.length - 1) {
          await new Promise((r) => setTimeout(r, 1000))
        }
      }
    }
  } else if (!dryRun) {
    console.log('All needed sessions already exist in checkpoint')
  }

  if (!dryRun) {
    const nextSessionContent = { ...sessionContent }

    for (const result of Object.values(checkpoint.results)) {
      const session = sessionMap.get(result.id)
      if (!session) continue
      nextSessionContent[result.id] = {
        blurb: result.blurb,
        potentialContendersIntro: result.potentialContendersIntro,
        potentialContenders: result.potentialContenders,
        relatedNews: result.relatedNews,
        contentMeta: result.contentMeta ?? {
          provider: 'perplexity',
          model,
          generatedAt: new Date().toISOString(),
        },
      }
    }

    const output = JSON.stringify(nextSessionContent, null, 2)
    writeFileSync(CONTENT_PATH, `${output}\n`)
    console.log(
      `\nWrote ${Object.keys(nextSessionContent).length} content entries to ${CONTENT_PATH}`,
    )
  }

  console.log(`\nDone: ${totalGenerated} generated, ${totalFailed} failed`)
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
