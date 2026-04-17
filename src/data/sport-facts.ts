import data from './sport-facts.json'

export interface SportFacts {
  gamesContext: string
  venueNotes: Record<string, string>
  eventHighlights: Record<string, string>
  parisRecap: string
}

export interface SportFactsMeta {
  lastVerified: string
  notes: string
}

const raw = data as Record<string, unknown>
const { _meta, ...sports } = raw

export const SPORT_FACTS_META = _meta as SportFactsMeta | undefined
export const SPORT_FACTS = sports as Record<string, SportFacts>
