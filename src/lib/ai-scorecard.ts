import { SPORT_KNOWLEDGE } from '@/data/sport-knowledge'
import { getRelatedNewsForSession } from '@/lib/related-news'
import type { Contender, RelatedNews, SessionWithContent } from '@/types/session'

type ScoreKey = 'rSig' | 'rExp' | 'rStar' | 'rUniq' | 'rDem'

interface ScorecardDimension {
  key: ScoreKey
  label: string
  score: number
  explanation: string
}

export interface SessionInsights {
  summary: string
  overallExplanation: string | null
  dimensions: ScorecardDimension[]
  potentialContendersIntro?: string
  potentialContenders: Contender[]
  relatedNews: RelatedNews[]
}

function getKnowledge(sport: string) {
  return SPORT_KNOWLEDGE[sport]
}

function getVenueNote(sport: string, venue: string): string | undefined {
  const k = getKnowledge(sport)
  return k?.venueNotes[venue]
}

function isMedalStage(session: SessionWithContent) {
  return (
    session.rt === 'Final' || session.rt === 'Bronze' || /\bfinal\b|\bmedal\b/i.test(session.desc)
  )
}

function buildFallbackSummary(session: SessionWithContent): string {
  const k = getKnowledge(session.sport)

  if (session.rt === 'Ceremony') {
    const venueNote = getVenueNote(session.sport, session.venue)
    return `${session.desc} at ${session.venue}. ${venueNote ?? 'The defining moment of the 2028 Games.'}`
  }

  if (isMedalStage(session) && k) {
    const context = k.gamesContext.split('.').slice(0, 2).join('.') + '.'
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
    return `${session.sport} at ${session.venue}. ${k.gamesContext.split('.')[0]}. Preliminary rounds are where you discover the stories that define the rest of the tournament.`
  }

  return `${session.sport} at ${session.venue}. Every session at the Olympics is a live, world-class competition — even the early rounds deliver moments you won't forget.`
}

function getFallbackPotentialContenders(session: SessionWithContent): Contender[] {
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

export function getSessionInsights(session: SessionWithContent): SessionInsights {
  const sc = session.scorecard
  const dimensions: ScorecardDimension[] = sc
    ? [
        {
          key: 'rSig',
          label: 'Significance',
          score: sc.significance.score,
          explanation: sc.significance.explanation,
        },
        {
          key: 'rExp',
          label: 'Experience',
          score: sc.experience.score,
          explanation: sc.experience.explanation,
        },
        {
          key: 'rStar',
          label: 'Star Power',
          score: sc.starPower.score,
          explanation: sc.starPower.explanation,
        },
        {
          key: 'rUniq',
          label: 'Uniqueness',
          score: sc.uniqueness.score,
          explanation: sc.uniqueness.explanation,
        },
        {
          key: 'rDem',
          label: 'Demand',
          score: sc.demand.score,
          explanation: sc.demand.explanation,
        },
      ]
    : []

  const summary = session.blurb ?? buildFallbackSummary(session)
  const potentialContendersIntro = session.potentialContendersIntro
  const potentialContenders = session.potentialContenders ?? getFallbackPotentialContenders(session)
  const relatedNews = getRelatedNewsForSession(session)

  return {
    summary,
    overallExplanation: sc?.overall ?? null,
    dimensions,
    potentialContendersIntro,
    potentialContenders,
    relatedNews,
  }
}
