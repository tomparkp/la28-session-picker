import { Drawer } from '@base-ui/react/drawer'
import { Bookmark, ChevronsRight, ExternalLink, MapPin, UserRound, X } from 'lucide-react'
import { type PointerEvent as ReactPointerEvent, useEffect, useMemo, useRef, useState } from 'react'

import { getSessionInsights } from '@/lib/ai-scorecard'
import { cn } from '@/lib/cn'
import { fmtPrice, fmtTime } from '@/lib/format'
import { ratingClasses, roundTagClasses } from '@/lib/tw'
import type { Contender, ContentSource, Session } from '@/types/session'

const DEFAULT_WIDTH = 480
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

type ScoreKey = 'rSig' | 'rExp' | 'rStar' | 'rUniq' | 'rDem'

const ringColors: Record<ScoreKey, { border: string; score: string }> = {
  rSig: { border: 'border-l-[#0085c7]', score: 'text-[#0085c7]' },
  rExp: { border: 'border-l-[#f4c300]', score: 'text-[#dab200]' },
  rStar: { border: 'border-l-[#97928a]', score: 'text-ink2' },
  rUniq: { border: 'border-l-[#009f3d]', score: 'text-[#009f3d]' },
  rDem: { border: 'border-l-[#df0024]', score: 'text-[#df0024]' },
}

function PotentialContendersSection({ potentialContenders }: { potentialContenders: Contender[] }) {
  return (
    <div className="grid gap-2.5">
      {potentialContenders.map((c) => (
        <div key={`${c.name}-${c.country}`} className="flex items-start gap-3">
          <span className="bg-surface3 text-ink3 mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full">
            <UserRound size={14} />
          </span>
          <div className="min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="text-ink text-[0.84rem] font-semibold">{c.name}</span>
              <span className="text-accent text-[0.6rem] font-bold tracking-[0.06em] uppercase">
                {c.country}
              </span>
            </div>
            <p className="text-ink3 mt-0.5 text-[0.76rem] leading-snug">{c.note}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

function getSourceHost(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

function getSourceDate(source: ContentSource) {
  if (source.lastUpdated) return `Updated ${source.lastUpdated}`
  return source.date
}

function SourcesSection({ sources }: { sources: ContentSource[] }) {
  const visibleSources = sources.slice(0, 6)
  const extraCount = sources.length - visibleSources.length

  return (
    <div className="grid gap-2.5">
      {visibleSources.map((source) => {
        const sourceDate = getSourceDate(source)

        return (
          <a
            key={source.url}
            href={source.url}
            target="_blank"
            rel="noreferrer"
            className="group border-border bg-surface2 hover:bg-surface3 grid gap-1 rounded-md border px-3 py-2.5 transition-colors"
          >
            <span className="flex items-start justify-between gap-3">
              <span className="text-ink min-w-0 text-[0.78rem] leading-snug font-semibold">
                {source.title}
              </span>
              <ExternalLink
                size={13}
                className="text-ink3 group-hover:text-accent mt-0.5 shrink-0 transition-colors"
              />
            </span>
            <span className="text-ink3 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[0.68rem] font-medium">
              <span>{getSourceHost(source.url)}</span>
              {sourceDate && (
                <>
                  <span className="text-border2">·</span>
                  <span>{sourceDate}</span>
                </>
              )}
            </span>
          </a>
        )
      })}
      {extraCount > 0 && (
        <p className="text-ink3 text-[0.7rem] font-medium">
          {extraCount} more {extraCount === 1 ? 'source' : 'sources'} saved in the session data.
        </p>
      )}
    </div>
  )
}

export function SessionDetail({
  session,
  onClose,
  isBookmarked,
  onToggleBookmark,
}: {
  session: Session | null
  onClose: () => void
  isBookmarked?: (id: string) => boolean
  onToggleBookmark?: (id: string) => void
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  const widthRef = useRef(DEFAULT_WIDTH)
  const [width, setWidth] = useState(DEFAULT_WIDTH)
  const isMobile = useIsMobile()

  const lastSessionRef = useRef<Session | null>(null)
  if (session) lastSessionRef.current = session
  const displayed = session ?? lastSessionRef.current

  const isOpen = !!session

  const insights = useMemo(() => (displayed ? getSessionInsights(displayed) : null), [displayed])
  const contentSources = displayed?.contentMeta?.sources ?? []

  // Escape key dismissal (desktop only — Drawer handles it natively on mobile)
  useEffect(() => {
    if (!isOpen || isMobile) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isMobile, onClose])

  function handleResizeStart(e: ReactPointerEvent) {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = widthRef.current

    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    if (panelRef.current) panelRef.current.style.transition = 'none'

    function onMove(e: globalThis.PointerEvent) {
      const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth + (startX - e.clientX)))
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

  const panelContent =
    displayed && insights ? (
      <>
        {/* ── Header zone ── */}
        <div className="shrink-0 px-5 pt-3 pb-5 max-md:px-4">
          {/* Toolbar row */}
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              aria-label="Close panel"
              className="text-ink3 hover:bg-surface2 hover:text-ink flex size-10 items-center justify-center rounded-md transition-colors md:size-9"
            >
              <ChevronsRight size={18} className="hidden md:block" />
              <X size={20} className="md:hidden" />
            </button>

            {onToggleBookmark && isBookmarked && (
              <button
                type="button"
                onClick={() => onToggleBookmark(displayed.id)}
                title={isBookmarked(displayed.id) ? 'Remove from saved' : 'Save session'}
                aria-label={
                  isBookmarked(displayed.id)
                    ? `Remove ${displayed.name} from saved`
                    : `Save ${displayed.name}`
                }
                className="hover:bg-gold-dim flex size-10 items-center justify-center rounded-md transition-all duration-100 md:size-9"
              >
                <Bookmark
                  size={20}
                  className="transition-all duration-100"
                  fill={isBookmarked(displayed.id) ? 'var(--gold)' : 'none'}
                  stroke={isBookmarked(displayed.id) ? 'var(--gold)' : 'var(--ink3)'}
                />
              </button>
            )}
          </div>

          {/* Tags row */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={roundTagClasses(displayed.rt)}>{displayed.rt}</span>
            {displayed.sport && (
              <span className="bg-surface2 text-ink3 rounded-lg px-2 py-0.5 text-[0.62rem] font-semibold tracking-[0.06em] uppercase">
                {displayed.sport}
              </span>
            )}
          </div>

          {/* Title + rating */}
          <div className="mt-3 flex items-start justify-between gap-3">
            <h2 className="font-display text-ink text-[1.35rem] leading-tight font-semibold">
              {displayed.name}
            </h2>
            <span
              className={cn(
                ratingClasses(displayed.agg),
                'shrink-0 text-[1rem] px-2.5 py-1 min-w-[42px] rounded-xl',
              )}
            >
              {displayed.agg.toFixed(1)}
            </span>
          </div>
          <p className="text-ink2 mt-1 text-[0.82rem] leading-relaxed">{displayed.desc}</p>

          {/* Metadata row */}
          <div className="text-ink3 mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[0.76rem]">
            <span>{displayed.date}</span>
            <span className="text-border2">·</span>
            <span>{fmtTime(displayed.time)}</span>
            <span className="text-border2">·</span>
            <span className="inline-flex items-center gap-1">
              <MapPin size={12} className="shrink-0" />
              {displayed.venue}
            </span>
          </div>

          {/* Price */}
          <div className="text-ink mt-2 text-[0.9rem] font-semibold tabular-nums">
            {fmtPrice(displayed.pLo, displayed.pHi)}
          </div>
        </div>

        {/* ── Blurb ── */}
        <div className="px-5 pt-2 pb-5 max-md:px-4">
          <h3 className="text-ink3 text-[0.68rem] font-semibold tracking-[0.08em] uppercase">
            Summary
          </h3>
          <div className="text-ink mt-2 space-y-3 text-[0.86rem] leading-relaxed font-medium">
            {insights.summary.split('\n\n').map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        </div>

        {/* ── Scorecard dimensions ── */}
        <div className="px-5 pt-2 pb-5 max-md:px-4">
          <h3 className="text-ink3 text-[0.68rem] font-semibold tracking-[0.08em] uppercase">
            Scorecard
          </h3>

          <div className="mt-3 grid grid-cols-2 gap-2.5 max-sm:grid-cols-1">
            {insights.dimensions.map((dim) => {
              const colors = ringColors[dim.key as ScoreKey]
              return (
                <div
                  key={dim.key}
                  className={cn(
                    'rounded-lg border border-border bg-surface2 border-l-[3px] px-3.5 py-3',
                    colors?.border,
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-ink text-[0.78rem] font-semibold">{dim.label}</span>
                    <span className={cn('text-[0.9rem] font-bold tabular-nums', colors?.score)}>
                      {dim.score.toFixed(1)}
                    </span>
                  </div>
                  <p className="text-ink3 mt-1.5 text-[0.72rem] leading-normal">
                    {dim.explanation}
                  </p>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Potential Contenders ── */}
        {insights.potentialContenders.length > 0 && (
          <div className="px-5 pt-2 pb-5 max-md:px-4">
            <h3 className="text-ink3 text-[0.68rem] font-semibold tracking-[0.08em] uppercase">
              Potential Contenders
            </h3>
            <div className="mt-3">
              <PotentialContendersSection potentialContenders={insights.potentialContenders} />
            </div>
          </div>
        )}

        {/* Sources */}
        {contentSources.length > 0 && (
          <div className="px-5 pt-2 pb-5 max-md:px-4">
            <h3 className="text-ink3 text-[0.68rem] font-semibold tracking-[0.08em] uppercase">
              Sources
            </h3>
            <div className="mt-3">
              <SourcesSection sources={contentSources} />
            </div>
          </div>
        )}

        {/* Bottom breathing room */}
        <div className="h-6 shrink-0" />
      </>
    ) : null

  // Mobile: delegate entirely to Base UI Drawer — swipe, scroll reset, body lock,
  // and backdrop are all handled by the primitive.
  if (isMobile) {
    return (
      <Drawer.Root
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) onClose()
        }}
        swipeDirection="right"
      >
        <Drawer.Portal>
          <Drawer.Backdrop className="fixed inset-0 z-40 bg-black/50 transition-opacity duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0 data-[swiping]:transition-none" />
          <Drawer.Viewport className="fixed inset-0 z-50 flex items-stretch justify-end">
            <Drawer.Popup
              data-session-detail-panel
              className={cn(
                'h-full w-full bg-surface shadow-2xl',
                'overflow-y-auto overscroll-contain touch-auto',
                '[transform:translateX(var(--drawer-swipe-movement-x))]',
                'transition-transform duration-200 ease-panel data-[swiping]:transition-none',
                'data-[starting-style]:[transform:translateX(100%)] data-[ending-style]:[transform:translateX(100%)]',
              )}
            >
              {/* Drag handle pill */}
              <div className="flex justify-center pt-2.5 pb-1" aria-hidden>
                <div className="bg-border2 h-1 w-10 rounded-full" />
              </div>
              {panelContent}
            </Drawer.Popup>
          </Drawer.Viewport>
        </Drawer.Portal>
      </Drawer.Root>
    )
  }

  // Desktop: resizable fixed side panel
  return (
    <div
      ref={panelRef}
      role="dialog"
      data-session-detail-panel
      aria-label={displayed?.name}
      aria-hidden={!isOpen}
      style={{ width }}
      className={cn(
        'fixed inset-y-0 right-0 z-50 border-l border-border bg-surface shadow-2xl transition-transform duration-200 ease-panel',
        'max-w-full',
        isOpen ? 'translate-x-0' : 'translate-x-full',
      )}
    >
      {/* Resize handle */}
      <div
        className="group/edge absolute inset-y-0 -left-1 z-20 w-2 cursor-col-resize"
        onPointerDown={handleResizeStart}
        onDoubleClick={handleResizeDoubleClick}
      >
        <div className="group-hover/edge:bg-gold/40 group-active/edge:bg-gold/60 absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-transparent transition-colors" />
      </div>

      {/* Scrollable content */}
      <div className="flex h-full flex-col overflow-y-auto overscroll-contain">{panelContent}</div>
    </div>
  )
}
