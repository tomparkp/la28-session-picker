import type { Session } from '@/types/session'

type ScoreKey = 'rSig' | 'rExp' | 'rStar' | 'rUniq' | 'rDem'

interface ScorecardDimension {
  key: ScoreKey
  label: string
  score: number
  explanation: string
}

interface SessionInsights {
  summary: string
  overallExplanation: string
  dimensions: ScorecardDimension[]
}

const MARQUEE_SPORTS = new Set([
  'Athletics',
  'Basketball',
  'Ceremony',
  'Diving',
  'Football',
  'Gymnastics Artistic',
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
  return session.rt === 'Final' || session.rt === 'Bronze' || /\bfinal\b|\bmedal\b/i.test(session.desc)
}

function scoreBand(score: number) {
  if (score >= 8) return 'elite'
  if (score >= 6) return 'strong'
  if (score >= 4) return 'solid'
  return 'limited'
}

function getSignificanceExplanation(session: Session) {
  if (session.rt === 'Ceremony') {
    return 'Ceremonies sit at the center of the Games, so the significance score is effectively maxed out.'
  }
  if (isMedalStage(session)) {
    return `This is a ${session.rt.toLowerCase()}-stage session, which pushes the stakes well above an early-round ticket.`
  }
  if (session.rt === 'Semi' || session.rt === 'QF') {
    return `A ${session.rt.toLowerCase()} session matters competitively, but it still sits a tier below medal-deciding events.`
  }
  return 'This looks more like an early-round or qualification session, so the significance score stays modest.'
}

function getExperienceExplanation(session: Session) {
  const parts: string[] = []
  if (hasMultipleEvents(session.desc)) parts.push('bundles multiple competitions into one ticket')
  if (ICONIC_VENUES.has(session.venue)) parts.push(`lands in a marquee venue (${session.venue})`)
  if (isPrimeTime(session.time)) parts.push('gets a boost from an evening time slot')

  if (parts.length === 0) {
    return 'The live-viewing score is driven mostly by the sport itself rather than a special venue or time-slot advantage.'
  }

  return `The live experience rates well because it ${parts.join(', ')}.`
}

function getStarPowerExplanation(session: Session) {
  if (session.rt === 'Ceremony') {
    return 'The ceremony format concentrates recognizable performers, athletes, and flag-bearers, which drives star power up.'
  }
  if (MARQUEE_SPORTS.has(session.sport) && isMedalStage(session)) {
    return 'Marquee sport plus late-stage competition creates a strong chance of seeing headline athletes in person.'
  }
  if (MARQUEE_SPORTS.has(session.sport)) {
    return 'The sport has broad name recognition, but the round lowers the odds that the biggest stars are all concentrated here.'
  }
  return 'This sport can still be fun live, but it is less likely to cluster globally famous names in one session.'
}

function getUniquenessExplanation(session: Session) {
  if (session.rt === 'Ceremony') {
    return 'There is only one opening ceremony and one closing ceremony, so uniqueness is naturally off the charts.'
  }
  if (NOVELTY_SPORTS.has(session.sport)) {
    return `The score gets help from ${session.sport} being a rarer Olympic ticket in the LA28 mix.`
  }
  if (ICONIC_VENUES.has(session.venue)) {
    return `The setting helps here: ${session.venue} adds a sense of occasion that a generic venue would not.`
  }
  return 'This is a more standard session format, so uniqueness depends less on one-of-one factors and more on the sport itself.'
}

function getDemandExplanation(session: Session) {
  if (session.rt === 'Ceremony') {
    return 'Ceremony tickets are usually among the hardest to get, so demand stays extremely high.'
  }
  if (isMedalStage(session) && MARQUEE_SPORTS.has(session.sport)) {
    return 'High-interest sport plus medal-stage stakes makes this one of the more competitive tickets.'
  }
  if (MARQUEE_SPORTS.has(session.sport) || ICONIC_VENUES.has(session.venue)) {
    return 'This should draw steady interest, helped by either the sport profile or the venue name.'
  }
  return 'Demand looks more moderate here, which can make it a better value pick than the headline sessions.'
}

function buildSummary(session: Session, topLabels: string[]) {
  const headline = `${session.name} at ${session.venue} is an ${scoreBand(session.agg)} overall pick.`
  if (topLabels.length === 0) {
    return `${headline} It reads as a balanced session without one rating category dominating the profile.`
  }

  return `${headline} The strongest signals are ${topLabels.join(' and ').toLowerCase()}, which is why the AI score leans ${session.agg >= 6 ? 'positive' : 'cautious'}.`
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

  const sortedDimensions = [...dimensions].sort((a, b) => b.score - a.score)
  const topLabels = sortedDimensions.filter((d) => d.score === sortedDimensions[0]?.score).map((d) => d.label)
  const weakest = sortedDimensions[sortedDimensions.length - 1]
  const overallExplanation =
    weakest && weakest.score < 6
      ? `${topLabels[0] ?? 'The session'} does most of the work here, but ${weakest.label.toLowerCase()} keeps the rating from pushing higher.`
      : 'The category scores are fairly aligned, so the aggregate rating reflects a consistently strong profile rather than one inflated dimension.'

  return {
    summary: buildSummary(session, topLabels),
    overallExplanation,
    dimensions,
  }
}
