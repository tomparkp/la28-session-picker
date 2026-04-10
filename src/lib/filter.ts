import { parseStartMinutes } from '@/lib/format'
import type { Session, Filters, SortState } from '@/types/session'

export function filterSessions(sessions: Session[], filters: Filters): Session[] {
  const scoreMin = filters.score ? Number(filters.score) : 0

  return sessions.filter((e) => {
    if (filters.sport.length > 0 && !filters.sport.includes(e.sport)) return false
    if (filters.round.length > 0 && !filters.round.includes(e.rt)) return false
    if (filters.zone.length > 0 && !filters.zone.includes(e.zone)) return false
    if (filters.price) {
      const [pn, px] = filters.price.split('-').map(Number)
      if (e.pLo < pn || e.pLo > px) return false
    }
    if (scoreMin && e.agg < scoreMin) return false
    return true
  })
}

export function sortSessions(sessions: Session[], sort: SortState): Session[] {
  const sorted = [...sessions]
  sorted.sort((a, b) => {
    let va: string | number
    let vb: string | number

    if (sort.col === 'agg') {
      va = a.agg ?? 0
      vb = b.agg ?? 0
      return sort.dir === 'asc' ? va - vb : vb - va
    }
    if (sort.col === 'pLo') {
      va = a.pLo ?? 9999
      vb = b.pLo ?? 9999
      return sort.dir === 'asc' ? va - vb : vb - va
    }
    if (sort.col === 'date') {
      const cmp = a.dk.localeCompare(b.dk)
      const result = cmp !== 0 ? cmp : parseStartMinutes(a.time) - parseStartMinutes(b.time)
      return sort.dir === 'asc' ? result : -result
    }
    va = (a[sort.col] || '').toLowerCase()
    vb = (b[sort.col] || '').toLowerCase()
    return sort.dir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
  })
  return sorted
}
