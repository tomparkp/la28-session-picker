import { Bookmark } from 'lucide-react'
import { memo, type KeyboardEvent } from 'react'

import { useMediaQuery } from '@/hooks/useMediaQuery'
import { cn } from '@/lib/cn'
import { fmtPrice, fmtTime } from '@/lib/format'
import { roundTagClasses } from '@/lib/tw'
import type { Session, SortColumn, SortState } from '@/types/session'

import { ScorePill } from './ScorePill'

export interface SessionTableProps {
  sessions: Session[]
  sort: SortState
  onSort: (col: SortColumn) => void
  isBookmarked: (id: string) => boolean
  onToggleBookmark: (id: string) => void
  selectedSessionId: string | null
  onSelectSessionId: (sessionId: string) => void
}

const thBase =
  'text-left px-2.5 py-2 bg-surface2 font-semibold text-[0.62rem] uppercase tracking-[0.08em] text-ink3 border-b border-border whitespace-nowrap cursor-pointer select-none transition-colors duration-100 hover:text-gold'

const SortHeader = memo(function SortHeader({
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
        <span className="text-gold ml-0.5 text-[0.55rem]">
          {sort.dir === 'asc' ? '\u25B2' : '\u25BC'}
        </span>
      )}
    </th>
  )
})

const SessionCard = memo(function SessionCard({
  session,
  selected,
  onSelectId,
  bookmarked,
  onToggleBookmark,
}: {
  session: Session
  selected: boolean
  onSelectId: (id: string) => void
  bookmarked: boolean
  onToggleBookmark: (id: string) => void
}) {
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onSelectId(session.id)
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      data-session-item
      onClick={() => onSelectId(session.id)}
      onKeyDown={handleKeyDown}
      className={cn(
        'rounded-lg border border-border bg-surface p-3 transition-colors duration-100 active:bg-surface2',
        selected && 'border-gold bg-gold-dim',
      )}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-ink text-[0.84rem] leading-tight font-semibold">{session.name}</div>
          <div className="text-ink3 mt-0.5 line-clamp-1 text-[0.72rem]">{session.desc}</div>
        </div>
        <button
          type="button"
          className="hover:bg-gold-dim -mt-1 -mr-1 flex size-10 shrink-0 items-center justify-center rounded-md transition-all duration-100"
          onClick={(event) => {
            event.stopPropagation()
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

      <div className="text-ink2 mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.72rem]">
        <span className="whitespace-nowrap">
          {session.date} · {fmtTime(session.time)}
        </span>
        <span className="text-border">|</span>
        <span className="whitespace-nowrap">{session.venue}</span>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <span className="bg-surface3 text-ink2 inline-block rounded-md px-1.5 py-0.5 text-[0.6rem] font-semibold tracking-[0.02em] whitespace-nowrap">
          {session.zone}
        </span>
        <span className={roundTagClasses(session.rt)}>{session.rt}</span>
        <span className="text-ink text-[0.78rem] font-semibold tabular-nums">
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
}, areSessionEntryPropsEqual)

const SessionRow = memo(function SessionRow({
  session,
  selected,
  onSelectId,
  bookmarked,
  onToggleBookmark,
}: {
  session: Session
  selected: boolean
  onSelectId: (id: string) => void
  bookmarked: boolean
  onToggleBookmark: (id: string) => void
}) {
  function handleRowKeyDown(event: KeyboardEvent<HTMLTableRowElement>) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onSelectId(session.id)
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
      data-session-item
      onClick={() => onSelectId(session.id)}
      onKeyDown={handleRowKeyDown}
      tabIndex={0}
      role="button"
      aria-pressed={selected}
    >
      <td className={cellBase}>
        <div className="min-w-0">
          <span className="text-ink block text-[0.78rem] font-semibold whitespace-nowrap">
            {session.name}
          </span>
          <span
            className="text-ink3 block max-w-[280px] overflow-hidden text-[0.65rem] text-ellipsis whitespace-nowrap"
            title={session.desc}
          >
            {session.desc}
          </span>
        </div>
      </td>
      <td className={cn(cellBase, 'whitespace-nowrap')}>
        {session.date}
        <br />
        <span className="text-ink3 text-[0.68rem]">{fmtTime(session.time)}</span>
      </td>
      <td className={cellBase}>{session.venue}</td>
      <td className={cellBase}>
        <span className="bg-surface3 text-ink2 inline-block rounded-md px-1.5 py-0.5 text-[0.6rem] font-semibold tracking-[0.02em] whitespace-nowrap">
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
          className="hover:bg-gold-dim [&:hover_.bm-off]:stroke-gold flex size-7 cursor-pointer items-center justify-center rounded-md border-none bg-transparent p-0.5 transition-all duration-100"
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
}, areSessionEntryPropsEqual)

function areSessionEntryPropsEqual(
  prev: {
    session: Session
    selected: boolean
    bookmarked: boolean
  },
  next: {
    session: Session
    selected: boolean
    bookmarked: boolean
  },
) {
  return (
    prev.session === next.session &&
    prev.selected === next.selected &&
    prev.bookmarked === next.bookmarked
  )
}

export function SessionTable({
  sessions,
  sort,
  onSort,
  isBookmarked,
  onToggleBookmark,
  selectedSessionId,
  onSelectSessionId,
}: SessionTableProps) {
  const isMobile = useMediaQuery('(max-width: 767px)')

  const tableHeader = (
    <tr>
      <SortHeader label="Event" col="name" sort={sort} onSort={onSort} />
      <SortHeader label="Date" col="date" sort={sort} onSort={onSort} />
      <SortHeader label="Venue" col="venue" sort={sort} onSort={onSort} />
      <th className={thBase}>Zone</th>
      <th className={thBase}>Price</th>
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
  )

  return isMobile ? (
    <div className="space-y-2">
      {sessions.length === 0 ? (
        <div className="text-ink3 px-4 py-12 text-center text-[0.85rem] font-light">
          No sessions match your filters
        </div>
      ) : (
        sessions.map((session) => (
          <SessionCard
            key={session.id}
            session={session}
            selected={selectedSessionId === session.id}
            onSelectId={onSelectSessionId}
            bookmarked={isBookmarked(session.id)}
            onToggleBookmark={onToggleBookmark}
          />
        ))
      )}
    </div>
  ) : (
    <div className="border-border bg-surface overflow-x-auto overflow-y-hidden rounded-lg border">
      <table className="w-full border-collapse text-[0.78rem]">
        <thead>{tableHeader}</thead>
        <tbody>
          {sessions.length === 0 ? (
            <tr>
              <td
                colSpan={8}
                className="text-ink3 px-4 py-12 text-center text-[0.85rem] font-light"
              >
                No sessions match your filters
              </td>
            </tr>
          ) : (
            sessions.map((session) => (
              <SessionRow
                key={session.id}
                session={session}
                selected={selectedSessionId === session.id}
                onSelectId={onSelectSessionId}
                bookmarked={isBookmarked(session.id)}
                onToggleBookmark={onToggleBookmark}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
