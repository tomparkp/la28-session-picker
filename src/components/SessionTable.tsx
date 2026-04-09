import { Bookmark, ChevronDown } from 'lucide-react'
import { type KeyboardEvent, useMemo, useState } from 'react'

import { getSessionInsights } from '@/lib/ai-scorecard'
import { cn } from '@/lib/cn'
import { fmtPrice, fmtTime } from '@/lib/format'
import { roundTagClasses, ratingClasses } from '@/lib/tw'
import type { GroupBy, Session, SortColumn, SortState } from '@/types/session'

import { ScorePill } from './ScorePill'

interface SessionTableProps {
  sessions: Session[]
  sort: SortState
  onSort: (col: SortColumn) => void
  isBookmarked: (id: string) => boolean
  onToggleBookmark: (id: string) => void
  groupBy: GroupBy
}

type SessionItem =
  | { type: 'group'; label: string; count: number }
  | { type: 'session'; session: Session }

const thBase =
  'text-left px-2.5 py-2 bg-surface2 font-semibold text-[0.62rem] uppercase tracking-[0.08em] text-ink3 border-b border-border whitespace-nowrap cursor-pointer select-none transition-colors duration-100 hover:text-gold'

const detailLabelClass = 'text-[0.64rem] font-semibold uppercase tracking-[0.08em] text-ink3'

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

function groupSessions(sessions: Session[], key: GroupBy): { label: string; sessions: Session[] }[] {
  if (!key) return [{ label: '', sessions }]

  const groups = new Map<string, Session[]>()
  for (const session of sessions) {
    const value = getGroupValue(session, key)
    const list = groups.get(value)
    if (list) list.push(session)
    else groups.set(value, [session])
  }

  return Array.from(groups.entries()).map(([label, items]) => ({ label, sessions: items }))
}

function SessionRow({
  session,
  expanded,
  onToggleExpand,
  bookmarked,
  onToggleBookmark,
}: {
  session: Session
  expanded: boolean
  onToggleExpand: (id: string) => void
  bookmarked: boolean
  onToggleBookmark: (id: string) => void
}) {
  const insights = useMemo(() => getSessionInsights(session), [session])
  const panelId = `session-panel-${session.id}`

  function handleRowActivate() {
    onToggleExpand(session.id)
  }

  function handleRowKeyDown(event: KeyboardEvent<HTMLTableRowElement>) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleRowActivate()
    }
  }

  return (
    <>
      <tr
        className="group cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-gold"
        onClick={handleRowActivate}
        onKeyDown={handleRowKeyDown}
        tabIndex={0}
        role="button"
        aria-expanded={expanded}
        aria-controls={panelId}
      >
        <td className="px-2.5 py-[7px] border-b border-border align-top group-hover:bg-surface2">
          <div className="flex w-full items-start gap-2 rounded-md p-0 text-left">
            <span
              className={cn(
                'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border border-border bg-surface2 text-ink3 transition-transform duration-150',
                expanded && 'rotate-180 text-gold',
              )}
            >
              <ChevronDown size={14} />
            </span>
            <span className="min-w-0">
              <span className="block font-semibold text-ink whitespace-nowrap text-[0.78rem]">
                {session.name}
              </span>
              <span
                className="block text-[0.65rem] text-ink3 max-w-[280px] overflow-hidden text-ellipsis whitespace-nowrap"
                title={session.desc}
              >
                {session.desc}
              </span>
            </span>
          </div>
        </td>
        <td className="px-2.5 py-[7px] border-b border-border align-top whitespace-nowrap group-hover:bg-surface2">
          {session.date}
          <br />
          <span className="text-[0.68rem] text-ink3">{fmtTime(session.time)}</span>
        </td>
        <td className="px-2.5 py-[7px] border-b border-border align-top group-hover:bg-surface2">
          {session.venue}
        </td>
        <td className="px-2.5 py-[7px] border-b border-border align-top group-hover:bg-surface2">
          <span className="inline-block px-1.5 py-0.5 rounded-md text-[0.6rem] font-semibold bg-surface3 text-ink2 whitespace-nowrap tracking-[0.02em]">
            {session.zone}
          </span>
        </td>
        <td className="px-2.5 py-[7px] border-b border-border align-top font-semibold whitespace-nowrap tabular-nums group-hover:bg-surface2">
          {fmtPrice(session.pLo, session.pHi)}
        </td>
        <td className="px-2.5 py-[7px] border-b border-border align-top group-hover:bg-surface2">
          <span className={roundTagClasses(session.rt)}>{session.rt}</span>
        </td>
        <td className="px-2.5 py-[7px] border-b border-border align-top text-center group-hover:bg-surface2">
          <ScorePill
            agg={session.agg}
            rSig={session.rSig}
            rExp={session.rExp}
            rStar={session.rStar}
            rUniq={session.rUniq}
            rDem={session.rDem}
          />
        </td>
        <td className="px-2.5 py-[7px] border-b border-border align-top text-center group-hover:bg-surface2">
          <button
            type="button"
            className="size-7 border-none bg-transparent cursor-pointer p-0.5 rounded-md transition-all duration-100 flex items-center justify-center hover:bg-gold-dim [&:hover_.bm-off]:stroke-gold"
            onClick={(event) => {
              event.stopPropagation()
              onToggleBookmark(session.id)
            }}
            title={bookmarked ? 'Remove bookmark' : 'Bookmark'}
            aria-label={bookmarked ? `Remove ${session.name} bookmark` : `Bookmark ${session.name}`}
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
      <tr id={panelId} aria-hidden={!expanded}>
        <td colSpan={8} className={cn('bg-surface2 p-0', expanded ? 'border-b border-border' : 'border-none')}>
          {expanded && (
            <div className="space-y-4 px-4 py-4">
              <section className="rounded-xl border border-border bg-surface px-4 py-3">
                <div className={detailLabelClass}>Event Details</div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  <div>
                    <div className={detailLabelClass}>Sport</div>
                    <div className="mt-1 text-[0.84rem] text-ink">{session.sport}</div>
                  </div>
                  <div>
                    <div className={detailLabelClass}>Session</div>
                    <div className="mt-1 text-[0.84rem] text-ink">{session.desc}</div>
                  </div>
                  <div>
                    <div className={detailLabelClass}>Price Band</div>
                    <div className="mt-1 text-[0.84rem] text-ink">{fmtPrice(session.pLo, session.pHi)}</div>
                  </div>
                </div>
              </section>

              <section className="rounded-xl border border-border bg-surface px-4 py-3">
                <div className={detailLabelClass}>AI Summary</div>
                <p className="mt-2 text-[0.9rem] text-ink leading-6">{insights.summary}</p>
                <p className="mt-3 text-[0.82rem] text-ink2 leading-6">{insights.overallExplanation}</p>
              </section>

              <section className="rounded-xl border border-border bg-surface px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className={detailLabelClass}>AI Scorecard</div>
                    <div className="mt-1 text-[0.74rem] text-ink3">
                      Aggregate rating plus per-category rationale
                    </div>
                  </div>
                  <span className={ratingClasses(session.agg)}>{session.agg.toFixed(1)}</span>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-5">
                  {insights.dimensions.map((dimension) => (
                    <article
                      key={dimension.key}
                      className="rounded-lg border border-border bg-surface2/70 px-3 py-3 flex min-h-[180px] flex-col"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-[0.82rem] font-semibold text-ink">
                          {dimension.label}
                        </div>
                        <span className={ratingClasses(dimension.score)}>{dimension.score.toFixed(1)}</span>
                      </div>
                      <p className="mt-3 text-[0.78rem] leading-5 text-ink2">
                        {dimension.explanation}
                      </p>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          )}
        </td>
      </tr>
    </>
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
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null)

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

  function handleToggleExpand(id: string) {
    setExpandedSessionId((current) => (current === id ? null : id))
  }

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
              title="AI-generated aggregate rating (prestige, experience, star power, uniqueness, demand)"
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
          {sessions.length > 0 &&
            items.map((item) => {
              if (item.type === 'group') {
                return (
                  <tr key={`group-${item.label}`}>
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
                  expanded={expandedSessionId === item.session.id}
                  onToggleExpand={handleToggleExpand}
                  bookmarked={isBookmarked(item.session.id)}
                  onToggleBookmark={onToggleBookmark}
                />
              )
            })}
        </tbody>
      </table>
    </div>
  )
}
