import { createFileRoute } from '@tanstack/react-router'

import { sessions } from '@/data/sessions'

export const Route = createFileRoute('/venues')({ component: Venues })

interface VenueInfo {
  name: string
  zone: string
  sessionCount: number
  sports: string[]
  priceRange: [number, number]
}

function getVenues(): VenueInfo[] {
  const map = new Map<string, VenueInfo>()

  for (const s of sessions) {
    if (!s.venue || s.venue === 'N/A') continue
    const existing = map.get(s.venue)
    if (existing) {
      existing.sessionCount++
      if (!existing.sports.includes(s.sport)) existing.sports.push(s.sport)
      if (s.pLo < existing.priceRange[0]) existing.priceRange[0] = s.pLo
      if (s.pHi > existing.priceRange[1]) existing.priceRange[1] = s.pHi
    } else {
      map.set(s.venue, {
        name: s.venue,
        zone: s.zone,
        sessionCount: 1,
        sports: [s.sport],
        priceRange: [s.pLo, s.pHi],
      })
    }
  }

  return Array.from(map.values()).sort((a, b) => b.sessionCount - a.sessionCount)
}

function Venues() {
  const venues = getVenues()

  return (
    <div className="wrap">
      <div className="page-header">
        <h1>Venues</h1>
        <p className="page-sub">{venues.length} venues across the LA28 Games</p>
      </div>
      <div className="tbl-wrap">
        <table>
          <thead>
            <tr>
              <th>Venue</th>
              <th>Zone</th>
              <th>Sessions</th>
              <th>Sports</th>
              <th>Price Range</th>
            </tr>
          </thead>
          <tbody>
            {venues.map((v) => (
              <tr key={v.name}>
                <td className="en">{v.name}</td>
                <td>
                  <span className="badge-zone">{v.zone}</span>
                </td>
                <td className="ctr">{v.sessionCount}</td>
                <td>
                  <div className="ed" title={v.sports.join(', ')} style={{ maxWidth: 400 }}>
                    {v.sports.join(', ')}
                  </div>
                </td>
                <td className="cp">
                  {v.priceRange[0] === 0 && v.priceRange[1] === 0
                    ? 'Free'
                    : `$${Math.round(v.priceRange[0]).toLocaleString()}–$${Math.round(v.priceRange[1]).toLocaleString()}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="footer-note">
        Data sourced from LA 2028 Session Table &middot; Los Angeles 2028
      </div>
    </div>
  )
}
