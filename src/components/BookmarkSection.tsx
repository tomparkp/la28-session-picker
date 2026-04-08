import { Bookmark } from 'lucide-react'

import { exportBookmarksCSV } from '@/lib/csv'
import { fmtPrice } from '@/lib/format'
import { roundTagClasses } from '@/lib/tw'
import type { Session } from '@/types/session'

import { ScorePill } from './ScorePill'

interface BookmarkSectionProps {
  sessions: Session[]
  bookmarks: Set<string>
  onToggleBookmark: (id: string) => void
  onClearAll: () => void
}

export function BookmarkSection({
  sessions,
  bookmarks,
  onToggleBookmark,
  onClearAll,
}: BookmarkSectionProps) {
  const items = sessions
    .filter((e) => bookmarks.has(e.id))
    .sort((a, b) => a.dk.localeCompare(b.dk) || a.name.localeCompare(b.name))

  if (!items.length) return null

  let totLo = 0
  let totHi = 0
  let ns = 0
  let sc = 0
  let totAgg = 0
  const days = new Set<string>()

  for (const e of items) {
    totLo += e.pLo
    totHi += e.pHi
    if (e.soccer) sc++
    else ns++
    days.add(e.dk)
    totAgg += e.agg
  }

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2.5 mb-2 max-md:flex-wrap">
        <h2 className="font-display text-[1.05rem] font-normal text-ink flex items-center gap-2">
          <Bookmark size={16} fill="var(--gold)" stroke="var(--gold)" />
          Bookmarked{' '}
          <span className="bg-gold text-bg font-sans text-[0.6rem] font-bold min-w-5 h-5 rounded-[10px] inline-flex items-center justify-center px-1.5">
            {items.length}
          </span>
        </h2>
        <div className="ml-auto text-[0.7rem] text-ink3 flex gap-3 font-light max-md:flex-wrap">
          <span className="whitespace-nowrap">{fmtPrice(totLo, totHi)} est.</span>
          <span className="whitespace-nowrap">
            {days.size} day{days.size !== 1 ? 's' : ''}
          </span>
          <span className="whitespace-nowrap">{ns} non-soccer</span>
          <span className="whitespace-nowrap">{sc} soccer</span>
          <span className="whitespace-nowrap">Avg rating: {(totAgg / items.length).toFixed(1)}</span>
        </div>
      </div>
      <div className="flex gap-2 mb-2">
        <button
          className="px-3 py-1 text-[0.7rem] font-semibold border border-border rounded-md bg-surface2 text-ink2 cursor-pointer transition-all duration-150 hover:border-gold hover:text-gold"
          onClick={() => exportBookmarksCSV(items)}
        >
          Export CSV
        </button>
        <button
          className="px-3 py-1 text-[0.7rem] font-semibold border border-border rounded-md bg-surface2 text-ink2 cursor-pointer transition-all duration-150 hover:border-red hover:text-red"
          onClick={onClearAll}
        >
          Clear All
        </button>
      </div>
      <div className="overflow-x-auto border border-[rgba(212,168,67,0.25)] rounded-lg bg-surface">
        <table className="w-full border-collapse text-[0.78rem]">
          <thead className="sticky top-0 z-2">
            <tr>
              <th className="text-left px-2.5 py-2 bg-surface2 font-semibold text-[0.62rem] uppercase tracking-[0.08em] text-ink3 border-b border-border whitespace-nowrap cursor-pointer select-none">Event</th>
              <th className="text-left px-2.5 py-2 bg-surface2 font-semibold text-[0.62rem] uppercase tracking-[0.08em] text-ink3 border-b border-border whitespace-nowrap cursor-pointer select-none">Date</th>
              <th className="text-left px-2.5 py-2 bg-surface2 font-semibold text-[0.62rem] uppercase tracking-[0.08em] text-ink3 border-b border-border whitespace-nowrap cursor-pointer select-none">Venue</th>
              <th className="text-left px-2.5 py-2 bg-surface2 font-semibold text-[0.62rem] uppercase tracking-[0.08em] text-ink3 border-b border-border whitespace-nowrap cursor-pointer select-none">Zone</th>
              <th className="text-left px-2.5 py-2 bg-surface2 font-semibold text-[0.62rem] uppercase tracking-[0.08em] text-ink3 border-b border-border whitespace-nowrap cursor-pointer select-none">Price</th>
              <th className="text-left px-2.5 py-2 bg-surface2 font-semibold text-[0.62rem] uppercase tracking-[0.08em] text-ink3 border-b border-border whitespace-nowrap cursor-pointer select-none">Round</th>
              <th className="text-left px-2.5 py-2 bg-surface2 font-semibold text-[0.62rem] uppercase tracking-[0.08em] text-ink3 border-b border-border whitespace-nowrap cursor-pointer select-none" title="AI-generated aggregate rating">AI Rating</th>
              <th className="text-left px-2.5 py-2 bg-surface2 font-semibold text-[0.62rem] uppercase tracking-[0.08em] text-ink3 border-b border-border whitespace-nowrap w-9"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((e) => (
              <tr key={e.id} className="group">
                <td className="px-2.5 py-[7px] border-b border-border align-top bg-[rgba(212,168,67,0.03)] group-hover:bg-[rgba(212,168,67,0.07)]">
                  <div className="font-semibold text-ink whitespace-nowrap text-[0.78rem]">{e.name}</div>
                  <div className="text-[0.65rem] text-ink3 max-w-[280px] overflow-hidden text-ellipsis whitespace-nowrap" title={e.desc}>
                    {e.desc}
                  </div>
                </td>
                <td className="px-2.5 py-[7px] border-b border-border align-top whitespace-nowrap bg-[rgba(212,168,67,0.03)] group-hover:bg-[rgba(212,168,67,0.07)]">
                  {e.date}
                  <br />
                  <span className="text-[0.68rem] text-ink3">{e.time}</span>
                </td>
                <td className="px-2.5 py-[7px] border-b border-border align-top bg-[rgba(212,168,67,0.03)] group-hover:bg-[rgba(212,168,67,0.07)]">{e.venue}</td>
                <td className="px-2.5 py-[7px] border-b border-border align-top bg-[rgba(212,168,67,0.03)] group-hover:bg-[rgba(212,168,67,0.07)]">
                  <span className="inline-block px-1.5 py-0.5 rounded-md text-[0.6rem] font-semibold bg-surface3 text-ink2 whitespace-nowrap tracking-[0.02em]">
                    {e.zone}
                  </span>
                </td>
                <td className="px-2.5 py-[7px] border-b border-border align-top font-semibold whitespace-nowrap tabular-nums bg-[rgba(212,168,67,0.03)] group-hover:bg-[rgba(212,168,67,0.07)]">
                  {fmtPrice(e.pLo, e.pHi)}
                </td>
                <td className="px-2.5 py-[7px] border-b border-border align-top bg-[rgba(212,168,67,0.03)] group-hover:bg-[rgba(212,168,67,0.07)]">
                  <span className={roundTagClasses(e.rt)}>{e.rt}</span>
                </td>
                <td className="px-2.5 py-[7px] border-b border-border align-top text-center bg-[rgba(212,168,67,0.03)] group-hover:bg-[rgba(212,168,67,0.07)]">
                  <ScorePill
                    agg={e.agg}
                    rSig={e.rSig}
                    rExp={e.rExp}
                    rStar={e.rStar}
                    rUniq={e.rUniq}
                    rDem={e.rDem}
                  />
                </td>
                <td className="px-2.5 py-[7px] border-b border-border align-top text-center bg-[rgba(212,168,67,0.03)] group-hover:bg-[rgba(212,168,67,0.07)]">
                  <button
                    className="size-7 border-none bg-transparent cursor-pointer p-0.5 rounded-md transition-all duration-100 flex items-center justify-center hover:bg-gold-dim"
                    onClick={() => onToggleBookmark(e.id)}
                    title="Remove bookmark"
                  >
                    <Bookmark size={20} className="transition-all duration-100" fill="var(--gold)" stroke="var(--gold)" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
