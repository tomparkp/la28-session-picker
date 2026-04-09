import { useVirtualizer } from '@tanstack/react-virtual'
import { Bookmark } from 'lucide-react'
import { type KeyboardEvent, useCallback, useMemo, useRef } from 'react'

import { cn } from '@/lib/cn'
import { fmtPrice, fmtTime } from '@/lib/format'
import { roundTagClasses } from '@/lib/tw'
import type { GroupBy, Session, SortColumn, SortState } from '@/types/session'

import { ScorePill } from './ScorePill'

export interface SessionTableProps {
  sessions: Session[]
  sort: SortState
  onSort: (col: SortColumn) => void
  isBookmarked: (id: string) => boolean
  onToggleBookmark: (id: string) => void
  groupBy: GroupBy
  selectedSessionId: string | null
  onSelectSession: (session: Session) => void
}

type SessionItem =
  | { type: 'group'; label: string; count: number }
  | { type: 'session'; session: Session }

const DESKTOP_ROW_HEIGHT = 50
const DESKTOP_GROUP_HEIGHT = 33
const MOBILE_CARD_HEIGHT = 140
const MOBILE_GROUP_HEIGHT = 36

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
  if (key === 'sport') return session.sport || 'Other'
  if (key === 'rt') return session.rt
  if (key === 'zone') return session.zone
  if (key === 'date') return session.date
  return ''
}

function groupSessions(sessions: Session[], key: GroupBy): { label: string; sessions: Session[] }[] {
  if (!key) return [{ label: '', sessions }]

  const groups = new Map<string, { sortKey: string; sessions: Session[] }>()
  for (const session of sessions) {
    const value = getGroupValue(session, key)
    const entry = groups.get(value)
    if (entry) entry.sessions.push(session)
    else groups.set(value, { sortKey: key === 'date' ? session.dk : value, sessions: [session] })
  }

  return Array.from(groups.entries())
    .sort((a, b) => a[1].sortKey.localeCompare(b[1].sortKey))
    .map(([label, { sessions: items }]) => ({ label, sessions: items }))
}

/* ─── Mobile card ─── */

function SessionCard({
  session,
  selected,
  onSelect,
  bookmarked,
  onToggleBookmark,
}: {
  session: Session
  selected: boolean
  onSelect: (session: Session) => void
  bookmarked: boolean
  onToggleBookmark: (id: string) => void
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      onClick={() => onSelect(session)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect(session)
        }
      }}
      className={cn(
        'rounded-lg border border-border bg-surface p-3 transition-colors duration-100 active:bg-surface2',
        selected && 'border-gold bg-gold-dim',
      )}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-ink text-[0.84rem] leading-tight">
            {session.name}
          </div>
          <div className="mt-0.5 text-[0.72rem] text-ink3 line-clamp-1">
            {session.desc}
          </div>
        </div>
        <button
          type="button"
          className="size-10 shrink-0 flex items-center justify-center rounded-md transition-all duration-100 hover:bg-gold-dim -mr-1 -mt-1"
          onClick={(e) => {
            e.stopPropagation()
            onToggleBookmark(session.id)
          }}
          title={bookmarked ? 'Remove from saved' : 'Save'}
          aria-label={bookmarked ? `Remove ${session.name} from saved` : `Save ${session.name}`}
        >
          <Bookmark
            size={20}
            className="transition-all duration-100"
            fill={bookmarked ? 'var(--gold)' : 'none'}
            stroke={bookmarked ? 'var(--gold)' : 'var(--ink3)'}
          />
        </button>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.72rem] text-ink2">
        <span className="whitespace-nowrap">{session.date} · {fmtTime(session.time)}</span>
        <span className="text-border">|</span>
        <span className="whitespace-nowrap">{session.venue}</span>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <span className="inline-block px-1.5 py-0.5 rounded-md text-[0.6rem] font-semibold bg-surface3 text-ink2 whitespace-nowrap tracking-[0.02em]">
          {session.zone}
        </span>
        <span className={roundTagClasses(session.rt)}>{session.rt}</span>
        <span className="font-semibold tabular-nums text-[0.78rem] text-ink">
          {fmtPrice(session.pLo, session.pHi)}
        </span>
        <span className="ml-auto">
          <ScorePill
            agg={session.agg}
            rSig={session.rSig}
            rExp={session.rExp}
            rStar={session.rStar}
            rUniq={session.rUniq}
            rDem={session.rDem}
          />
        </span>
      </div>
    </div>
  )
}

/* ─── Desktop table row ─── */

function SessionRow({
  session,
  selected,
  onSelect,
  bookmarked,
  onToggleBookmark,
}: {
  session: Session
  selected: boolean
  onSelect: (session: Session) => void
  bookmarked: boolean
  onToggleBookmark: (id: string) => void
}) {
  function handleRowKeyDown(event: KeyboardEvent<HTMLTableRowElement>) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onSelect(session)
    }
  }

  const cellBase = cn(
    'px-2.5 py-[7px] border-b border-border align-top transition-colors duration-100',
    selected ? 'bg-gold-dim' : 'group-hover:bg-surface2',
  )

  return (
    <tr
      className={cn(
        'group cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-gold',
        selected && 'bg-gold-dim',
      )}
      onClick={() => onSelect(session)}
      onKeyDown={handleRowKeyDown}
      tabIndex={0}
      role="button"
      aria-pressed={selected}
    >
      <td className={cellBase}>
        <div className="min-w-0">
          <span className="block font-semibold text-ink whitespace-nowrap text-[0.78rem]">
            {session.name}
          </span>
          <span
            className="block text-[0.65rem] text-ink3 max-w-[280px] overflow-hidden text-ellipsis whitespace-nowrap"
            title={session.desc}
          >
            {session.desc}
          </span>
        </div>
      </td>
      <td className={cn(cellBase, 'whitespace-nowrap')}>
        {session.date}
        <br />
        <span className="text-[0.68rem] text-ink3">{fmtTime(session.time)}</span>
      </td>
      <td className={cellBase}>{session.venue}</td>
      <td className={cellBase}>
        <span className="inline-block px-1.5 py-0.5 rounded-md text-[0.6rem] font-semibold bg-surface3 text-ink2 whitespace-nowrap tracking-[0.02em]">
          {session.zone}
        </span>
      </td>
      <td className={cn(cellBase, 'font-semibold whitespace-nowrap tabular-nums')}>
        {fmtPrice(session.pLo, session.pHi)}
      </td>
      <td className={cellBase}>
        <span className={roundTagClasses(session.rt)}>{session.rt}</span>
      </td>
      <td className={cn(cellBase, 'text-center')}>
        <ScorePill
          agg={session.agg}
          rSig={session.rSig}
          rExp={session.rExp}
          rStar={session.rStar}
          rUniq={session.rUniq}
          rDem={session.rDem}
        />
      </td>
      <td className={cn(cellBase, 'text-center')}>
        <button
          type="button"
          className="size-7 border-none bg-transparent cursor-pointer p-0.5 rounded-md transition-all duration-100 flex items-center justify-center hover:bg-gold-dim [&:hover_.bm-off]:stroke-gold"
          onClick={(event) => {
            event.stopPropagation()
            onToggleBookmark(session.id)
          }}
          title={bookmarked ? 'Remove from saved' : 'Save'}
          aria-label={bookmarked ? `Remove ${session.name} from saved` : `Save ${session.name}`}
        >
          <Bookmark
            size={20}
            className={cn('transition-all duration-100', bookmarked ? 'bm-on' : 'bm-off')}
            fill={bookmarked ? 'var(--gold)' : 'none'}
            stroke={bookmarked ? 'var(--gold)' : 'var(--ink3)'}
          />
        </button>
      </td>
    </tr>
  )
}

/* ─── Group divider (shared) ─── */

function GroupBanner({ groupBy, label, count }: { groupBy: GroupBy; label: string; count: number }) {
  return (
    <div className="bg-surface2 text-[0.72rem] font-semibold text-ink2 px-2.5 py-1.5 border-b border-border">
      <span className="text-ink3 font-normal uppercase text-[0.6rem] tracking-[0.06em] mr-1">
        {groupLabel(groupBy)}:
      </span>{' '}
      {label}
      <span className="ml-1.5 text-[0.58rem] font-bold text-bg bg-ink3 px-[5px] py-px rounded-lg align-middle">
        {count}
      </span>
    </div>
  )
}

/* ─── Main component ─── */

export function SessionTable({
  sessions,
  sort,
  onSort,
  isBookmarked,
  onToggleBookmark,
  groupBy,
  selectedSessionId,
  onSelectSession,
}: SessionTableProps) {
  const desktopScrollRef = useRef<HTMLDivElement>(null)
  const mobileScrollRef = useRef<HTMLDivElement>(null)

  const items = useMemo<SessionItem[]>(() => {
    const groups = groupSessions(sessions, groupBy)
    return groups.flatMap((group) => {
      if (!groupBy) return group.sessions.map((session) => ({ type: 'session' as const, session }))
      return [
        { type: 'group' as const, label: group.label, count: group.sessions.length },
        ...group.sessions.map((session) => ({ type: 'session' as const, session })),
      ]
    })
  }, [sessions, groupBy])

  const desktopEstimateSize = useCallback(
    (index: number) => (items[index].type === 'group' ? DESKTOP_GROUP_HEIGHT : DESKTOP_ROW_HEIGHT),
    [items],
  )

  const mobileEstimateSize = useCallback(
    (index: number) => (items[index].type === 'group' ? MOBILE_GROUP_HEIGHT : MOBILE_CARD_HEIGHT),
    [items],
  )

  const desktopVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => desktopScrollRef.current,
    estimateSize: desktopEstimateSize,
    overscan: 20,
  })

  const mobileVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => mobileScrollRef.current,
    estimateSize: mobileEstimateSize,
    overscan: 8,
  })

  const desktopVirtualItems = desktopVirtualizer.getVirtualItems()
  const mobileVirtualItems = mobileVirtualizer.getVirtualItems()

  const desktopPaddingTop = desktopVirtualItems[0]?.start ?? 0
  const desktopPaddingBottom =
    desktopVirtualItems.length > 0
      ? desktopVirtualizer.getTotalSize() - (desktopVirtualItems.at(-1)?.end ?? 0)
      : 0

  if (sessions.length === 0) {
    return (
      <>
        <div className="min-[540px]:hidden text-center py-12 px-4 text-ink3 text-[0.85rem] font-light">
          No sessions match your filters
        </div>
        <div className="hidden min-[540px]:block overflow-x-auto border border-border rounded-lg bg-surface">
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
                  title="AI-generated aggregate rating (prestige, experience, star power, uniqueness, demand)"
                />
                <th className={cn(thBase, 'w-9')}></th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={8} className="text-center py-12 px-4 text-ink3 text-[0.85rem] font-light">
                  No sessions match your filters
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </>
    )
  }

  return (
    <>
      {/* ─── Mobile card list (virtualized) ─── */}
      <div
        ref={mobileScrollRef}
        className="min-[540px]:hidden overflow-y-auto"
        style={{ maxHeight: 'calc(100dvh - 10rem)' }}
      >
        <div style={{ height: mobileVirtualizer.getTotalSize(), position: 'relative' }}>
          {mobileVirtualItems.map((virtualRow) => {
            const item = items[virtualRow.index]
            if (item.type === 'group') {
              return (
                <div
                  key={`group-${item.label}`}
                  data-index={virtualRow.index}
                  ref={mobileVirtualizer.measureElement}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <GroupBanner groupBy={groupBy} label={item.label} count={item.count} />
                </div>
              )
            }
            return (
              <div
                key={item.session.id}
                data-index={virtualRow.index}
                ref={mobileVirtualizer.measureElement}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  transform: `translateY(${virtualRow.start}px)`,
                  paddingBottom: 8,
                }}
              >
                <SessionCard
                  session={item.session}
                  selected={selectedSessionId === item.session.id}
                  onSelect={onSelectSession}
                  bookmarked={isBookmarked(item.session.id)}
                  onToggleBookmark={onToggleBookmark}
                />
              </div>
            )
          })}
        </div>
      </div>

      {/* ─── Desktop table (virtualized) ─── */}
      <div
        ref={desktopScrollRef}
        className="hidden min-[540px]:block overflow-auto border border-border rounded-lg bg-surface"
        style={{ maxHeight: 'calc(100dvh - 12rem)' }}
      >
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
                title="AI-generated aggregate rating (prestige, experience, star power, uniqueness, demand)"
              />
              <th className={cn(thBase, 'w-9')}></th>
            </tr>
          </thead>
          <tbody>
            {desktopPaddingTop > 0 && (
              <tr><td colSpan={8} style={{ height: desktopPaddingTop }} /></tr>
            )}
            {desktopVirtualItems.map((virtualRow) => {
              const item = items[virtualRow.index]
              if (item.type === 'group') {
                return (
                  <tr key={`group-${item.label}`} ref={desktopVirtualizer.measureElement} data-index={virtualRow.index}>
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

              return (
                <SessionRow
                  key={item.session.id}
                  session={item.session}
                  selected={selectedSessionId === item.session.id}
                  onSelect={onSelectSession}
                  bookmarked={isBookmarked(item.session.id)}
                  onToggleBookmark={onToggleBookmark}
                />
              )
            })}
            {desktopPaddingBottom > 0 && (
              <tr><td colSpan={8} style={{ height: desktopPaddingBottom }} /></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}
