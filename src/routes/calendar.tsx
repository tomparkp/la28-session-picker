import { createFileRoute } from '@tanstack/react-router'
import { sessions } from '@/data/sessions'
import { fmtPrice } from '@/lib/format'

export const Route = createFileRoute('/calendar')({ component: Calendar })

function getSessionsByDate() {
  const map = new Map<string, typeof sessions>()

  for (const s of sessions) {
    const list = map.get(s.date)
    if (list) list.push(s)
    else map.set(s.date, [s])
  }

  return Array.from(map.entries()).sort((a, b) => {
    const dkA = a[1][0].dk
    const dkB = b[1][0].dk
    return dkA.localeCompare(dkB)
  })
}

function Calendar() {
  const days = getSessionsByDate()

  return (
    <div className="wrap">
      <div className="page-header">
        <h1>Calendar</h1>
        <p className="page-sub">{days.length} competition days</p>
      </div>
      {days.map(([date, daySessions]) => {
        const sports = [...new Set(daySessions.map((s) => s.sport))].sort()
        const minPrice = Math.min(...daySessions.map((s) => s.pLo))
        const maxPrice = Math.max(...daySessions.map((s) => s.pHi))
        return (
          <div key={date} className="calendar-day">
            <div className="calendar-day-header">
              <h2>{date}</h2>
              <span className="calendar-day-stats">
                {daySessions.length} sessions &middot; {fmtPrice(minPrice, maxPrice)}
              </span>
            </div>
            <div className="calendar-sports">
              {sports.map((sport) => (
                <span key={sport} className="badge-zone">{sport}</span>
              ))}
            </div>
          </div>
        )
      })}
      <div className="footer-note">
        Data sourced from LA 2028 Session Table &middot; Los Angeles 2028
      </div>
    </div>
  )
}
