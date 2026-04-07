import type { RoundType } from '@/types/session'

/**
 * AI Rating System v3
 *
 * Five dimensions, no value — price is visible in the table for users
 * to judge themselves.
 *
 * Significance (30%) — How important is this session in Olympic context
 * Experience (25%)   — How good will it be to watch live (sport + venue)
 * Star Power (15%)   — Likelihood of globally recognized athletes
 * Uniqueness (15%)   — How rare or special this opportunity is
 * Demand (15%)       — How sought-after / hard to get into this session will be
 */

const WEIGHTS = {
  significance: 0.3,
  experience: 0.25,
  star_power: 0.15,
  uniqueness: 0.15,
  demand: 0.15,
} as const

// Sport popularity tiers — affects significance and demand
// Tier 1: Marquee Olympic sports with massive global audiences
// Tier 2: Popular sports with strong followings
// Tier 3: Niche but entertaining
// Tier 4: Smaller audience sports
const SPORT_TIER: Record<string, number> = {
  ATH: 1, SWM: 1, GAR: 1, BKB: 1, FBL: 1, CER: 1,
  TEN: 2, DIV: 2, BOX: 2, VBV: 2, BSB: 2, FFB: 2,
  BK3: 2, RU7: 2, GRY: 2, GTR: 2, SKB: 2, SRF: 2, CLB: 2,
  BDM: 3, JUD: 3, TKW: 3, FEN: 3, WRE: 3, HBL: 3,
  HOC: 3, VVO: 3, BMF: 3, BMX: 3, CTR: 3, CRD: 3, TRI: 3,
  CKT: 3, LAC: 3, SQU: 3,
  TTE: 4, WPO: 4, SWA: 4, CSL: 4, CSP: 4, EQU: 4,
  GLF: 4, MPN: 4, ARC: 4, SHO: 4, WLF: 4, MTB: 4,
  OWS: 4, ROW: 4, RCB: 4, SAL: 4,
}

// Base live watchability per sport (how fun to watch in person)
const SPORT_WATCHABILITY: Record<string, number> = {
  ATH: 9, SWM: 8, BKB: 9, VVO: 7, VBV: 9, FBL: 8,
  BSB: 8, BK3: 8, RU7: 8, FFB: 8, BOX: 8, WRE: 7,
  BDM: 6, TEN: 7, TTE: 6, FEN: 7, JUD: 7, TKW: 7,
  HBL: 7, HOC: 7, WPO: 6, LAC: 7, CKT: 6, SQU: 6,
  ARC: 4, SHO: 3, CSL: 6, CSP: 6, EQU: 6, GLF: 5,
  MPN: 5, CER: 10,
  GAR: 10, GRY: 7, GTR: 7, SWA: 6, DIV: 8, CLB: 7,
  BMF: 7, BMX: 7, CTR: 7, CRD: 6, MTB: 6, OWS: 5,
  ROW: 5, RCB: 5, SAL: 4, SRF: 8, SKB: 8, TRI: 7, WLF: 5,
}

// Base star power per sport
const SPORT_STAR_POWER: Record<string, number> = {
  ATH: 9, SWM: 9, BKB: 10, VVO: 5, VBV: 6, FBL: 7,
  BSB: 7, BK3: 6, RU7: 5, FFB: 7, BOX: 7, WRE: 5,
  BDM: 6, TEN: 9, TTE: 5, FEN: 5, JUD: 6, TKW: 5,
  HBL: 5, HOC: 5, WPO: 4, LAC: 4, CKT: 6, SQU: 5,
  ARC: 3, SHO: 3, CSL: 4, CSP: 4, EQU: 5, GLF: 7,
  MPN: 3, CER: 10,
  GAR: 10, GRY: 6, GTR: 5, SWA: 5, DIV: 7, CLB: 6,
  BMF: 6, BMX: 5, CTR: 6, CRD: 6, MTB: 5, OWS: 6,
  ROW: 4, RCB: 3, SAL: 3, SRF: 7, SKB: 8, TRI: 5, WLF: 5,
}

// Base demand per sport — how sought-after are tickets generally
// Reflects historical sell-out patterns and cultural draw, especially in a US host city
const SPORT_DEMAND: Record<string, number> = {
  ATH: 9, SWM: 8, BKB: 10, VVO: 6, VBV: 8, FBL: 8,
  BSB: 9, BK3: 6, RU7: 6, FFB: 8, BOX: 7, WRE: 4,
  BDM: 5, TEN: 7, TTE: 4, FEN: 4, JUD: 5, TKW: 4,
  HBL: 5, HOC: 5, WPO: 4, LAC: 6, CKT: 5, SQU: 4,
  ARC: 3, SHO: 3, CSL: 4, CSP: 4, EQU: 5, GLF: 6,
  MPN: 3, CER: 10,
  GAR: 10, GRY: 6, GTR: 5, SWA: 5, DIV: 7, CLB: 6,
  BMF: 5, BMX: 5, CTR: 5, CRD: 5, MTB: 4, OWS: 4,
  ROW: 3, RCB: 3, SAL: 3, SRF: 7, SKB: 7, TRI: 5, WLF: 4,
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

function clamp(val: number, min = 1, max = 10): number {
  return Math.min(max, Math.max(min, Math.round(val)))
}

export interface Ratings {
  significance: number
  experience: number
  star_power: number
  uniqueness: number
  demand: number
  aggregate: number
}

export function rateEvent(
  event: { id: string; desc: string; venue: string; time: string; rt: RoundType; pHi: number },
): Ratings {
  const code = getSportCode(event.id)
  const roundType = mapRoundType(event.rt, event.desc)
  const numFinals = countFinalsInSession(event.desc)
  const tier = SPORT_TIER[code] ?? 4

  // ── SIGNIFICANCE (35%) ──
  const roundSignificance: Record<InternalRoundType, number> = {
    gold_medal: 10, final: 9, finals_mixed: 8, bronze: 7,
    semifinal: 6, quarterfinal: 4, ceremony: 10, preliminary: 2,
  }
  let significance = roundSignificance[roundType]

  // Sport tier modifier: tier 1 finals matter more than tier 4 finals
  if (['gold_medal', 'final', 'finals_mixed', 'bronze', 'semifinal'].includes(roundType)) {
    const tierBonus = [2, 1, 0, -1][tier - 1]
    significance = clamp(significance + tierBonus)
  }

  // Multi-medal sessions are more significant
  if (numFinals >= 4) significance = clamp(significance + 3)
  else if (numFinals >= 3) significance = clamp(significance + 2)
  else if (numFinals >= 2) significance = clamp(significance + 1)

  // ── EXPERIENCE (25%) ──
  const watchability = SPORT_WATCHABILITY[code] ?? 5
  const venueBase = VENUE_SCORES[event.venue] ?? DEFAULT_VENUE_SCORE

  // Venue impact scales with round importance
  const roundMultiplier: Record<InternalRoundType, number> = {
    gold_medal: 1.0, final: 1.0, finals_mixed: 0.9, bronze: 0.8,
    semifinal: 0.7, quarterfinal: 0.5, ceremony: 1.0, preliminary: 0.3,
  }
  const venueContribution = venueBase * roundMultiplier[roundType]

  // Blend: 60% sport watchability, 40% contextual venue
  let experience = watchability * 0.6 + venueContribution * 0.4

  // Evening boost only for high-energy sports (watchability >= 7)
  if (parseStartHour(event.time) >= 17 && watchability >= 7) {
    experience = experience + 0.5
  }

  // Medal rounds are more exciting to watch
  if (['gold_medal', 'final', 'finals_mixed', 'bronze'].includes(roundType)) {
    experience = experience + 0.5
  }

  experience = clamp(experience)

  // ── STAR POWER (15%) ──
  let starPower = SPORT_STAR_POWER[code] ?? 4

  if (['gold_medal', 'final', 'finals_mixed'].includes(roundType)) {
    starPower = clamp(starPower + 1)
  } else if (roundType === 'quarterfinal') {
    starPower = clamp(starPower - 1)
  } else if (roundType === 'preliminary') {
    starPower = clamp(starPower - 2)
  }

  // ── UNIQUENESS (15%) ──
  let uniqueness = 3

  // New/returning sports — bonus scales by round
  if (NEW_SPORTS.has(code)) {
    if (['gold_medal', 'final', 'finals_mixed', 'bronze'].includes(roundType)) {
      uniqueness = 9
    } else if (roundType === 'semifinal' || roundType === 'quarterfinal') {
      uniqueness = 7
    } else {
      uniqueness = 5
    }
  }

  // Iconic venue pairings — only for significant rounds
  const isMeaningfulRound = ['gold_medal', 'final', 'finals_mixed', 'bronze', 'semifinal'].includes(roundType)
  if (isMeaningfulRound) {
    if (code === 'BSB' && event.venue.includes('Dodger Stadium')) uniqueness = 10
    if (code === 'ATH' && event.venue.includes('Coliseum')) uniqueness = clamp(uniqueness + 2)
    if (code === 'FBL' && event.venue.includes('Rose Bowl')) uniqueness = clamp(uniqueness + 2)
    if (code === 'SRF' && event.venue.includes('Trestles')) uniqueness = clamp(uniqueness + 2)
    if (code === 'DIV' && event.venue.includes('Rose Bowl')) uniqueness = clamp(uniqueness + 1)
  }

  if (code === 'CER') uniqueness = 10

  uniqueness = clamp(uniqueness)

  // ── DEMAND (10%) ──
  // How sought-after will this session be? Combines sport demand with round type
  // and uses price ceiling as a market signal
  let demand = SPORT_DEMAND[code] ?? 4

  // Round type heavily affects demand
  if (['gold_medal', 'final'].includes(roundType)) {
    demand = clamp(demand + 2)
  } else if (roundType === 'finals_mixed' || roundType === 'bronze') {
    demand = clamp(demand + 1)
  } else if (roundType === 'preliminary') {
    demand = clamp(demand - 2)
  }

  // Price ceiling as market signal — high top-end prices indicate high demand
  if (event.pHi >= 3000) demand = clamp(demand + 2)
  else if (event.pHi >= 1500) demand = clamp(demand + 1)

  // Cultural moment multiplier — certain sport+round combos are THE events
  if (code === 'CER') demand = 10
  if (code === 'ATH' && roundType === 'gold_medal') demand = clamp(demand + 1)
  if (code === 'GAR' && ['gold_medal', 'final'].includes(roundType)) demand = clamp(demand + 1)
  if (code === 'BKB' && ['gold_medal', 'final', 'semifinal'].includes(roundType)) demand = clamp(demand + 1)
  if (code === 'BSB' && event.venue.includes('Dodger Stadium') && ['gold_medal', 'final'].includes(roundType)) demand = 10

  demand = clamp(demand)

  // ── AGGREGATE ──
  const raw =
    significance * WEIGHTS.significance +
    experience * WEIGHTS.experience +
    starPower * WEIGHTS.star_power +
    uniqueness * WEIGHTS.uniqueness +
    demand * WEIGHTS.demand

  const aggregate = Math.round(raw * 10) / 10

  return { significance, experience, star_power: starPower, uniqueness, demand, aggregate }
}
