import type { Session, SortColumn, SortState } from '@/types/session'
import { ScorePill } from './ScorePill'
import { fmtPrice } from '@/lib/format'
import { Bookmark } from 'lucide-react'

interface SessionTableProps {
  sessions: Session[]
  sort: SortState
  onSort: (col: SortColumn) => void
  isBookmarked: (id: string) => boolean
  onToggleBookmark: (id: string) => void
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

export function SessionTable({ sessions, sort, onSort, isBookmarked, onToggleBookmark }: SessionTableProps) {
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
              label="Rating"
              col="agg"
              sort={sort}
              onSort={onSort}
              title="Aggregate rating (prestige, value, atmosphere, uniqueness, star power, venue)"
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
          {sessions.map((e) => {
            const on = isBookmarked(e.id)
            return (
              <tr key={e.id}>
                <td>
                  <div className="en">{e.name}</div>
                  <div className="ed" title={e.desc}>{e.desc}</div>
                </td>
                <td className="nw">
                  {e.date}<br />
                  <span className="ts">{e.time}</span>
                </td>
                <td>{e.venue}</td>
                <td><span className="badge-zone">{e.zone}</span></td>
                <td className="cp">{fmtPrice(e.pLo, e.pHi)}</td>
                <td><span className={`rt rt-${e.rt}`}>{e.rt}</span></td>
                <td className="ctr">
                  <ScorePill agg={e.agg} rP={e.rP} rV={e.rV} rA={e.rA} rU={e.rU} rS={e.rS} rVn={e.rVn} />
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
          })}
        </tbody>
      </table>
    </div>
  )
}
