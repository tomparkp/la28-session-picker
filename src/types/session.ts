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
  rP: number
  rV: number
  rA: number
  rU: number
  rS: number
  rVn: number
  agg: number
}

export type RoundType = 'Final' | 'Semi' | 'QF' | 'Prelim' | 'Bronze' | 'Ceremony' | 'N/A'

export type SortColumn = 'name' | 'date' | 'venue' | 'pLo' | 'agg'
export type SortDirection = 'asc' | 'desc'

export interface SortState {
  col: SortColumn
  dir: SortDirection
}

export interface Filters {
  search: string
  sport: string
  round: string
  zone: string
  score: string
  price: string
}
