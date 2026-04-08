import { createLazyFileRoute } from '@tanstack/react-router'
import { useWindowVirtualizer } from '@tanstack/react-virtual'
import { useLayoutEffect, useMemo, useRef, useState } from 'react'

import { fmtPrice } from '@/lib/format'
import type { Session } from '@/types/session'

export const Route = createLazyFileRoute('/calendar')({ component: Calendar })

function getSessionsByDate(sessions: Session[]) {
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
  const { sessions } = Route.useLoaderData()
  const listRef = useRef<HTMLDivElement | null>(null)
  const [scrollMargin, setScrollMargin] = useState(0)
  const days = useMemo(() => getSessionsByDate(sessions), [sessions])
  const totalSessions = days.reduce((n, d) => n + d.sessions.length, 0)

  useLayoutEffect(() => {
    const el = listRef.current
    if (!el) return

    const updateMargin = () => {
      setScrollMargin(el.getBoundingClientRect().top + window.scrollY)
    }

    updateMargin()
    const ro = new ResizeObserver(updateMargin)
    ro.observe(el)
    window.addEventListener('resize', updateMargin)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', updateMargin)
    }
  }, [days.length])

  const dayVirtualizer = useWindowVirtualizer({
    count: days.length,
    estimateSize: () => 640,
    overscan: 3,
    scrollMargin,
    enabled: days.length > 0,
  })

  return (
    <div className="max-w-[1400px] mx-auto px-4 pt-4 pb-15">
      <div className="mb-4">
        <h1 className="font-display text-2xl font-normal text-ink -tracking-[0.02em]">Agenda</h1>
        <p className="text-[0.78rem] text-ink3 font-light mt-0.5">
          {totalSessions} sessions across {days.length} competition days
        </p>
      </div>

      <div ref={listRef} style={{ height: dayVirtualizer.getTotalSize(), position: 'relative' }}>
        {dayVirtualizer.getVirtualItems().map((vDay) => {
          const { date, sessions: daySessions } = days[vDay.index]
          const sports = [...new Set(daySessions.map((s) => s.sport))].sort()

          const timeSlots = new Map<string, Session[]>()
          for (const s of daySessions) {
            const start = extractStartTime(s.time)
            const list = timeSlots.get(start)
            if (list) list.push(s)
            else timeSlots.set(start, [s])
          }

          return (
            <div
              key={date}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${vDay.start}px)`,
              }}
            >
              <div className="mb-6 [content-visibility:auto] [contain-intrinsic-size:800px]">
                <div className="flex items-baseline gap-3 py-2.5 pb-2 border-b-2 border-accent mb-0 sticky top-0 bg-bg z-10">
                  <h2 className="font-display text-[1.1rem] font-semibold text-ink">{date}</h2>
                  <span className="text-[0.72rem] text-ink3 font-light">
                    {daySessions.length} sessions &middot; {sports.length} sports
                  </span>
                </div>

                <div className="pl-0">
                  {Array.from(timeSlots.entries()).map(([time, slotSessions]) => (
                    <div key={time} className="grid grid-cols-[72px_1fr] gap-x-3 pt-3 max-[480px]:grid-cols-[56px_1fr] max-[480px]:gap-x-2">
                      <div className="text-[0.78rem] font-semibold text-accent pt-2.5 text-right whitespace-nowrap max-[480px]:text-[0.7rem]">
                        {time}
                      </div>
                      <div className="flex flex-col gap-1.5 border-l-2 border-border pl-3">
                        {slotSessions.map((s) => (
                          <div key={s.id} className="bg-surface border border-border rounded-lg px-3 py-2 transition-[border-color] duration-150 hover:border-accent">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="text-[0.72rem] font-bold uppercase tracking-[0.04em] text-accent">
                                {s.sport}
                              </span>
                              {s.rt !== 'N/A' && s.rt !== 'Prelim' && (
                                <span className="text-[0.62rem] font-semibold px-[5px] py-px rounded bg-accent text-bg">
                                  {s.rt}
                                </span>
                              )}
                            </div>
                            <div className="text-[0.88rem] text-ink leading-[1.3]">{s.desc}</div>
                            <div className="flex justify-between items-center mt-1 text-[0.68rem] text-ink3">
                              <span className="font-normal">{s.venue}</span>
                              <span className="font-semibold text-ink2">{fmtPrice(s.pLo, s.pHi)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="text-center p-6 text-[0.72rem] text-ink3 font-light">
        Data sourced from LA 2028 Session Table &middot; Los Angeles 2028
      </div>
    </div>
  )
}
