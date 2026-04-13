/**
 * Fetches Paris 2024 medal results from Olympedia and writes a structured
 * JSON dataset keyed by LA28 sport name. Run manually when the source data
 * needs a refresh; the output is committed to the repo.
 *
 * Usage: pnpm tsx scripts/fetch-paris-2024-medals.ts
 *
 * The generated file powers deterministic Paris 2024 grounding in
 * scripts/generate-session-content.ts so the LLM can't hallucinate medalists.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { normalizeEventTokens, type ParisMedalEvent } from './lib/paris-medals.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const OUT_PATH = resolve(ROOT, 'src/data/paris-2024-medals.json')
const PARIS_EDITION_ID = 63

// Map LA28 sport name (as used in src/data/sessions.json & sport-knowledge.json)
// to Olympedia discipline codes. Multiple codes = concatenate events.
// `null` = sport was not in Paris 2024 (will be written as { _notInParis: true }).
const LA28_TO_OLYMPEDIA: Record<string, string[] | null> = {
  '3x3 Basketball': ['BK3'],
  Archery: ['ARC'],
  'Artistic Gymnastics': ['GAR'],
  'Artistic Swimming': ['SWA'],
  'Athletics (Track & Field)': ['ATH'],
  'Athletics (Marathon)': ['ATH'],
  'Athletics (Race Walk)': ['ATH'],
  'BMX Freestyle': ['BMF'],
  'BMX Racing': ['BMX'],
  Badminton: ['BDM'],
  Baseball: null, // not in Paris
  Basketball: ['BKB'],
  'Beach Volleyball': ['VBV'],
  'Boxing - Finals': ['BOX'],
  'Boxing - Prelims': ['BOX'],
  'Canoe Slalom': ['CSL'],
  'Canoe Sprint': ['CSP'],
  Climbing: ['CLB'],
  Cricket: null,
  'Cycling Road (Road Race)': ['CRD'],
  'Cycling Road (Time Trial)': ['CRD'],
  'Cycling Track': ['CTR'],
  Diving: ['DIV'],
  Equestrian: ['EDR', 'EJP', 'EVE'], // dressage + jumping + eventing
  Fencing: ['FEN'],
  'Flag Football': null,
  'Football (Soccer)': ['FBL'],
  Golf: ['GLF'],
  Handball: ['HBL'],
  Hockey: ['HOC'],
  Judo: ['JUD'],
  Lacrosse: null,
  'Modern Pentathlon': ['MPN'],
  'Mountain Bike': ['MTB'],
  'Open Water Swimming': ['OWS'],
  'Rhythmic Gymnastics': ['GRY'],
  Rowing: ['ROW'],
  'Rowing Coastal': null, // new for LA28
  'Rugby Sevens': ['RU7'],
  'Sailing (D/S/M)': ['SAL'],
  'Sailing (W/K)': ['SAL'],
  'Shooting (R/P)': ['SHO'],
  'Shooting (Shotgun)': ['SHO'],
  Skateboarding: ['SKB'],
  'Skateboarding (Park)': ['SKB'],
  'Skateboarding (Street)': ['SKB'],
  Softball: null,
  Squash: null,
  Surfing: ['SRF'],
  Swimming: ['SWM'],
  'Table Tennis': ['TTE'],
  Taekwondo: ['TKW'],
  Tennis: ['TEN'],
  'Trampoline Gymnastics': ['GTR'],
  Triathlon: ['TRI'],
  Volleyball: ['VVO'],
  'Water Polo': ['WPO'],
  Weightlifting: ['WLF'],
  Wrestling: ['WRE'],
}

interface RawMedal {
  event: string
  goldName: string
  goldNOC: string
  silverName: string
  silverNOC: string
  bronzeName: string | null
  bronzeNOC: string | null
}

async function fetchSportPage(code: string): Promise<string> {
  const url = `https://www.olympedia.org/editions/${PARIS_EDITION_ID}/sports/${code}`
  let lastErr: unknown
  for (let attempt = 1; attempt <= 5; attempt++) {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'la28-medal-fetcher/1.0 (one-off static data fetch)',
      },
    })
    if (res.ok) return res.text()
    lastErr = new Error(`Olympedia ${url} → ${res.status}`)
    // Back off on 429 / 5xx
    if (res.status === 429 || res.status >= 500) {
      const wait = 5000 * attempt
      console.warn(`  ${code}: ${res.status}, retrying in ${wait}ms (attempt ${attempt}/5)`)
      await new Promise((r) => setTimeout(r, wait))
      continue
    }
    throw lastErr
  }
  throw lastErr
}

// Olympedia medal tables are the second <table class="table table-striped"> on
// the sport page (first is the events list, second is medals). Each <tr> has:
//   <td class="top"><a>Event Name, Gender</a></td>
//   <td>Gold athlete (or country for relay/team)</td><td>Gold NOC</td>
//   <td>Silver ...</td><td>Silver NOC</td>
//   <td>Bronze ...</td><td>Bronze NOC</td>
function extractMedalsFromHtml(html: string): RawMedal[] {
  // Find all "table table-striped" tables
  const tableRe = /<table class="table table-striped">([\s\S]*?)<\/table>/g
  const tables: string[] = []
  let m: RegExpExecArray | null
  while ((m = tableRe.exec(html)) !== null) tables.push(m[1])
  // Medal table is the one whose thead contains "Gold" / "Silver" / "Bronze".
  const medalTable = tables.find((t) => /Gold/.test(t) && /Silver/.test(t) && /Bronze/.test(t))
  if (!medalTable) return []

  const rows: RawMedal[] = []
  const rowRe = /<tr>([\s\S]*?)<\/tr>/g
  let rowMatch: RegExpExecArray | null
  while ((rowMatch = rowRe.exec(medalTable)) !== null) {
    const row = rowMatch[1]
    // Skip header row (contains <th>)
    if (/<th\b/.test(row)) continue
    // Event name: first <td class="top"> anchor text
    const eventMatch = row.match(/<td class="top">\s*<a[^>]*>([^<]+)<\/a>/)
    if (!eventMatch) continue
    const event = decode(eventMatch[1].trim())

    const tds = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((x) => x[1])
    // tds[0] = event, tds[1]=gold-name, tds[2]=gold-NOC,
    //         tds[3]=silver-name, tds[4]=silver-NOC,
    //         tds[5]=bronze-name, tds[6]=bronze-NOC
    if (tds.length < 5) continue

    const extractName = (td: string): string => {
      // Either <a href="/athletes/…">Name</a> or bare country name for relays.
      const anchor = td.match(/<a[^>]*>([^<]+)<\/a>/)
      if (anchor) return decode(anchor[1].trim())
      return decode(td.replace(/<[^>]+>/g, '').trim())
    }
    const extractNOC = (td: string): string => {
      // NOC links look like <a href="/countries/XXX">…XXX</a>; the last 3
      // letters of visible text after the flag <img> are the NOC code.
      const noc = td.match(/\/countries\/([A-Z]{3})/)
      return noc ? noc[1] : ''
    }

    const isPlaceholder = (s: string | null): boolean => !s || s === '—' || s === '–' || s === '-'
    const goldName = extractName(tds[1])
    const goldNOC = extractNOC(tds[2])
    const silverName = extractName(tds[3])
    const silverNOC = extractNOC(tds[4])
    const bronzeNameRaw = tds.length > 5 ? extractName(tds[5]) : null
    const bronzeNOC = tds.length > 6 ? extractNOC(tds[6]) : null
    const bronzeName = isPlaceholder(bronzeNameRaw) ? null : bronzeNameRaw

    if (!event || isPlaceholder(goldName)) continue
    rows.push({
      event,
      goldName,
      goldNOC,
      silverName,
      silverNOC,
      bronzeName,
      bronzeNOC: bronzeName ? bronzeNOC || null : null,
    })
  }
  return rows
}

function decode(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
}

// Olympedia event names look like "400 metres Freestyle, Men" or
// "Doubles, Mixed". Split off the gender tail and reshape into
// "Men's 400 metres Freestyle" for readability in the injected prompt.
function reshapeEventName(olympediaName: string): {
  display: string
  gender: ParisMedalEvent['gender']
} {
  const parts = olympediaName.split(',').map((p) => p.trim())
  if (parts.length < 2) {
    return { display: olympediaName, gender: 'open' }
  }
  const tail = parts[parts.length - 1].toLowerCase()
  const head = parts.slice(0, -1).join(', ')
  if (tail === 'men') return { display: `Men's ${head}`, gender: 'm' }
  if (tail === 'women') return { display: `Women's ${head}`, gender: 'w' }
  if (tail === 'mixed') return { display: `Mixed ${head}`, gender: 'mixed' }
  if (tail === 'open') return { display: `Open ${head}`, gender: 'open' }
  return { display: olympediaName, gender: 'open' }
}

function toParisMedalEvent(raw: RawMedal): ParisMedalEvent {
  const { display, gender } = reshapeEventName(raw.event)
  return {
    event: display,
    gender,
    normalizedTokens: normalizeEventTokens(display),
    gold: { name: raw.goldName, country: raw.goldNOC },
    silver: { name: raw.silverName, country: raw.silverNOC },
    bronze: raw.bronzeName ? { name: raw.bronzeName, country: raw.bronzeNOC ?? '' } : null,
  }
}

async function main() {
  const uniqueCodes = new Set<string>()
  for (const codes of Object.values(LA28_TO_OLYMPEDIA)) {
    if (codes) for (const c of codes) uniqueCodes.add(c)
  }

  console.log(`Fetching ${uniqueCodes.size} Olympedia sport page(s)…`)
  const byCode = new Map<string, ParisMedalEvent[]>()
  for (const code of uniqueCodes) {
    const html = await fetchSportPage(code)
    const raw = extractMedalsFromHtml(html)
    const events = raw.map(toParisMedalEvent)
    byCode.set(code, events)
    console.log(`  ${code}: ${events.length} event(s)`)
    await new Promise((r) => setTimeout(r, 1500))
  }

  const out: Record<string, unknown> = {
    _meta: {
      source: `https://www.olympedia.org/editions/${PARIS_EDITION_ID}`,
      fetchedAt: new Date().toISOString(),
      note: 'Paris 2024 medal results keyed by LA28 sport name. Used as deterministic grounding in scripts/generate-session-content.ts.',
    },
  }

  for (const [sport, codes] of Object.entries(LA28_TO_OLYMPEDIA)) {
    if (codes === null) {
      out[sport] = { _notInParis: true }
      continue
    }
    const events: ParisMedalEvent[] = []
    for (const code of codes) {
      const list = byCode.get(code) ?? []
      for (const e of list) events.push(e)
    }
    out[sport] = events
  }

  mkdirSync(dirname(OUT_PATH), { recursive: true })
  writeFileSync(OUT_PATH, `${JSON.stringify(out, null, 2)}\n`)
  console.log(`\nWrote ${OUT_PATH}`)
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
