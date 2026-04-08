import { createLazyFileRoute } from '@tanstack/react-router'

export const Route = createLazyFileRoute('/venues')({ component: Venues })

interface VenueInfo {
  name: string
  zone: string
  sessionCount: number
  sports: string[]
  priceRange: [number, number]
}

function getVenues(): VenueInfo[] {
  const { sessions } = Route.useLoaderData()
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

const thCls =
  'text-left px-2.5 py-2 bg-surface2 font-semibold text-[0.62rem] uppercase tracking-[0.08em] text-ink3 border-b border-border whitespace-nowrap cursor-pointer select-none'

function Venues() {
  const venues = getVenues()

  return (
    <div className="max-w-[1400px] mx-auto px-4 pt-4 pb-15">
      <div className="mb-4">
        <h1 className="font-display text-2xl font-normal text-ink -tracking-[0.02em]">Venues</h1>
        <p className="text-[0.78rem] text-ink3 font-light mt-0.5">
          {venues.length} venues across the LA28 Games
        </p>
      </div>
      <div className="overflow-x-auto border border-border rounded-lg bg-surface">
        <table className="w-full border-collapse text-[0.78rem]">
          <thead className="sticky top-0 z-2">
            <tr>
              <th className={thCls}>Venue</th>
              <th className={thCls}>Zone</th>
              <th className={thCls}>Sessions</th>
              <th className={thCls}>Sports</th>
              <th className={thCls}>Price Range</th>
            </tr>
          </thead>
          <tbody>
            {venues.map((v) => (
              <tr key={v.name} className="group">
                <td className="px-2.5 py-[7px] border-b border-border align-top font-semibold text-ink whitespace-nowrap text-[0.78rem] group-hover:bg-surface2">
                  {v.name}
                </td>
                <td className="px-2.5 py-[7px] border-b border-border align-top group-hover:bg-surface2">
                  <span className="inline-block px-1.5 py-0.5 rounded-md text-[0.6rem] font-semibold bg-surface3 text-ink2 whitespace-nowrap tracking-[0.02em]">
                    {v.zone}
                  </span>
                </td>
                <td className="px-2.5 py-[7px] border-b border-border align-top text-center group-hover:bg-surface2">
                  {v.sessionCount}
                </td>
                <td className="px-2.5 py-[7px] border-b border-border align-top group-hover:bg-surface2">
                  <div
                    className="text-[0.65rem] text-ink3 max-w-[400px] overflow-hidden text-ellipsis whitespace-nowrap"
                    title={v.sports.join(', ')}
                  >
                    {v.sports.join(', ')}
                  </div>
                </td>
                <td className="px-2.5 py-[7px] border-b border-border align-top font-semibold whitespace-nowrap tabular-nums group-hover:bg-surface2">
                  {v.priceRange[0] === 0 && v.priceRange[1] === 0
                    ? 'Free'
                    : `$${Math.round(v.priceRange[0]).toLocaleString()}–$${Math.round(v.priceRange[1]).toLocaleString()}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="text-center p-6 text-[0.72rem] text-ink3 font-light">
        Data sourced from LA 2028 Session Table &middot; Los Angeles 2028
      </div>
    </div>
  )
}
