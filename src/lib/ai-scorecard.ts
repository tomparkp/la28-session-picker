import { SPORT_KNOWLEDGE } from '@/data/sport-knowledge'
import type { Contender, Session } from '@/types/session'

type ScoreKey = 'rSig' | 'rExp' | 'rStar' | 'rUniq' | 'rDem'

interface ScorecardDimension {
  key: ScoreKey
  label: string
  score: number
  explanation: string
}

export interface SessionInsights {
  summary: string
  overallExplanation: string
  dimensions: ScorecardDimension[]
  potentialContendersIntro?: string
  potentialContenders: Contender[]
}

const MARQUEE_SPORTS = new Set([
  'Athletics (Track & Field)',
  'Athletics (Marathon)',
  'Basketball',
  'Diving',
  'Football (Soccer)',
  'Artistic Gymnastics',
  'Swimming',
  'Tennis',
  'Volleyball',
])

const NOVELTY_SPORTS = new Set([
  '3x3 Basketball',
  'Baseball',
  'Cricket',
  'Flag Football',
  'Lacrosse',
  'Softball',
  'Squash',
])

const ICONIC_VENUES = new Set([
  '2028 Stadium',
  'Dodger Stadium',
  'Intuit Dome',
  'LA Memorial Coliseum',
  'Rose Bowl Stadium',
])

function isPrimeTime(time: string) {
  return /\b(5|6|7|8|9):\d{2}\s*PM/.test(time)
}

function hasMultipleEvents(desc: string) {
  return /;\s|,\s|\b\d+\s+Games?\b|\b\d+\s+Matches?\b/i.test(desc)
}

function isMedalStage(session: Session) {
  return (
    session.rt === 'Final' || session.rt === 'Bronze' || /\bfinal\b|\bmedal\b/i.test(session.desc)
  )
}

function getKnowledge(sport: string) {
  return SPORT_KNOWLEDGE[sport]
}

function getVenueNote(sport: string, venue: string): string | undefined {
  const k = getKnowledge(sport)
  return k?.venueNotes[venue]
}

function getSignificanceExplanation(session: Session) {
  if (session.rt === 'Ceremony') {
    return 'Opening and closing ceremonies are the emotional bookends of the entire Games — there is no bigger stage.'
  }
  const k = getKnowledge(session.sport)
  if (isMedalStage(session)) {
    const context = k?.la28Context
    if (context && MARQUEE_SPORTS.has(session.sport)) {
      return `Gold medals are on the line in one of the marquee sports of the Games. ${context.split('.')[0]}.`
    }
    return `This is a medal-deciding session — the stakes don't get higher than this in ${session.sport}.`
  }
  if (session.rt === 'Semi' || session.rt === 'QF') {
    return `A ${session.rt === 'Semi' ? 'semifinal' : 'quarterfinal'} where the field narrows and the pressure ratchets up. Win or go home.`
  }
  if (NOVELTY_SPORTS.has(session.sport)) {
    return `Early-round ${session.sport} — a new or returning Olympic sport that's worth seeing up close while tickets are still accessible.`
  }
  return `An early-round session — lower stakes, but a chance to see world-class ${session.sport} athletes compete before the field thins out.`
}

function getExperienceExplanation(session: Session) {
  const venueNote = getVenueNote(session.sport, session.venue)
  const parts: string[] = []

  if (hasMultipleEvents(session.desc)) {
    parts.push('packs multiple events into a single ticket')
  }
  if (venueNote) {
    const shortNote = venueNote.split('.')[0]
    parts.push(`takes place at ${session.venue} — ${shortNote.toLowerCase()}`)
  } else if (ICONIC_VENUES.has(session.venue)) {
    parts.push(`lands in ${session.venue}, one of the iconic venues of these Games`)
  }
  if (isPrimeTime(session.time)) {
    parts.push('hits the prime-time evening window')
  }

  if (parts.length === 0) {
    return `The in-person experience is driven by the sport itself — ${session.sport} is a spectator-friendly event regardless of venue.`
  }
  return `This session ${parts.join(', ')}.`
}

function getStarPowerExplanation(session: Session) {
  const k = getKnowledge(session.sport)
  if (session.rt === 'Ceremony') {
    return 'Ceremonies concentrate the biggest names from every sport — flag-bearers, performers, and global icons all in one place.'
  }
  if (k && k.potentialContenders.length > 0 && isMedalStage(session)) {
    const names = k.potentialContenders.slice(0, 3).map((c) => c.name)
    return `Medal-stage ${session.sport} means the biggest names are in the building. Watch for ${names.join(', ')}.`
  }
  if (k && k.potentialContenders.length > 0) {
    const topName = k.potentialContenders[0]
    return `Athletes like ${topName.name} (${topName.country}) could be competing, though early rounds spread star power across multiple sessions.`
  }
  if (MARQUEE_SPORTS.has(session.sport)) {
    return 'A marquee Olympic sport that attracts globally recognized athletes even in the earlier rounds.'
  }
  return `${session.sport} may not have household-name star power, but Olympic-level athletes in any sport are impressive to see in person.`
}

function getUniquenessExplanation(session: Session) {
  if (session.rt === 'Ceremony') {
    return 'There is exactly one opening ceremony and one closing ceremony per Olympics. You literally cannot replicate this experience.'
  }
  const k = getKnowledge(session.sport)
  if (NOVELTY_SPORTS.has(session.sport)) {
    const context = k?.la28Context?.split('.')[0]
    return context
      ? `${context} — that alone makes this a one-of-a-kind Olympic ticket.`
      : `${session.sport} is a new or returning Olympic sport, making any session a piece of history.`
  }
  const venueNote = getVenueNote(session.sport, session.venue)
  if (venueNote && ICONIC_VENUES.has(session.venue)) {
    return `${session.venue} adds a layer of once-in-a-lifetime atmosphere. ${venueNote.split('.')[0]}.`
  }
  if (isMedalStage(session) && k?.la28Context) {
    return `A medal session in ${session.sport} at LA28 — ${k.la28Context.split('.')[0].toLowerCase()}.`
  }
  return 'A standard-format session without a unique venue or sport-novelty hook — but every Olympic event is a once-every-four-years opportunity.'
}

function getDemandExplanation(session: Session) {
  if (session.rt === 'Ceremony') {
    return 'Ceremony tickets are the hardest to get at any Olympics. Expect intense demand and premium pricing.'
  }
  if (session.pHi >= 3000) {
    return `Tickets top out at $${Math.round(session.pHi)} — a clear signal that this is one of the most sought-after sessions of the Games.`
  }
  if (isMedalStage(session) && MARQUEE_SPORTS.has(session.sport)) {
    return `A medal session in a marquee sport — expect heavy demand and early sellouts. These tickets won't be easy to get.`
  }
  if (session.pLo <= 50) {
    return `Starting at just $${Math.round(session.pLo)}, this is one of the more accessible tickets at the Games — solid value for a live Olympic experience.`
  }
  if (MARQUEE_SPORTS.has(session.sport) || ICONIC_VENUES.has(session.venue)) {
    return 'Steady demand driven by the sport profile or the venue name. Not the hardest ticket, but plan ahead.'
  }
  return 'Moderate demand makes this a potential value pick — a live Olympic experience without the fight for top-tier seats.'
}

function buildFallbackSummary(session: Session): string {
  const k = getKnowledge(session.sport)

  if (session.rt === 'Ceremony') {
    const venueNote = getVenueNote(session.sport, session.venue)
    return `${session.desc} at ${session.venue}. ${venueNote ?? 'The defining moment of the LA28 Games.'}`
  }

  if (isMedalStage(session) && k) {
    const context = k.la28Context.split('.').slice(0, 2).join('.') + '.'
    if (k.potentialContenders.length > 0) {
      const top = k.potentialContenders.slice(0, 2)
      return `${context} Watch for ${top.map((c) => `${c.name} (${c.country})`).join(' and ')} as gold medals are decided.`
    }
    return context
  }

  if (session.rt === 'Semi' || session.rt === 'QF') {
    const round = session.rt === 'Semi' ? 'semifinal' : 'quarterfinal'
    if (k && k.potentialContenders.length > 0) {
      return `A ${round} session where the field narrows. ${k.potentialContenders[0].name} and company are fighting to stay alive in the bracket.`
    }
    return `A ${round} session in ${session.sport} at ${session.venue}. Win-or-go-home competition — this is where the drama lives.`
  }

  if (k) {
    const venueNote = getVenueNote(session.sport, session.venue)
    if (venueNote) {
      return `Early-round ${session.sport} at ${session.venue} — ${venueNote.split('.')[0].toLowerCase()}. A chance to see world-class competition before the headline sessions.`
    }
    return `${session.sport} at ${session.venue}. ${k.la28Context.split('.')[0]}. Preliminary rounds are where you discover the stories that define the rest of the tournament.`
  }

  return `${session.sport} at ${session.venue}. Every session at the Olympics is a live, world-class competition — even the early rounds deliver moments you won't forget.`
}

function getFallbackPotentialContenders(session: Session): Contender[] {
  const k = getKnowledge(session.sport)
  if (!k || k.potentialContenders.length === 0) return []

  if (isMedalStage(session)) {
    return k.potentialContenders.slice(0, 5)
  }
  if (session.rt === 'Semi' || session.rt === 'QF') {
    return k.potentialContenders.slice(0, 4)
  }
  return k.potentialContenders.slice(0, 3)
}

export function getSessionInsights(session: Session): SessionInsights {
  const dimensions: ScorecardDimension[] = [
    {
      key: 'rSig',
      label: 'Significance',
      score: session.rSig,
      explanation: getSignificanceExplanation(session),
    },
    {
      key: 'rExp',
      label: 'Experience',
      score: session.rExp,
      explanation: getExperienceExplanation(session),
    },
    {
      key: 'rStar',
      label: 'Star Power',
      score: session.rStar,
      explanation: getStarPowerExplanation(session),
    },
    {
      key: 'rUniq',
      label: 'Uniqueness',
      score: session.rUniq,
      explanation: getUniquenessExplanation(session),
    },
    {
      key: 'rDem',
      label: 'Demand',
      score: session.rDem,
      explanation: getDemandExplanation(session),
    },
  ]

  const summary = session.blurb ?? buildFallbackSummary(session)
  const potentialContendersIntro = session.potentialContendersIntro
  const potentialContenders = session.potentialContenders ?? getFallbackPotentialContenders(session)

  const sortedDimensions = [...dimensions].sort((a, b) => b.score - a.score)
  const topLabel = sortedDimensions[0]?.label ?? 'The session'
  const weakest = sortedDimensions[sortedDimensions.length - 1]

  let overallExplanation: string
  if (session.agg >= 8) {
    overallExplanation = `This is one of the premium sessions at LA28. ${topLabel} leads the way, but the overall profile is strong across the board.`
  } else if (weakest && weakest.score < 5) {
    overallExplanation = `${topLabel} carries the rating, but ${weakest.label.toLowerCase()} holds it back — worth knowing if you're weighing this against other sessions.`
  } else if (session.agg >= 6) {
    overallExplanation = `A solid session with ${topLabel.toLowerCase()} as the standout category. The aggregate reflects a genuinely good ticket.`
  } else {
    overallExplanation = `Not a headline session, but still a live Olympic experience. ${topLabel} is the strongest dimension here.`
  }

  return {
    summary,
    overallExplanation,
    dimensions,
    potentialContendersIntro,
    potentialContenders,
  }
}
