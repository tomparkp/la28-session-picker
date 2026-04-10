import { describe, expect, it } from 'vitest'

import { filterSessions } from '@/lib/filter'
import type { Filters, Session } from '@/types/session'

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: 'ATH01',
    sport: 'Athletics',
    name: 'ATH01 Athletics',
    desc: "Men's Final",
    venue: 'Olympic Stadium',
    zone: 'Downtown',
    date: 'Thu Jul 13',
    dk: '2028-07-13',
    time: '12:00 PM-4:15 PM',
    rt: 'Final',
    pLo: 150,
    pHi: 500,
    soccer: false,
    rSig: 7,
    rExp: 8,
    rStar: 9,
    rUniq: 6,
    rDem: 8,
    agg: 7.5,
    ...overrides,
  }
}

const defaultFilters: Filters = {
  sport: [],
  round: [],
  zone: [],
  score: '',
  price: '',
}

describe('filterSessions', () => {
  it('matches multiple categorical filter values as unions', () => {
    const sessions = [
      makeSession(),
      makeSession({
        id: 'SWM01',
        sport: 'Swimming',
        name: 'SWM01 Swimming',
        zone: 'Beach',
        rt: 'Semi',
      }),
      makeSession({
        id: 'GAR01',
        sport: 'Gymnastics',
        name: 'GAR01 Gymnastics',
        zone: 'Valley',
        rt: 'Prelim',
      }),
    ]

    const filtered = filterSessions(sessions, {
      ...defaultFilters,
      sport: ['Athletics', 'Swimming'],
      zone: ['Downtown', 'Beach'],
    })

    expect(filtered.map((session) => session.id)).toEqual(['ATH01', 'SWM01'])
  })

  it('keeps single-select price and rating filters working', () => {
    const sessions = [
      makeSession({ id: 'LOW01', pLo: 40, agg: 5.5 }),
      makeSession({ id: 'MID01', pLo: 90, agg: 8.2 }),
      makeSession({ id: 'HIGH01', pLo: 220, agg: 9.1 }),
    ]

    const filtered = filterSessions(sessions, {
      ...defaultFilters,
      price: '0-100',
      score: '8',
    })

    expect(filtered.map((session) => session.id)).toEqual(['MID01'])
  })
})
