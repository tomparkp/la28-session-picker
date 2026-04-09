import { createLazyFileRoute } from '@tanstack/react-router'
import { useWindowVirtualizer } from '@tanstack/react-virtual'
import { useLayoutEffect, useMemo, useRef, useState } from 'react'

import { ScorePill } from '@/components/ScorePill'
import { fmtPrice } from '@/lib/format'
import { roundTagClasses } from '@/lib/tw'
import type { Session } from '@/types/session'

export const Route = createLazyFileRoute('/schedule')({ component: Schedule })

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

const categories = [
  { key: 'rSig', label: 'SIG' },
  { key: 'rExp', label: 'EXP' },
  { key: 'rStar', label: 'STAR' },
  { key: 'rUniq', label: 'UNIQ' },
  { key: 'rDem', label: 'DEM' },
] as const

function categoryColor(score: number): string {
  if (score >= 8) return 'text-[#3dba6f]'
  if (score >= 6) return 'text-[#b8a832]'
  if (score >= 4) return 'text-[#d49633]'
  return 'text-[#c84a3a]'
}

function Schedule() {
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
    estimateSize: (i) => days[i].sessions.length * 90 + 60,
    overscan: 3,
    scrollMargin,
    enabled: days.length > 0,
  })

  const measureElement = dayVirtualizer.measureElement

  return (
    <div className="max-w-[900px] mx-auto px-4 pt-4 pb-15">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-normal text-ink -tracking-[0.02em]">Schedule</h1>
        <p className="text-[0.78rem] text-ink3 font-light mt-0.5">
          {totalSessions} sessions across {days.length} competition days
        </p>
      </div>

      <div ref={listRef} style={{ height: dayVirtualizer.getTotalSize(), position: 'relative' }}>
        {dayVirtualizer.getVirtualItems().map((vDay) => {
          const { date, sessions: daySessions } = days[vDay.index]

          return (
            <div
              key={date}
              ref={measureElement}
              data-index={vDay.index}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${vDay.start - scrollMargin}px)`,
              }}
            >
              <div className="mb-8">
                <div className="pb-2 pt-1">
                  <div className="flex items-baseline gap-3 border-b border-border pb-2">
                    <h2 className="font-display text-[1rem] font-semibold text-ink">{date}</h2>
                    <span className="text-[0.7rem] text-ink3 font-light">
                      {daySessions.length} session{daySessions.length !== 1 && 's'}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  {daySessions.map((s) => (
                    <SessionCard key={s.id} session={s} />
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SessionCard({ session: s }: { session: Session }) {
  return (
    <div className="border border-border rounded-lg px-4 py-3 transition-colors duration-150 hover:border-ink3/30">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[0.7rem] font-bold uppercase tracking-[0.04em] text-accent shrink-0">
              {s.sport}
            </span>
            <span className={roundTagClasses(s.rt)}>{s.rt}</span>
          </div>
          <div className="text-[0.88rem] text-ink leading-snug font-medium">{s.desc}</div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1.5 text-[0.72rem] text-ink3">
            <span>{s.time}</span>
            <span className="text-border">|</span>
            <span>{s.venue}</span>
            <span className="text-border">|</span>
            <span className="font-medium text-ink2">{fmtPrice(s.pLo, s.pHi)}</span>
          </div>
        </div>

        <div className="shrink-0 flex flex-col items-end gap-1.5 pt-0.5">
          <ScorePill agg={s.agg} rSig={s.rSig} rExp={s.rExp} rStar={s.rStar} rUniq={s.rUniq} rDem={s.rDem} />
          <div className="flex gap-[3px]">
            {categories.map(({ key, label }) => {
              const score = s[key]
              return (
                <div key={key} className="flex flex-col items-center" title={`${label} ${score}`}>
                  <span className="text-[0.5rem] text-ink3 font-medium tracking-wide">{label}</span>
                  <span className={`text-[0.62rem] font-bold tabular-nums ${categoryColor(score)}`}>
                    {score}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
