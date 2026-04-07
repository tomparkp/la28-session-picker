import { createFileRoute } from '@tanstack/react-router'

import { sessions } from '@/data/sessions'
import { fmtPrice } from '@/lib/format'
import type { Session } from '@/types/session'

export const Route = createFileRoute('/calendar')({ component: Calendar })

function getSessionsByDate() {
  const map = new Map<string, Session[]>()

  for (const s of sessions) {
    const list = map.get(s.date)
    if (list) list.push(s)
    else map.set(s.date, [s])
  }

  return Array.from(map.entries())
    .sort((a, b) => a[1][0].dk.localeCompare(b[1][0].dk))
    .map(([date, daySessions]) => ({
      date,
      sessions: sortByTime(daySessions),
    }))
}

function parseTime(time: string): number {
  const match = time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)/i)
  if (!match) return 9999
  let h = parseInt(match[1], 10)
  const m = parseInt(match[2], 10)
  const ampm = match[3].toUpperCase()
  if (ampm === 'PM' && h !== 12) h += 12
  if (ampm === 'AM' && h === 12) h = 0
  return h * 60 + m
}

function sortByTime(list: Session[]): Session[] {
  return [...list].sort((a, b) => parseTime(a.time) - parseTime(b.time))
}

function extractStartTime(time: string): string {
  const dash = time.indexOf('–')
  return dash === -1 ? time : time.slice(0, dash)
}

function Calendar() {
  const days = getSessionsByDate()
  const totalSessions = days.reduce((n, d) => n + d.sessions.length, 0)

  return (
    <div className="wrap">
      <div className="page-header">
        <h1>Agenda</h1>
        <p className="page-sub">
          {totalSessions} sessions across {days.length} competition days
        </p>
      </div>

      {days.map(({ date, sessions: daySessions }) => {
        const sports = [...new Set(daySessions.map((s) => s.sport))].sort()

        // Group sessions by start time for the timeline
        const timeSlots = new Map<string, Session[]>()
        for (const s of daySessions) {
          const start = extractStartTime(s.time)
          const list = timeSlots.get(start)
          if (list) list.push(s)
          else timeSlots.set(start, [s])
        }

        return (
          <div key={date} className="agenda-day">
            <div className="agenda-day-header">
              <h2>{date}</h2>
              <span className="agenda-day-meta">
                {daySessions.length} sessions &middot; {sports.length} sports
              </span>
            </div>

            <div className="agenda-timeline">
              {Array.from(timeSlots.entries()).map(([time, slotSessions]) => (
                <div key={time} className="agenda-slot">
                  <div className="agenda-time">{time}</div>
                  <div className="agenda-slot-sessions">
                    {slotSessions.map((s) => (
                      <div key={s.id} className="agenda-session">
                        <div className="agenda-session-top">
                          <span className="agenda-session-sport">{s.sport}</span>
                          {s.rt !== 'N/A' && s.rt !== 'Prelim' && (
                            <span className="agenda-session-round">{s.rt}</span>
                          )}
                        </div>
                        <div className="agenda-session-desc">{s.desc}</div>
                        <div className="agenda-session-bottom">
                          <span className="agenda-session-venue">{s.venue}</span>
                          <span className="agenda-session-price">{fmtPrice(s.pLo, s.pHi)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
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
