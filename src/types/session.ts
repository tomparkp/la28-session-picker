export interface Contender {
  name: string
  country: string
  note: string
}

export interface ContentSource {
  title: string
  url: string
  date?: string
  lastUpdated?: string
  snippet?: string
  source?: string
}

export type ContentProvider = 'anthropic' | 'perplexity'

export interface ContentMeta {
  provider: ContentProvider
  model: string
  generatedAt: string
  sources?: ContentSource[]
}

export interface Session {
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
  rSig: number
  rExp: number
  rStar: number
  rUniq: number
  rDem: number
  agg: number
  blurb?: string
  potentialContenders?: Contender[]
  contentMeta?: ContentMeta
}

export type RoundType = 'Final' | 'Semi' | 'QF' | 'Prelim' | 'Bronze' | 'Ceremony' | 'N/A'

export type SortColumn = 'name' | 'date' | 'venue' | 'pLo' | 'agg'
export type SortDirection = 'asc' | 'desc'

export interface SortState {
  col: SortColumn
  dir: SortDirection
}

export type GroupBy = '' | 'sport' | 'rt' | 'zone' | 'date'

export interface Filters {
  search: string
  sport: string
  round: string
  zone: string
  score: string
  price: string
}
