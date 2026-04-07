import type { Session } from '@/types/session'
import { ScorePill } from './ScorePill'
import { fmtPrice } from '@/lib/format'
import { exportBookmarksCSV } from '@/lib/csv'
import { Bookmark } from 'lucide-react'

interface BookmarkSectionProps {
  sessions: Session[]
  bookmarks: Set<string>
  onToggleBookmark: (id: string) => void
  onClearAll: () => void
}

export function BookmarkSection({ sessions, bookmarks, onToggleBookmark, onClearAll }: BookmarkSectionProps) {
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
    <div className="bm-section">
      <div className="bm-section-head">
        <h2>
          <Bookmark size={16} fill="var(--gold)" stroke="var(--gold)" />
          Bookmarked <span className="count">{items.length}</span>
        </h2>
        <div className="bm-stats">
          <span>{fmtPrice(totLo, totHi)} est.</span>
          <span>{days.size} day{days.size !== 1 ? 's' : ''}</span>
          <span>{ns} non-soccer</span>
          <span>{sc} soccer</span>
          <span>Avg rating: {(totAgg / items.length).toFixed(1)}</span>
        </div>
      </div>
      <div className="bm-actions">
        <button className="bm-action-btn" onClick={() => exportBookmarksCSV(items)}>Export CSV</button>
        <button className="bm-action-btn bm-action-clear" onClick={onClearAll}>Clear All</button>
      </div>
      <div className="tbl-wrap">
        <table>
          <thead>
            <tr>
              <th>Event</th>
              <th>Date</th>
              <th>Venue</th>
              <th>Zone</th>
              <th>Price</th>
              <th>Round</th>
              <th title="Aggregate rating">Rating</th>
              <th style={{ width: 36 }}></th>
            </tr>
          </thead>
          <tbody>
            {items.map((e) => (
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
                    title="Remove bookmark"
                  >
                    <Bookmark size={20} className="bm-on" fill="var(--gold)" stroke="var(--gold)" />
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
