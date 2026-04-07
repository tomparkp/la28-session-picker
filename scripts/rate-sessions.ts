import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { rateEvent, computePricePercentiles } from '../src/lib/ratings.js'
import type { RoundType, Session } from '../src/types/session.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

const VALID_ROUND_TYPES = new Set(['Final', 'Prelim', 'Semi', 'QF', 'Bronze', 'Ceremony'])

function deriveRoundTag(name: string, desc: string): RoundType {
  const combined = name + ' ' + desc
  if (combined.includes('Opening Ceremony') || combined.includes('Closing Ceremony')) return 'Ceremony'
  if (combined.includes('Bronze Medal') || combined.includes('Bronze &') || combined.includes('Bronze/')) {
    if (combined.includes('Gold Medal')) return 'Final'
    return 'Bronze'
  }
  if (combined.includes('Gold Medal') || combined.includes('Final')) return 'Final'
  if (combined.includes('Semifinal') || combined.includes('Semi')) return 'Semi'
  if (combined.includes('Quarterfinal') || combined.includes('QF')) return 'QF'
  return 'Prelim'
}

interface RawEvent {
  id: string
  sport: string
  name: string
  desc: string
  venue: string
  zone: string
  date: string
  dk: string
  time: string
  rt: RoundType
  pLo: number
  pHi: number
  soccer: boolean
}

function parseEventsFromHTML(htmlPath: string): RawEvent[] {
  const html = readFileSync(htmlPath, 'utf8')
  const match = html.match(/const E=\[\n([\s\S]*?)\n\];/)
  if (!match) throw new Error('Could not find event array in HTML')

  const events: RawEvent[] = []
  for (const line of match[1].split('\n')) {
    const trimmed = line.trim().replace(/,$/, '')
    if (!trimmed.startsWith('{')) continue

    // eslint-disable-next-line no-new-func
    const raw = new Function('return (' + trimmed + ')')() as Record<string, unknown>

    const rawRt = String(raw.rt ?? '')
    const rt = VALID_ROUND_TYPES.has(rawRt)
      ? (rawRt as RoundType)
      : deriveRoundTag(String(raw.name), String(raw.desc))

    events.push({
      id: String(raw.id),
      sport: String(raw.sport),
      name: String(raw.name),
      desc: String(raw.desc),
      venue: String(raw.venue),
      zone: String(raw.zone),
      date: String(raw.date),
      dk: String(raw.dk),
      time: String(raw.time ?? ''),
      rt,
      pLo: Number(raw.pLo),
      pHi: Number(raw.pHi),
      soccer: Boolean(raw.soccer),
    })
  }

  return events
}

function main() {
  const htmlPath = resolve(ROOT, 'src/full_session_picker.html')
  const outPath = resolve(ROOT, 'src/data/sessions.json')

  console.log(`Reading ${htmlPath}`)
  const events = parseEventsFromHTML(htmlPath)
  console.log(`Parsed ${events.length} events`)

  const percentiles = computePricePercentiles(events.map((e) => e.pHi))
  console.log(
    `Price percentiles (pHi): p25=$${percentiles.p25.toFixed(0)}, ` +
    `p50=$${percentiles.p50.toFixed(0)}, p75=$${percentiles.p75.toFixed(0)}`
  )

  const sessions: Session[] = events.map((e) => {
    const r = rateEvent(e, percentiles)
    return {
      ...e,
      rP: r.prestige,
      rV: r.value,
      rA: r.atmosphere,
      rU: r.uniqueness,
      rS: r.star_power,
      rVn: r.venue,
      agg: r.aggregate,
    }
  })

  const aggs = sessions.map((s) => s.agg)
  const sorted = [...aggs].sort((a, b) => a - b)
  console.log(
    `Aggregate ratings: min=${Math.min(...aggs).toFixed(1)}, ` +
    `median=${sorted[Math.floor(sorted.length / 2)].toFixed(1)}, ` +
    `max=${Math.max(...aggs).toFixed(1)}`
  )

  writeFileSync(outPath, JSON.stringify(sessions, null, 2))
  console.log(`\nWrote ${sessions.length} sessions to ${outPath}`)

  sessions.sort((a, b) => b.agg - a.agg)
  console.log('\nTop 10 sessions by aggregate rating:')
  for (const s of sessions.slice(0, 10)) {
    console.log(
      `  ${s.id.padEnd(10)} ${s.agg.toFixed(1).padStart(4)}  ` +
      `P${s.rP} V${s.rV} A${s.rA} U${s.rU} S${s.rS} Vn${s.rVn}  ` +
      `| ${s.name} — ${s.desc.slice(0, 50)}`
    )
  }
}

main()
