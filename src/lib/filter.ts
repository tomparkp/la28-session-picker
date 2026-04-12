import { parseStartMinutes } from '@/lib/format'
import type { Session, Filters, SortState } from '@/types/session'

export function filterSessions(sessions: Session[], filters: Filters): Session[] {
  let [pn, px] = [0, Infinity]
  if (filters.price) {
    const parts = filters.price.split('-').map(Number)
    pn = parts[0]
    px = parts[1]
  }
  const scoreMin = filters.score ? Number(filters.score) : 0

  return sessions.filter((e) => {
    if (filters.sport && filters.sport !== e.sport) return false
    if (filters.round && filters.round !== e.rt) return false
    if (filters.zone && filters.zone !== e.zone) return false
    if (e.pLo < pn || e.pLo > px) return false
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
