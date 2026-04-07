import type { RoundType } from '@/types/session'

const WEIGHTS = {
  prestige: 0.25,
  value: 0.2,
  atmosphere: 0.2,
  uniqueness: 0.15,
  star_power: 0.1,
  venue: 0.1,
} as const

const SPORT_ATMOSPHERE: Record<string, number> = {
  ATH: 9, SWM: 9, BKB: 8, VVO: 7, VBV: 9, FBL: 8,
  BSB: 8, BK3: 8, RU7: 8, FFB: 8, BOX: 8, WRE: 7,
  BDM: 6, TEN: 7, TTE: 6, FEN: 7, JUD: 7, TKW: 7,
  HBL: 7, HOC: 7, WPO: 6, LAC: 7, CKT: 6, SQU: 6,
  ARC: 5, SHO: 4, CSL: 6, CSP: 6, EQU: 6, GLF: 5,
  MPN: 5, CER: 10,
  GAR: 9, GRY: 7, GTR: 7, SWA: 6, DIV: 8, CLB: 7,
  BMF: 7, BMX: 7, CTR: 7, CRD: 6, MTB: 6, OWS: 5,
  ROW: 5, RCB: 5, SAL: 4, SRF: 8, SKB: 8, TRI: 7, WLF: 6,
}

const SPORT_STAR_POWER: Record<string, number> = {
  ATH: 9, SWM: 9, BKB: 9, VVO: 5, VBV: 6, FBL: 7,
  BSB: 7, BK3: 6, RU7: 5, FFB: 7, BOX: 7, WRE: 5,
  BDM: 6, TEN: 8, TTE: 5, FEN: 5, JUD: 6, TKW: 5,
  HBL: 5, HOC: 5, WPO: 4, LAC: 4, CKT: 6, SQU: 5,
  ARC: 3, SHO: 3, CSL: 4, CSP: 4, EQU: 5, GLF: 7,
  MPN: 3, CER: 10,
  GAR: 10, GRY: 6, GTR: 5, SWA: 5, DIV: 7, CLB: 6,
  BMF: 6, BMX: 5, CTR: 6, CRD: 6, MTB: 5, OWS: 6,
  ROW: 4, RCB: 3, SAL: 3, SRF: 7, SKB: 8, TRI: 5, WLF: 5,
}

const NEW_SPORTS = new Set(['FFB', 'LAC', 'CKT', 'SQU', 'BSB', 'BK3'])

const VENUE_SCORES: Record<string, number> = {
  'LA Memorial Coliseum': 10, 'Rose Bowl Stadium': 10,
  'Rose Bowl Aquatics Center': 8, 'Dodger Stadium': 10,
  '2028 Stadium': 9, 'Intuit Dome': 8,
  'Alamitos Beach Stadium': 8, 'Long Beach Arena': 6,
  'Carson Stadium': 6, 'Carson Field': 5,
  'Exposition Park Stadium': 7, 'DTLA Arena': 6,
  'Riviera Country Club': 8, 'Fairgrounds Cricket Stadium': 6,
  'Galen Center': 6, 'Venice Beach': 8, 'Trestles State Beach': 8,
  'Long Beach Aquatics Center': 6, 'Long Beach Climbing Theater': 6,
  'Belmont Shore': 7, 'Peacock Theater': 6,
  'LA Convention Center Hall 2': 5, 'Comcast Squash Center': 5,
  'Industry Hills MTB Course': 5, 'Carson Velodrome': 6,
  'Whittier Narrows Clay Center': 5, 'Long Beach Target Shooting Hall': 5,
  'Valley Complex 1': 5, 'Valley Complex 2': 5,
  'Valley Complex 3': 5, 'Valley Complex 4': 5,
}
const DEFAULT_VENUE_SCORE = 5

type InternalRoundType =
  | 'gold_medal' | 'final' | 'finals_mixed' | 'bronze'
  | 'semifinal' | 'quarterfinal' | 'ceremony' | 'preliminary'

function getSportCode(eventId: string): string {
  return eventId.match(/^([A-Z]+)/)![1]
}

function mapRoundType(rt: RoundType, desc: string): InternalRoundType {
  if (rt === 'Ceremony') return 'ceremony'
  if (rt === 'Bronze') return 'bronze'
  if (rt === 'Semi') return 'semifinal'
  if (rt === 'QF') return 'quarterfinal'
  if (rt === 'Prelim') return 'preliminary'
  // rt === 'Final'
  if (desc.includes('Gold Medal')) return 'gold_medal'
  if (['Round 1', 'Heats', 'Qualification', 'Repechage'].some((w) => desc.includes(w))) {
    return 'finals_mixed'
  }
  return 'final'
}

function countFinalsInSession(desc: string): number {
  return (desc.match(/Final/g) || []).length + (desc.match(/Gold Medal/g) || []).length
}

function parseStartHour(timeStr: string): number {
  const m = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/)
  if (!m) return 12
  let hour = parseInt(m[1])
  const ampm = m[3]
  if (ampm === 'PM' && hour !== 12) hour += 12
  else if (ampm === 'AM' && hour === 12) hour = 0
  return hour
}

export interface Ratings {
  prestige: number
  value: number
  atmosphere: number
  uniqueness: number
  star_power: number
  venue: number
  aggregate: number
}

export interface PricePercentiles {
  p25: number
  p50: number
  p75: number
}

export function computePricePercentiles(prices: number[]): PricePercentiles {
  const sorted = prices.filter((p) => p > 0).sort((a, b) => a - b)
  return {
    p25: sorted[Math.floor(sorted.length / 4)],
    p50: sorted[Math.floor(sorted.length / 2)],
    p75: sorted[Math.floor((3 * sorted.length) / 4)],
  }
}

export function rateEvent(
  event: { id: string; desc: string; venue: string; time: string; rt: RoundType; pHi: number },
  percentiles: PricePercentiles,
): Ratings {
  const code = getSportCode(event.id)
  const roundType = mapRoundType(event.rt, event.desc)
  const numFinals = countFinalsInSession(event.desc)

  // Prestige
  const prestigeMap: Record<InternalRoundType, number> = {
    gold_medal: 10, final: 9, finals_mixed: 8, bronze: 7,
    semifinal: 7, quarterfinal: 5, ceremony: 9, preliminary: 2,
  }
  let prestige = prestigeMap[roundType]
  if (numFinals >= 3) prestige = Math.min(10, prestige + 2)
  else if (numFinals >= 2) prestige = Math.min(10, prestige + 1)
  if ((code === 'ATH' || code === 'SWM') && ['final', 'gold_medal', 'finals_mixed'].includes(roundType)) {
    prestige = Math.min(10, prestige + 1)
  }

  // Value
  const price = event.pHi
  let priceTier: number
  if (price <= 0) priceTier = 9
  else if (price <= percentiles.p25) priceTier = 9
  else if (price <= percentiles.p50) priceTier = 7
  else if (price <= percentiles.p75) priceTier = 5
  else priceTier = 3
  const value = Math.round(Math.min(10, Math.max(1, priceTier + (prestige - 5) * 0.5)))

  // Atmosphere
  let atmosphere = SPORT_ATMOSPHERE[code] ?? 5
  if (['final', 'gold_medal', 'finals_mixed', 'bronze'].includes(roundType)) {
    atmosphere = Math.min(10, atmosphere + 1)
  }
  if (parseStartHour(event.time) >= 17) {
    atmosphere = Math.min(10, atmosphere + 1)
  }

  // Uniqueness
  let uniqueness = 4
  if (NEW_SPORTS.has(code)) uniqueness = 8
  if (roundType === 'gold_medal' || roundType === 'final') uniqueness = Math.min(10, uniqueness + 1)
  if (code === 'BSB' && event.venue.includes('Dodger Stadium')) uniqueness = 10
  if (code === 'ATH' && event.venue.includes('Coliseum')) uniqueness = Math.min(10, uniqueness + 1)
  if (code === 'FBL' && event.venue.includes('Rose Bowl')) uniqueness = Math.min(10, uniqueness + 1)
  if (code === 'CER') uniqueness = 10
  if (code === 'SRF' && event.venue.includes('Trestles')) uniqueness = Math.min(10, uniqueness + 1)
  if (code === 'DIV' && event.venue.includes('Rose Bowl')) uniqueness = Math.min(10, uniqueness + 1)

  // Star Power
  let starPower = SPORT_STAR_POWER[code] ?? 4
  if (['final', 'gold_medal', 'finals_mixed'].includes(roundType)) {
    starPower = Math.min(10, starPower + 1)
  } else if (roundType === 'preliminary') {
    starPower = Math.max(1, starPower - 2)
  }

  // Venue
  const venueScore = VENUE_SCORES[event.venue] ?? DEFAULT_VENUE_SCORE

  const ratings = { prestige, value, atmosphere, uniqueness, star_power: starPower, venue: venueScore }
  const aggregate = Math.round(
    (ratings.prestige * WEIGHTS.prestige +
      ratings.value * WEIGHTS.value +
      ratings.atmosphere * WEIGHTS.atmosphere +
      ratings.uniqueness * WEIGHTS.uniqueness +
      ratings.star_power * WEIGHTS.star_power +
      ratings.venue * WEIGHTS.venue) * 10,
  ) / 10

  return { ...ratings, aggregate }
}
