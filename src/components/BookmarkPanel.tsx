import { Bookmark, ChevronsRight, Download, Trash2, X } from 'lucide-react'
import { useMemo } from 'react'

import { exportBookmarksCSV } from '@/lib/csv'
import { fmtPrice } from '@/lib/format'
import { ratingClasses, roundTagClasses } from '@/lib/tw'
import type { Session } from '@/types/session'

import { SideDrawer } from './SideDrawer'

const DEFAULT_WIDTH = 520

interface BookmarkPanelProps {
  open: boolean
  onClose: () => void
  sessions: Session[]
  bookmarks: Set<string>
  onToggleBookmark: (id: string) => void
  onClearAll: () => void
  onSelectSession: (session: Session) => void
}

function BookmarkCard({
  session,
  onRemove,
  onSelect,
}: {
  session: Session
  onRemove: (id: string) => void
  onSelect: (session: Session) => void
}) {
  return (
    <article
      className="group border-border bg-surface2 hover:border-gold/30 cursor-pointer rounded-lg border px-3.5 py-3 transition-colors"
      onClick={() => onSelect(session)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect(session)
        }
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-ink text-[0.82rem] leading-tight font-semibold">{session.name}</div>
          <div
            className="text-ink3 mt-0.5 overflow-hidden text-[0.68rem] text-ellipsis whitespace-nowrap"
            title={session.desc}
          >
            {session.desc}
          </div>
        </div>
        <button
          type="button"
          className="hover:bg-red/10 flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md border-none bg-transparent p-0.5 transition-all duration-100"
          onClick={(e) => {
            e.stopPropagation()
            onRemove(session.id)
          }}
          title="Remove from saved"
          aria-label={`Remove ${session.name} from saved`}
        >
          <Bookmark size={16} fill="var(--gold)" stroke="var(--gold)" />
        </button>
      </div>

      <div className="text-ink2 mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.7rem]">
        <span className="whitespace-nowrap">{session.date}</span>
        <span className="whitespace-nowrap">{session.venue}</span>
        <span className="bg-surface3 text-ink3 inline-block rounded-md px-1.5 py-0.5 text-[0.58rem] font-semibold tracking-[0.02em] whitespace-nowrap">
          {session.zone}
        </span>
        <span className={roundTagClasses(session.rt)}>{session.rt}</span>
      </div>

      <div className="mt-2 flex items-center justify-between">
        <span className="text-ink text-[0.78rem] font-semibold tabular-nums">
          {fmtPrice(session.pLo, session.pHi)}
        </span>
        <span className={ratingClasses(session.agg)}>{session.agg.toFixed(1)}</span>
      </div>
    </article>
  )
}

export function BookmarkPanel({
  open,
  onClose,
  sessions,
  bookmarks,
  onToggleBookmark,
  onClearAll,
  onSelectSession,
}: BookmarkPanelProps) {
  const items = useMemo(
    () =>
      sessions
        .filter((s) => bookmarks.has(s.id))
        .sort((a, b) => a.dk.localeCompare(b.dk) || a.name.localeCompare(b.name)),
    [sessions, bookmarks],
  )

  return (
    <SideDrawer
      open={open}
      onClose={onClose}
      aria-label="Saved sessions"
      defaultWidth={DEFAULT_WIDTH}
    >
      <div className="px-5 py-3 max-md:px-4">
        <div className="mb-4 flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close panel"
            className="text-ink3 hover:bg-surface2 hover:text-ink flex size-10 items-center justify-center rounded-md transition-colors md:size-9"
          >
            <ChevronsRight size={18} className="hidden md:block" />
            <X size={20} className="md:hidden" />
          </button>
          <div className="ml-auto flex gap-1.5">
            {items.length > 0 && (
              <>
                <button
                  type="button"
                  className="border-border bg-surface2 text-ink2 hover:border-gold hover:text-gold flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1 text-[0.68rem] font-semibold transition-all duration-150"
                  onClick={() => exportBookmarksCSV(items)}
                >
                  <Download size={12} />
                  Export CSV
                </button>
                <button
                  type="button"
                  className="border-border bg-surface2 text-ink2 hover:border-red hover:text-red flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1 text-[0.68rem] font-semibold transition-all duration-150"
                  onClick={onClearAll}
                >
                  <Trash2 size={12} />
                  Clear All
                </button>
              </>
            )}
          </div>
        </div>

        <h2 className="text-ink flex items-center gap-2.5 text-[1.25rem] leading-tight font-semibold">
          <Bookmark size={20} fill="var(--gold)" stroke="var(--gold)" />
          Saved
          {items.length > 0 && (
            <span className="bg-gold text-bg inline-flex h-5 min-w-5 items-center justify-center rounded-[10px] px-1.5 font-sans text-[0.6rem] font-bold">
              {items.length}
            </span>
          )}
        </h2>

        {items.length === 0 ? (
          <div className="mt-12 text-center">
            <Bookmark size={32} className="text-ink3/40 mx-auto" />
            <p className="text-ink3 mt-3 text-[0.85rem] font-light">No sessions saved yet</p>
            <p className="text-ink3/70 mt-1 text-[0.72rem] font-light">
              Click the save icon on any session to add it here
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {items.map((session) => (
              <BookmarkCard
                key={session.id}
                session={session}
                onRemove={onToggleBookmark}
                onSelect={onSelectSession}
              />
            ))}
          </div>
        )}
      </div>
    </SideDrawer>
  )
}
