export interface ParisMedalist {
  name: string
  country: string
}

export interface ParisMedalEvent {
  event: string
  normalizedTokens: string[]
  gender?: 'm' | 'w' | 'mixed' | 'open'
  gold: ParisMedalist
  silver: ParisMedalist
  bronze: ParisMedalist | null
}

export interface ParisMedalsData {
  _meta?: {
    source?: string
    fetchedAt?: string
    note?: string
  }
  [sport: string]:
    | ParisMedalEvent[]
    | { _notInParis: true; note?: string }
    | ParisMedalsData['_meta']
    | undefined
}

const ROUND_TOKENS = new Set([
  'final',
  'finals',
  'semi',
  'semis',
  'semifinal',
  'semifinals',
  'prelim',
  'prelims',
  'preliminary',
  'preliminaries',
  'heat',
  'heats',
  'qual',
  'quals',
  'qualification',
  'qualifications',
  'qualifying',
  'qualifier',
  'round',
  'rounds',
  'r16',
  'r32',
  'r64',
  'qf',
  'quarterfinal',
  'quarterfinals',
  'bronze',
  'gold',
  'silver',
  'pool',
  'group',
  'stage',
  'phase',
  'game',
  'games',
  'match',
  'matches',
  'day',
  'session',
  'not',
  'ticketed',
  'opening',
  'closing',
  'ceremony',
  'table',
  'of',
  'through',
  'elimination',
  'chance',
  'last',
  'classification',
  'victory',
  'medal',
  'medals',
  'final8',
  'final16',
  // small numbers that appear as round indices
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '1st',
  '2nd',
  '3rd',
  '4th',
  '5th',
  '6th',
  '7th',
  '8th',
  'first',
  'second',
  'third',
  // conjunctions
  'and',
  'or',
  'the',
  'in',
  'for',
  'on',
  'to',
  'a',
  'an',
  'with',
  'at',
  'vs',
  'indiv',
])

const SYNONYMS: Record<string, string> = {
  // gender
  men: 'm',
  mens: 'm',
  male: 'm',
  women: 'w',
  womens: 'w',
  female: 'w',
  // swimming strokes
  freestyle: 'free',
  butterfly: 'fly',
  backstroke: 'back',
  breaststroke: 'breast',
  individual: 'individual',
  medley: 'im',
  // misc
  metre: 'm',
  metres: 'm',
  meter: 'm',
  meters: 'm',
  kilometre: 'km',
  kilometres: 'km',
  kilometer: 'km',
  kilometers: 'km',
  // athletics throws / jumps
  shotput: 'shot',
  javelinthrow: 'javelin',
  hammerthrow: 'hammer',
  discusthrow: 'discus',
  triplejump: 'triple',
  longjump: 'long',
  highjump: 'high',
  polevault: 'pole',
  // cycling
  timetrial: 'timetrial',
  roadrace: 'roadrace',
  // canoe
  kayak: 'k',
  canoe: 'c',
  // wrestling
  grecoroman: 'greco',
  greco: 'greco',
  // rugby
  sevens: 'sevens',
  '7s': 'sevens',
  // basketball / soccer shorthand
}

// Tokens that should not contribute to matching even if not in ROUND_TOKENS
// (usually because they appear inconsistently across session descs).
const WEAK_TOKENS = new Set(['indiv', 'individual'])

function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function canonicalizeDistance(word: string): string {
  // "100m", "100meters", "100metres", "1500m" → "100m"
  const m = word.match(/^(\d+)(?:m|meter|meters|metre|metres)$/)
  if (m) return `${m[1]}m`
  // "10km", "100km"
  const km = word.match(/^(\d+)(?:km|kilometer|kilometers|kilometre|kilometres)$/)
  if (km) return `${km[1]}km`
  // relay-ish "4x100m", "4x100", "4x100metres"
  const relay = word.match(/^(\d+)x(\d+)(?:m|meter|meters|metre|metres)?$/)
  if (relay) return `${relay[1]}x${relay[2]}m`
  // weight classes "+90kg", "-60kg", "60kg"
  const kg = word.match(/^([+-]?\d+)kg$/)
  if (kg) return `${kg[1]}kg`
  return word
}

export function normalizeEventTokens(text: string): string[] {
  if (!text) return []
  let cleaned = stripAccents(text)
    .toLowerCase()
    .replace(/['’`]/g, '')
    .replace(/[×]/g, 'x')
    .replace(/[^a-z0-9+\-x ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  // Multi-word canonicalization before tokenization.
  // "N metres" / "N meters" / "N metre" / "N meter" / "N m" → "Nm"
  cleaned = cleaned.replace(/(\d+)\s+(?:metres?|meters?|m)\b/g, '$1m')
  // "N kilometres" / "N km" → "Nkm"
  cleaned = cleaned.replace(/(\d+)\s+(?:kilometres?|kilometers?|km)\b/g, '$1km')
  // "N x M" (relay) → "NxM" (optionally followed by metre unit)
  cleaned = cleaned.replace(/(\d+)\s*x\s*(\d+)/g, '$1x$2')
  // "+N kg" / "-N kg" / "N kg" → signed+kg concatenated
  cleaned = cleaned.replace(/([+-]?\d+)\s*kg\b/g, '$1kg')

  const out: string[] = []
  for (const rawWord of cleaned.split(' ')) {
    if (!rawWord) continue
    let word = rawWord
    word = SYNONYMS[word] ?? word
    word = canonicalizeDistance(word)
    if (!word) continue
    if (ROUND_TOKENS.has(word)) continue
    if (WEAK_TOKENS.has(word)) continue
    // Round patterns: r1, r16, r32, r64 (any "r" + digits)
    if (/^r\d+$/.test(word)) continue
    out.push(word)
  }
  return out
}

// Split a session's desc into candidate event phrases.
// Sessions like "W 100m Fly, M 400m Free, M 50m Fly" → 3 phrases.
// We split on commas, semicolons, and " and " / " & " at phrase boundaries.
export function splitDescIntoPhrases(desc: string): string[] {
  if (!desc) return []
  // Normalize "&" to "," so multi-event phrases get split, but preserve
  // "W/M" and "M/W" as single phrases by not splitting on "/".
  return desc
    .split(/[,;]/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
}

// Extract gender hints from a phrase. "M" / "Men's" → 'm'; "W" → 'w'; "M/W" → 'both'.
export function extractGenderHints(phrase: string): Set<'m' | 'w'> {
  const s = phrase.toLowerCase()
  const out = new Set<'m' | 'w'>()
  // Match standalone M, W, or M/W patterns
  if (/\b(m|men|mens|mens'?s?|male)\b|\bm\//.test(s) || /\/m\b/.test(s)) out.add('m')
  if (/\b(w|women|womens|womens'?s?|female)\b|\bw\//.test(s) || /\/w\b/.test(s)) out.add('w')
  // "Mixed" → count as both for matching purposes
  if (/\bmixed\b/.test(s)) {
    out.add('m')
    out.add('w')
  }
  return out
}

function tokensSubset(needle: string[], haystack: string[]): boolean {
  const hay = new Set(haystack)
  for (const t of needle) if (!hay.has(t)) return false
  return true
}

// Match a session desc to Paris events. Strategy:
// 1. Split desc into phrases.
// 2. For each phrase, extract gender hints and token it.
// 3. For each Paris event, check if the phrase's non-gender tokens are a subset
//    of the Paris event's tokens AND (gender hints are empty OR event gender is
//    compatible with one of the phrase gender hints).
// 4. Deduplicate matches across phrases.
export function matchSessionEvents(
  desc: string,
  sportMedals: ParisMedalEvent[] | undefined,
): ParisMedalEvent[] {
  if (!sportMedals || sportMedals.length === 0) return []
  const phrases = splitDescIntoPhrases(desc)
  const matched = new Map<string, ParisMedalEvent>()

  for (const phrase of phrases) {
    const genderHints = extractGenderHints(phrase)
    const phraseTokens = normalizeEventTokens(phrase).filter((t) => t !== 'm' && t !== 'w')

    for (const event of sportMedals) {
      const eventCoreTokens = event.normalizedTokens.filter(
        (t) => t !== 'm' && t !== 'w' && t !== 'mixed',
      )

      // Gender compatibility
      if (genderHints.size > 0 && event.gender) {
        if (event.gender === 'mixed' || event.gender === 'open') {
          // accept
        } else if (!genderHints.has(event.gender)) {
          continue
        }
      }

      // Require SOME basis to match: gender hint, phrase tokens, or both.
      // Pure-empty-match (no tokens, no gender) shouldn't pick up random events.
      if (phraseTokens.length === 0 && genderHints.size === 0) continue

      // Empty-phrase case (team sports where desc is "Women's Group Phase"):
      // match by gender hint alone, but only to events with a small token
      // footprint — sport-name-only events like "Women's Basketball" ([basketball])
      // or "Men's Water Polo" ([water, polo]). This avoids sweeping in every
      // complex athletics event when the session phrase is bare.
      if (phraseTokens.length === 0) {
        if (eventCoreTokens.length <= 2) matched.set(event.event, event)
        continue
      }

      // Normal case: require equal sets of core tokens. Subset in either
      // direction admits cross-event confusion (e.g. "100m" matching both the
      // sprint and the hurdles event), so insist on an exact core-token match.
      if (eventCoreTokens.length !== phraseTokens.length) continue
      if (!tokensSubset(eventCoreTokens, phraseTokens)) continue
      if (!tokensSubset(phraseTokens, eventCoreTokens)) continue

      matched.set(event.event, event)
    }
  }

  return [...matched.values()]
}

export function isNotInParis(
  entry: ParisMedalsData[string],
): entry is { _notInParis: true; note?: string } {
  return (
    !!entry &&
    typeof entry === 'object' &&
    !Array.isArray(entry) &&
    '_notInParis' in entry &&
    entry._notInParis === true
  )
}

export function getSportMedals(data: ParisMedalsData, sport: string): ParisMedalEvent[] | null {
  const entry = data[sport]
  if (!entry) return null
  if (Array.isArray(entry)) return entry
  if (isNotInParis(entry)) return null
  return null
}
