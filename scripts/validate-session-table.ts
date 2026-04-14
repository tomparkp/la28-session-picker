import { readFileSync } from 'node:fs'

import { parseDbTargetFromArgs, readAllSessions } from './lib/db'

const csvPath =
  '/Users/Home/Downloads/LA 2028 Session Table - Shareable (Excel).xlsx - Session List with Current Price.csv'

interface CsvSession {
  sport: string
  venue: string
  zone: string
  code: string
  date: string
  gamesDay: string
  sessionType: string
  desc: string
  startTime: string
  endTime: string
  prices: number[]
  pLo: number
  pHi: number
}

interface AppSession {
  id: string
  sport: string
  venue: string
  zone: string
  date: string
  dk: string
  time: string
  rt: string
  desc: string
  pLo: number
  pHi: number
}

// ---------- CSV parser handling quoted multi-line header ----------
function parseCsvLine(line: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false
  for (const ch of line) {
    if (ch === '"') {
      inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      fields.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  fields.push(current.trim())
  return fields
}

function parsePrice(s: string): number | null {
  if (!s || s === '-' || s === '') return null
  return parseFloat(s.replace(/[$,]/g, ''))
}

function parseCsv(raw: string): CsvSession[] {
  // The header is multi-line in this Excel export; join everything, then
  // split on rows that start with FALSE/TRUE (the CHECK LIST column)
  const lines = raw.split('\n')

  // Find where data starts — look for first line starting with FALSE or TRUE
  let dataStart = 0
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('FALSE') || lines[i].startsWith('TRUE')) {
      dataStart = i
      break
    }
  }

  const sessions: CsvSession[] = []
  for (let i = dataStart; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    const f = parseCsvLine(line)
    if (f.length < 12) continue

    const priceFields = f.slice(13, 23)
    const prices = priceFields.map(parsePrice).filter((p): p is number => p !== null)
    const pLo = prices.length ? Math.min(...prices) : 0
    const pHi = prices.length ? Math.max(...prices) : 0

    sessions.push({
      sport: f[2],
      venue: f[3],
      zone: f[4],
      code: f[5],
      date: f[6],
      gamesDay: f[7],
      sessionType: f[8],
      desc: f[9],
      startTime: f[10],
      endTime: f[11],
      prices,
      pLo,
      pHi,
    })
  }
  return sessions
}

// ---------- Normalize helpers ----------
function normalizeDate(csvDate: string): string {
  const days: Record<string, string> = {
    Sunday: 'Sun',
    Monday: 'Mon',
    Tuesday: 'Tue',
    Wednesday: 'Wed',
    Thursday: 'Thu',
    Friday: 'Fri',
    Saturday: 'Sat',
  }
  // "Friday, 7/14" → "Fri Jul 14"
  const m = csvDate.match(/^(\w+),\s*(\d+)\/(\d+)$/)
  if (!m) return csvDate
  const [, dayName, month, day] = m
  const months: Record<string, string> = {
    '7': 'Jul',
    '1': 'Jan',
    '2': 'Feb',
    '3': 'Mar',
    '4': 'Apr',
    '5': 'May',
    '6': 'Jun',
    '8': 'Aug',
    '9': 'Sep',
    '10': 'Oct',
    '11': 'Nov',
    '12': 'Dec',
  }
  return `${days[dayName] ?? dayName} ${months[month] ?? month} ${day}`
}

function normalizeSessionType(csvType: string): string {
  const lower = csvType.toLowerCase()
  if (lower.includes('quarter')) return 'QF'
  if (lower.includes('semi')) return 'Semi'
  if (lower.includes('bronze')) return 'Bronze'
  if (lower.includes('ceremony')) return 'Ceremony'
  if (
    lower.includes('preliminary') ||
    lower.includes('pool') ||
    lower.includes('group') ||
    lower.includes('qualification') ||
    lower.includes('ranking') ||
    lower.includes('repechage')
  )
    return 'Prelim'
  if (lower.includes('final') || lower.includes('gold')) return 'Final'
  return csvType
}

function to12h(t24: string): string {
  const [hStr, mStr] = t24.split(':')
  let h = parseInt(hStr, 10)
  const suffix = h >= 12 ? 'PM' : 'AM'
  if (h === 0) h = 12
  else if (h > 12) h -= 12
  return `${h}:${mStr} ${suffix}`
}

// ---------- Main ----------
const csvRaw = readFileSync(csvPath, 'utf-8')
const csvSessions = parseCsv(csvRaw)
const csvMap = new Map(csvSessions.map((s) => [s.code, s]))

const appSessions: AppSession[] = readAllSessions(parseDbTargetFromArgs()) as AppSession[]
const appMap = new Map(appSessions.map((s) => [s.id, s]))

console.log(`\n${'='.repeat(72)}`)
console.log(`  SESSION TABLE CROSS-REFERENCE REPORT`)
console.log(`  Source: "LA 2028 Session Table - Shareable (Excel)"`)
console.log(`${'='.repeat(72)}`)
console.log(`  Session Table entries: ${csvSessions.length}`)
console.log(`  App sessions (sessions.json): ${appSessions.length}`)
console.log(`${'='.repeat(72)}\n`)

// 1. Missing sessions
const onlyInTable: string[] = []
for (const code of csvMap.keys()) {
  if (!appMap.has(code)) onlyInTable.push(code)
}
const onlyInApp: string[] = []
for (const id of appMap.keys()) {
  if (!csvMap.has(id)) onlyInApp.push(id)
}

console.log(`--- SESSIONS IN TABLE BUT NOT IN APP: ${onlyInTable.length} ---`)
for (const code of onlyInTable.sort()) {
  const c = csvMap.get(code)!
  console.log(`  ${code}  ${c.sport} @ ${c.venue}, ${c.date} ${c.startTime}–${c.endTime}`)
  console.log(`    desc: ${c.desc}`)
}

console.log(`\n--- SESSIONS IN APP BUT NOT IN TABLE: ${onlyInApp.length} ---`)
for (const id of onlyInApp.sort()) {
  const a = appMap.get(id)!
  console.log(`  ${id}  ${a.sport} @ ${a.venue}, ${a.date} ${a.time}`)
}

// 2. Field-by-field comparison
interface Diff {
  id: string
  field: string
  table: string
  app: string
}

const diffs: Diff[] = []

for (const [code, tbl] of csvMap) {
  const app = appMap.get(code)
  if (!app) continue

  // Sport
  if (tbl.sport.toLowerCase() !== app.sport.toLowerCase()) {
    diffs.push({ id: code, field: 'sport', table: tbl.sport, app: app.sport })
  }

  // Venue
  if (tbl.venue.toLowerCase() !== app.venue.toLowerCase()) {
    diffs.push({ id: code, field: 'venue', table: tbl.venue, app: app.venue })
  }

  // Zone
  if (tbl.zone.toLowerCase() !== app.zone.toLowerCase()) {
    diffs.push({ id: code, field: 'zone', table: tbl.zone, app: app.zone })
  }

  // Date
  const tblDate = normalizeDate(tbl.date)
  if (tblDate !== app.date) {
    diffs.push({ id: code, field: 'date', table: `${tbl.date} → ${tblDate}`, app: app.date })
  }

  // Session type / round type
  const tblRt = normalizeSessionType(tbl.sessionType)
  if (tblRt !== app.rt && !(app.rt === 'N/A' && tblRt === tbl.sessionType)) {
    diffs.push({
      id: code,
      field: 'round type',
      table: `${tbl.sessionType} → ${tblRt}`,
      app: app.rt,
    })
  }

  // Time
  const tblTime = `${to12h(tbl.startTime)}–${to12h(tbl.endTime)}`
  const appTime = app.time.replace(/\u2013/g, '–')
  if (tblTime !== appTime) {
    diffs.push({ id: code, field: 'time', table: tblTime, app: appTime })
  }

  // Description
  if (tbl.desc.toLowerCase() !== app.desc.toLowerCase()) {
    diffs.push({ id: code, field: 'desc', table: tbl.desc, app: app.desc })
  }

  // Prices — compare with tolerance
  const priceTol = 0.02
  if (Math.abs(tbl.pLo - app.pLo) > priceTol) {
    diffs.push({ id: code, field: 'pLo', table: `$${tbl.pLo}`, app: `$${app.pLo}` })
  }
  if (Math.abs(tbl.pHi - app.pHi) > priceTol) {
    diffs.push({ id: code, field: 'pHi', table: `$${tbl.pHi}`, app: `$${app.pHi}` })
  }
}

// Group diffs by field
const byField = new Map<string, Diff[]>()
for (const d of diffs) {
  const arr = byField.get(d.field) ?? []
  arr.push(d)
  byField.set(d.field, arr)
}

console.log(`\n--- FIELD DIFFERENCES (${diffs.length} total across ${byField.size} fields) ---`)
for (const [field, items] of [...byField.entries()].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`\n  [${field.toUpperCase()}] — ${items.length} differences:`)
  for (const d of items.slice(0, 40)) {
    console.log(`    ${d.id}: TABLE="${d.table}" vs APP="${d.app}"`)
  }
  if (items.length > 40) {
    console.log(`    ... and ${items.length - 40} more`)
  }
}

console.log(`\n${'='.repeat(72)}`)
console.log(`  END OF REPORT`)
console.log(`${'='.repeat(72)}\n`)
