import { useWindowVirtualizer } from '@tanstack/react-virtual'
import { Bookmark } from 'lucide-react'
import { useLayoutEffect, useMemo, useRef, useState } from 'react'

import { cn } from '@/lib/cn'
import { fmtPrice } from '@/lib/format'
import { roundTagClasses } from '@/lib/tw'
import type { Session, SortColumn, SortState, GroupBy } from '@/types/session'

import { ScorePill } from './ScorePill'

interface SessionTableProps {
  sessions: Session[]
  sort: SortState
  onSort: (col: SortColumn) => void
  isBookmarked: (id: string) => boolean
  onToggleBookmark: (id: string) => void
  groupBy: GroupBy
}

const thBase =
  'text-left px-2.5 py-2 bg-surface2 font-semibold text-[0.62rem] uppercase tracking-[0.08em] text-ink3 border-b border-border whitespace-nowrap cursor-pointer select-none transition-colors duration-100 hover:text-gold'

function SortHeader({
  label,
  col,
  sort,
  onSort,
  title,
}: {
  label: string
  col: SortColumn
  sort: SortState
  onSort: (col: SortColumn) => void
  title?: string
}) {
  const active = sort.col === col
  return (
    <th data-col={col} onClick={() => onSort(col)} title={title} className={thBase}>
      {label}
      {active && (
        <span className="text-[0.55rem] text-gold ml-0.5">
          {sort.dir === 'asc' ? '\u25B2' : '\u25BC'}
        </span>
      )}
    </th>
  )
}

function groupLabel(key: GroupBy): string {
  if (key === 'sport') return 'Sport'
  if (key === 'rt') return 'Round'
  if (key === 'date') return 'Date'
  return 'Zone'
}

function getGroupValue(session: Session, key: GroupBy): string {
  if (key === 'sport') return session.sport
  if (key === 'rt') return session.rt
  if (key === 'zone') return session.zone
  if (key === 'date') return session.date
  return ''
}

function groupSessions(
  sessions: Session[],
  key: GroupBy,
): { label: string; sessions: Session[] }[] {
  if (!key) return [{ label: '', sessions }]

  const groups = new Map<string, Session[]>()
  for (const s of sessions) {
    const val = getGroupValue(s, key)
    const list = groups.get(val)
    if (list) list.push(s)
    else groups.set(val, [s])
  }

  return Array.from(groups.entries()).map(([label, items]) => ({ label, sessions: items }))
}

function SessionRow({
  e,
  on,
  onToggleBookmark,
}: {
  e: Session
  on: boolean
  onToggleBookmark: (id: string) => void
}) {
  return (
    <tr className="group">
      <td className="px-2.5 py-[7px] border-b border-border align-top group-hover:bg-surface2">
        <div className="font-semibold text-ink whitespace-nowrap text-[0.78rem]">{e.name}</div>
        <div className="text-[0.65rem] text-ink3 max-w-[280px] overflow-hidden text-ellipsis whitespace-nowrap" title={e.desc}>
          {e.desc}
        </div>
      </td>
      <td className="px-2.5 py-[7px] border-b border-border align-top whitespace-nowrap group-hover:bg-surface2">
        {e.date}
        <br />
        <span className="text-[0.68rem] text-ink3">{e.time}</span>
      </td>
      <td className="px-2.5 py-[7px] border-b border-border align-top group-hover:bg-surface2">{e.venue}</td>
      <td className="px-2.5 py-[7px] border-b border-border align-top group-hover:bg-surface2">
        <span className="inline-block px-1.5 py-0.5 rounded-md text-[0.6rem] font-semibold bg-surface3 text-ink2 whitespace-nowrap tracking-[0.02em]">
          {e.zone}
        </span>
      </td>
      <td className="px-2.5 py-[7px] border-b border-border align-top font-semibold whitespace-nowrap tabular-nums group-hover:bg-surface2">
        {fmtPrice(e.pLo, e.pHi)}
      </td>
      <td className="px-2.5 py-[7px] border-b border-border align-top group-hover:bg-surface2">
        <span className={roundTagClasses(e.rt)}>{e.rt}</span>
      </td>
      <td className="px-2.5 py-[7px] border-b border-border align-top text-center group-hover:bg-surface2">
        <ScorePill
          agg={e.agg}
          rSig={e.rSig}
          rExp={e.rExp}
          rStar={e.rStar}
          rUniq={e.rUniq}
          rDem={e.rDem}
        />
      </td>
      <td className="px-2.5 py-[7px] border-b border-border align-top text-center group-hover:bg-surface2">
        <button
          className="size-7 border-none bg-transparent cursor-pointer p-0.5 rounded-md transition-all duration-100 flex items-center justify-center hover:bg-gold-dim [&:hover_.bm-off]:stroke-gold"
          onClick={() => onToggleBookmark(e.id)}
          title={on ? 'Remove bookmark' : 'Bookmark'}
        >
          <Bookmark
            size={20}
            className={cn('transition-all duration-100', on ? 'bm-on' : 'bm-off')}
            fill={on ? 'var(--gold)' : 'none'}
            stroke={on ? 'var(--gold)' : 'var(--ink3)'}
          />
        </button>
      </td>
    </tr>
  )
}

export function SessionTable({
  sessions,
  sort,
  onSort,
  isBookmarked,
  onToggleBookmark,
  groupBy,
}: SessionTableProps) {
  const listRef = useRef<HTMLTableRowElement | null>(null)
  const [scrollMargin, setScrollMargin] = useState(0)

  const items = useMemo(() => {
    const groups = groupSessions(sessions, groupBy)
    return groups.flatMap((g) => {
      if (!groupBy) return g.sessions.map((s) => ({ type: 'session' as const, session: s }))
      return [
        { type: 'group' as const, label: g.label, count: g.sessions.length },
        ...g.sessions.map((s) => ({ type: 'session' as const, session: s })),
      ]
    })
  }, [sessions, groupBy])

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
  }, [items.length, groupBy, sessions.length])

  const rowVirtualizer = useWindowVirtualizer({
    count: items.length,
    estimateSize: () => 52,
    overscan: 12,
    scrollMargin,
    enabled: items.length > 0,
  })

  const virtualRows = rowVirtualizer.getVirtualItems()
  const totalSize = rowVirtualizer.getTotalSize()
  const paddingTop = virtualRows.length > 0 ? Math.max(0, virtualRows[0].start - scrollMargin) : 0
  const lastVirtual = virtualRows[virtualRows.length - 1]
  const paddingBottom =
    virtualRows.length > 0 ? Math.max(0, totalSize - (lastVirtual.end - scrollMargin)) : 0

  return (
    <div className="overflow-x-auto border border-border rounded-lg bg-surface">
      <table className="w-full border-collapse text-[0.78rem]">
        <thead className="sticky top-0 z-2">
          <tr>
            <SortHeader label="Event" col="name" sort={sort} onSort={onSort} />
            <SortHeader label="Date" col="date" sort={sort} onSort={onSort} />
            <SortHeader label="Venue" col="venue" sort={sort} onSort={onSort} />
            <th className={thBase}>Zone</th>
            <SortHeader label="Price" col="pLo" sort={sort} onSort={onSort} />
            <th className={thBase}>Round</th>
            <SortHeader
              label="AI Rating"
              col="agg"
              sort={sort}
              onSort={onSort}
              title="AI-generated aggregate rating (prestige, value, atmosphere, uniqueness, star power, venue)"
            />
            <th className={cn(thBase, 'w-9')}></th>
          </tr>
        </thead>
        <tbody>
          {sessions.length === 0 && (
            <tr>
              <td colSpan={8} className="text-center py-12 px-4 text-ink3 text-[0.85rem] font-light">
                No sessions match your filters
              </td>
            </tr>
          )}
          {sessions.length > 0 && (
            <>
              <tr ref={listRef} className="vt-anchor" aria-hidden>
                <td colSpan={8} className="vt-anchor-cell" />
              </tr>
              {paddingTop > 0 && (
                <tr className="vt-spacer" aria-hidden>
                  <td colSpan={8} className="vt-spacer-cell" style={{ height: paddingTop }} />
                </tr>
              )}
              {virtualRows.map((vRow) => {
                const item = items[vRow.index]
                if (item.type === 'group') {
                  return (
                    <tr key={`group-${item.label}-${vRow.key}`}>
                      <td
                        colSpan={8}
                        className="bg-surface2 text-[0.72rem] font-semibold text-ink2 px-2.5 py-1.5 border-b border-border sticky top-[33px] z-1"
                      >
                        <span className="text-ink3 font-normal uppercase text-[0.6rem] tracking-[0.06em] mr-1">
                          {groupLabel(groupBy)}:
                        </span>{' '}
                        {item.label}
                        <span className="ml-1.5 text-[0.58rem] font-bold text-bg bg-ink3 px-[5px] py-px rounded-lg align-middle">
                          {item.count}
                        </span>
                      </td>
                    </tr>
                  )
                }
                const e = item.session
                return (
                  <SessionRow
                    key={`session-${e.id}-${vRow.key}`}
                    e={e}
                    on={isBookmarked(e.id)}
                    onToggleBookmark={onToggleBookmark}
                  />
                )
              })}
              {paddingBottom > 0 && (
                <tr className="vt-spacer" aria-hidden>
                  <td colSpan={8} className="vt-spacer-cell" style={{ height: paddingBottom }} />
                </tr>
              )}
            </>
          )}
        </tbody>
      </table>
    </div>
  )
}
