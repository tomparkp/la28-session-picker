import { Bookmark } from 'lucide-react'

import { fmtPrice } from '@/lib/format'
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
    <th
      data-col={col}
      onClick={() => onSort(col)}
      title={title}
      className={active ? (sort.dir === 'asc' ? 'sa' : 'sd') : ''}
    >
      {label}
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
    <tr>
      <td>
        <div className="en">{e.name}</div>
        <div className="ed" title={e.desc}>
          {e.desc}
        </div>
      </td>
      <td className="nw">
        {e.date}
        <br />
        <span className="ts">{e.time}</span>
      </td>
      <td>{e.venue}</td>
      <td>
        <span className="badge-zone">{e.zone}</span>
      </td>
      <td className="cp">{fmtPrice(e.pLo, e.pHi)}</td>
      <td>
        <span className={`rt rt-${e.rt}`}>{e.rt}</span>
      </td>
      <td className="ctr">
        <ScorePill
          agg={e.agg}
          rSig={e.rSig}
          rExp={e.rExp}
          rStar={e.rStar}
          rUniq={e.rUniq}
          rDem={e.rDem}
        />
      </td>
      <td className="ctr">
        <button
          className="bm"
          onClick={() => onToggleBookmark(e.id)}
          title={on ? 'Remove bookmark' : 'Bookmark'}
        >
          <Bookmark
            size={20}
            className={on ? 'bm-on' : 'bm-off'}
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
  const groups = groupSessions(sessions, groupBy)

  return (
    <div className="tbl-wrap">
      <table>
        <thead>
          <tr>
            <SortHeader label="Event" col="name" sort={sort} onSort={onSort} />
            <SortHeader label="Date" col="date" sort={sort} onSort={onSort} />
            <SortHeader label="Venue" col="venue" sort={sort} onSort={onSort} />
            <th>Zone</th>
            <SortHeader label="Price" col="pLo" sort={sort} onSort={onSort} />
            <th>Round</th>
            <SortHeader
              label="AI Rating"
              col="agg"
              sort={sort}
              onSort={onSort}
              title="AI-generated aggregate rating (prestige, value, atmosphere, uniqueness, star power, venue)"
            />
            <th style={{ width: 36 }}></th>
          </tr>
        </thead>
        <tbody>
          {sessions.length === 0 && (
            <tr>
              <td colSpan={8} className="empty-state">
                No sessions match your filters
              </td>
            </tr>
          )}
          {groups.map((group) => (
            <>
              {groupBy && (
                <tr key={`group-${group.label}`} className="group-header">
                  <td colSpan={8}>
                    <span className="group-label">{groupLabel(groupBy)}:</span> {group.label}
                    <span className="group-count">{group.sessions.length}</span>
                  </td>
                </tr>
              )}
              {group.sessions.map((e) => (
                <SessionRow
                  key={e.id}
                  e={e}
                  on={isBookmarked(e.id)}
                  onToggleBookmark={onToggleBookmark}
                />
              ))}
            </>
          ))}
        </tbody>
      </table>
    </div>
  )
}
