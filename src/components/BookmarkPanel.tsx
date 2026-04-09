import { Bookmark, ChevronsRight, Download, Trash2, X } from 'lucide-react'
import { type PointerEvent as ReactPointerEvent, useEffect, useMemo, useRef, useState } from 'react'

import { cn } from '@/lib/cn'
import { exportBookmarksCSV } from '@/lib/csv'
import { fmtPrice } from '@/lib/format'
import { ratingClasses, roundTagClasses } from '@/lib/tw'
import type { Session } from '@/types/session'

const DEFAULT_WIDTH = 520
const MIN_WIDTH = 360
const MAX_WIDTH = 900
const MD_BREAKPOINT = 768

function useIsMobile() {
  const [mobile, setMobile] = useState(false)
  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MD_BREAKPOINT - 1}px)`)
    setMobile(mql.matches)
    function onChange(e: MediaQueryListEvent) {
      setMobile(e.matches)
    }
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])
  return mobile
}

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
      className="group rounded-lg border border-border bg-surface2 px-3.5 py-3 transition-colors hover:border-gold/30 cursor-pointer"
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
          <div className="font-semibold text-[0.82rem] text-ink leading-tight">{session.name}</div>
          <div className="text-[0.68rem] text-ink3 mt-0.5 overflow-hidden text-ellipsis whitespace-nowrap" title={session.desc}>
            {session.desc}
          </div>
        </div>
        <button
          type="button"
          className="shrink-0 size-7 border-none bg-transparent cursor-pointer p-0.5 rounded-md transition-all duration-100 flex items-center justify-center hover:bg-red/10"
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

      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.7rem] text-ink2">
        <span className="whitespace-nowrap">{session.date}</span>
        <span className="whitespace-nowrap">{session.venue}</span>
        <span className="inline-block px-1.5 py-0.5 rounded-md text-[0.58rem] font-semibold bg-surface3 text-ink3 whitespace-nowrap tracking-[0.02em]">
          {session.zone}
        </span>
        <span className={roundTagClasses(session.rt)}>{session.rt}</span>
      </div>

      <div className="mt-2 flex items-center justify-between">
        <span className="font-semibold text-[0.78rem] tabular-nums text-ink">
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
  const panelRef = useRef<HTMLDivElement>(null)
  const widthRef = useRef(DEFAULT_WIDTH)
  const [width, setWidth] = useState(DEFAULT_WIDTH)
  const isMobile = useIsMobile()

  const items = useMemo(
    () =>
      sessions
        .filter((s) => bookmarks.has(s.id))
        .sort((a, b) => a.dk.localeCompare(b.dk) || a.name.localeCompare(b.name)),
    [sessions, bookmarks],
  )

  useEffect(() => {
    if (!open) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  useEffect(() => {
    if (!open || !isMobile) return
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [open, isMobile])

  function handleResizeStart(e: ReactPointerEvent) {
    if (isMobile) return
    e.preventDefault()
    const startX = e.clientX
    const startWidth = widthRef.current

    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    if (panelRef.current) panelRef.current.style.transition = 'none'

    function onMove(ev: globalThis.PointerEvent) {
      const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth + (startX - ev.clientX)))
      widthRef.current = next
      if (panelRef.current) panelRef.current.style.width = `${next}px`
    }

    function onUp() {
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      if (panelRef.current) panelRef.current.style.transition = ''
      setWidth(widthRef.current)
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
    }

    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
  }

  function handleResizeDoubleClick() {
    widthRef.current = DEFAULT_WIDTH
    setWidth(DEFAULT_WIDTH)
  }

  return (
    <>
      {/* Backdrop (mobile only) */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/50 transition-opacity duration-200 md:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={onClose}
        aria-hidden
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-label="Saved sessions"
        aria-hidden={!open}
        style={isMobile ? undefined : { width }}
        className={cn(
          'fixed inset-y-0 right-0 z-50 border-l border-border bg-surface shadow-2xl transition-transform duration-200 ease-panel',
          'max-md:w-full max-md:border-l-0 md:max-w-full',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {/* Resize handle (desktop only) */}
        <div
          className="group/edge absolute inset-y-0 -left-1 z-20 w-2 cursor-col-resize max-md:hidden"
          onPointerDown={handleResizeStart}
          onDoubleClick={handleResizeDoubleClick}
        >
          <div className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-transparent transition-colors group-hover/edge:bg-gold/40 group-active/edge:bg-gold/60" />
        </div>

        {/* Scrollable content */}
        <div className="h-full overflow-y-auto overscroll-contain">
          <div className="px-5 py-3 max-md:px-4">
            <div className="flex items-center gap-2 mb-4">
              <button
                type="button"
                onClick={onClose}
                aria-label="Close panel"
                className="flex size-10 items-center justify-center rounded-md text-ink3 transition-colors hover:bg-surface2 hover:text-ink md:size-9"
              >
                <ChevronsRight size={18} className="hidden md:block" />
                <X size={20} className="md:hidden" />
              </button>
            <div className="ml-auto flex gap-1.5">
              {items.length > 0 && (
                <>
                  <button
                    type="button"
                    className="flex items-center gap-1.5 px-2.5 py-1 text-[0.68rem] font-semibold border border-border rounded-md bg-surface2 text-ink2 cursor-pointer transition-all duration-150 hover:border-gold hover:text-gold"
                    onClick={() => exportBookmarksCSV(items)}
                  >
                    <Download size={12} />
                    Export
                  </button>
                  <button
                    type="button"
                    className="flex items-center gap-1.5 px-2.5 py-1 text-[0.68rem] font-semibold border border-border rounded-md bg-surface2 text-ink2 cursor-pointer transition-all duration-150 hover:border-red hover:text-red"
                    onClick={onClearAll}
                  >
                    <Trash2 size={12} />
                    Clear All
                  </button>
                </>
              )}
            </div>
          </div>

          <h2 className="text-[1.25rem] font-semibold text-ink leading-tight flex items-center gap-2.5">
            <Bookmark size={20} fill="var(--gold)" stroke="var(--gold)" />
            Saved
            {items.length > 0 && (
              <span className="bg-gold text-bg font-sans text-[0.6rem] font-bold min-w-5 h-5 rounded-[10px] inline-flex items-center justify-center px-1.5">
                {items.length}
              </span>
            )}
          </h2>

          {items.length === 0 ? (
            <div className="mt-12 text-center">
              <Bookmark size={32} className="mx-auto text-ink3/40" />
              <p className="mt-3 text-[0.85rem] text-ink3 font-light">No sessions saved yet</p>
              <p className="mt-1 text-[0.72rem] text-ink3/70 font-light">
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
        </div>
      </div>
    </>
  )
}
