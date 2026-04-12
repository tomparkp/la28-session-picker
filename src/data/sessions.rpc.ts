import { createServerFn } from '@tanstack/react-start'
import { setResponseHeaders } from '@tanstack/react-start/server'

import type { Filters, SortColumn, SortDirection, SortState } from '@/types/session'

export const PAGE_SIZE = 50

export interface SessionsPageInput {
  filters: Filters
  sort: SortState
  offset: number
  limit?: number
}

function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string')
  return []
}

function normalizeFilters(input: unknown): Filters {
  const value = (input ?? {}) as Record<string, unknown>

  return {
    sport: normalizeStringArray(value.sport),
    round: normalizeStringArray(value.round),
    zone: normalizeStringArray(value.zone),
    score: typeof value.score === 'string' ? value.score : '',
    price: typeof value.price === 'string' ? value.price : '',
  }
}

function normalizeSort(input: unknown): SortState {
  const value = (input ?? {}) as Record<string, unknown>
  const col = value.col
  const dir = value.dir

  const sortCol: SortColumn =
    col === 'name' || col === 'date' || col === 'venue' || col === 'pLo' || col === 'agg'
      ? col
      : 'agg'
  const sortDir: SortDirection = dir === 'asc' || dir === 'desc' ? dir : 'desc'

  return {
    col: sortCol,
    dir: sortDir,
  }
}

function normalizePageInput(input: unknown): Required<SessionsPageInput> {
  const value = (input ?? {}) as Record<string, unknown>
  const offset = typeof value.offset === 'number' && value.offset >= 0 ? value.offset : 0
  const limit =
    typeof value.limit === 'number' && value.limit > 0
      ? Math.min(value.limit, PAGE_SIZE)
      : PAGE_SIZE

  return {
    filters: normalizeFilters(value.filters),
    sort: normalizeSort(value.sort),
    offset,
    limit,
  }
}

function normalizeSessionId(input: unknown): string {
  const value = (input ?? {}) as Record<string, unknown>
  return typeof value.sessionId === 'string' ? value.sessionId : ''
}

function normalizeSessionIds(input: unknown): string[] {
  const value = (input ?? {}) as Record<string, unknown>
  const ids = Array.isArray(value.ids) ? value.ids : []

  return ids.filter((id): id is string => typeof id === 'string').slice(0, 200)
}

function applySessionCacheHeaders() {
  setResponseHeaders(
    new Headers({
      'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
    }),
  )
}

export const getSessionsPage = createServerFn({ method: 'GET' })
  .inputValidator(normalizePageInput)
  .handler(async ({ data }) => {
    applySessionCacheHeaders()

    const { getSessionsPageData } = await import('./sessions.data.server')
    return getSessionsPageData(data)
  })

export const getSessionDetail = createServerFn({ method: 'GET' })
  .inputValidator(normalizeSessionId)
  .handler(async ({ data: sessionId }) => {
    applySessionCacheHeaders()

    const { getSessionDetailData } = await import('./sessions.data.server')
    return getSessionDetailData(sessionId)
  })

export const getSessionsByIds = createServerFn({ method: 'GET' })
  .inputValidator(normalizeSessionIds)
  .handler(async ({ data: ids }) => {
    applySessionCacheHeaders()

    const { getSessionsByIds: getSessionsByIdsData } = await import('./sessions.data.server')
    return getSessionsByIdsData(ids)
  })
