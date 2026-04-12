import type { Filters, SortColumn, SortDirection, SortState } from '@/types/session'

export interface SessionRouteSearch extends Filters {
  sortCol?: SortColumn
  sortDir?: SortDirection
  session?: string
}

export const DEFAULT_FILTERS: Filters = {
  sport: '',
  round: '',
  zone: '',
  score: '',
  price: '',
}

export const DEFAULT_SORT: SortState = {
  col: 'agg',
  dir: 'desc',
}

function parseString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

export function validateSessionSearch(search: Record<string, unknown>): SessionRouteSearch {
  const sortCol = search.sortCol
  const sortDir = search.sortDir

  return {
    sport: parseString(search.sport),
    round: parseString(search.round),
    zone: parseString(search.zone),
    score: typeof search.score === 'string' ? search.score : DEFAULT_FILTERS.score,
    price: typeof search.price === 'string' ? search.price : DEFAULT_FILTERS.price,
    sortCol:
      sortCol === 'name' || sortCol === 'date' || sortCol === 'venue' || sortCol === 'agg'
        ? sortCol
        : DEFAULT_SORT.col,
    sortDir: sortDir === 'asc' || sortDir === 'desc' ? sortDir : DEFAULT_SORT.dir,
    session: typeof search.session === 'string' ? search.session : undefined,
  }
}

export function routeSearchToFilters(search: SessionRouteSearch): Filters {
  return {
    sport: search.sport,
    round: search.round,
    zone: search.zone,
    score: search.score,
    price: search.price,
  }
}

export function routeSearchToSort(search: SessionRouteSearch): SortState {
  return {
    col: search.sortCol ?? DEFAULT_SORT.col,
    dir: search.sortDir ?? DEFAULT_SORT.dir,
  }
}
