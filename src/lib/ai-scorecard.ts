import { SPORT_FACTS } from '@/data/sport-facts'
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

function getFacts(sport: string) {
  return SPORT_FACTS[sport]
}

function getVenueNote(sport: string, venue: string): string | undefined {
  return getFacts(sport)?.venueNotes?.[venue]
}

function isMedalStage(session: SessionWithContent) {
  return (
    session.rt === 'Final' || session.rt === 'Bronze' || /\bfinal\b|\bmedal\b/i.test(session.desc)
  )
}

// Fallback summary for sessions without a generated blurb. Kept simple now
// that the generated content pipeline covers every session — this path is
// only hit for sessions added after the last generation run.
function buildFallbackSummary(session: SessionWithContent): string {
  const facts = getFacts(session.sport)

  if (session.rt === 'Ceremony') {
    const venueNote = getVenueNote(session.sport, session.venue)
    return `${session.desc} at ${session.venue}. ${venueNote ?? 'The defining moment of the 2028 Games.'}`
  }

  if (isMedalStage(session) && facts?.gamesContext) {
    return facts.gamesContext.split('.').slice(0, 2).join('.') + '.'
  }

  if (session.rt === 'Semi' || session.rt === 'QF') {
    const round = session.rt === 'Semi' ? 'semifinal' : 'quarterfinal'
    return `A ${round} session in ${session.sport} at ${session.venue}. Win-or-go-home competition — this is where the drama lives.`
  }

  if (facts) {
    const venueNote = getVenueNote(session.sport, session.venue)
    if (venueNote) {
      return `Early-round ${session.sport} at ${session.venue} — ${venueNote.split('.')[0].toLowerCase()}. A chance to see world-class competition before the headline sessions.`
    }
    if (facts.gamesContext) {
      return `${session.sport} at ${session.venue}. ${facts.gamesContext.split('.')[0]}. Preliminary rounds are where you discover the stories that define the rest of the tournament.`
    }
  }

  return `${session.sport} at ${session.venue}. Every session at the 2028 Games is a live, world-class competition — even the early rounds deliver moments you won't forget.`
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
  const potentialContenders = session.potentialContenders ?? []
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
