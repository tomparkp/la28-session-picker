import { Bookmark, ChevronsRight, MapPin, UserRound, X } from 'lucide-react'
import { type PointerEvent as ReactPointerEvent, useEffect, useMemo, useRef, useState } from 'react'

import { cn } from '@/lib/cn'
import { getSessionInsights } from '@/lib/ai-scorecard'
import { fmtPrice, fmtTime } from '@/lib/format'
import { ratingClasses, roundTagClasses } from '@/lib/tw'
import type { Contender, Session } from '@/types/session'

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
  rSig:  { border: 'border-l-[#0085c7]', score: 'text-[#0085c7]' },
  rExp:  { border: 'border-l-[#f4c300]', score: 'text-[#dab200]' },
  rStar: { border: 'border-l-[#97928a]', score: 'text-ink2' },
  rUniq: { border: 'border-l-[#009f3d]', score: 'text-[#009f3d]' },
  rDem:  { border: 'border-l-[#df0024]', score: 'text-[#df0024]' },
}

function ContendersSection({ contenders }: { contenders: Contender[] }) {
  return (
    <div className="grid gap-2.5">
      {contenders.map((c) => (
        <div key={`${c.name}-${c.country}`} className="flex items-start gap-3">
          <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-surface3 text-ink3">
            <UserRound size={14} />
          </span>
          <div className="min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="text-[0.84rem] font-semibold text-ink">{c.name}</span>
              <span className="text-[0.6rem] font-bold uppercase tracking-[0.06em] text-accent">
                {c.country}
              </span>
            </div>
            <p className="mt-0.5 text-[0.76rem] leading-snug text-ink3">{c.note}</p>
          </div>
        </div>
      ))}
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

  const insights = useMemo(
    () => (displayed ? getSessionInsights(displayed) : null),
    [displayed],
  )

  useEffect(() => {
    if (!isOpen) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  useEffect(() => {
    if (!isOpen || !isMobile) return
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen, isMobile])

  function handleResizeStart(e: ReactPointerEvent) {
    if (isMobile) return
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

  return (
    <>
      {/* Backdrop (mobile only) */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/50 transition-opacity duration-200 md:hidden',
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={onClose}
        aria-hidden
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-label={displayed?.name}
        aria-hidden={!isOpen}
        style={isMobile ? undefined : { width }}
        className={cn(
          'fixed inset-y-0 right-0 z-50 border-l border-border bg-surface shadow-2xl transition-transform duration-200 ease-panel',
          'max-md:w-full max-md:border-l-0 md:max-w-full',
          isOpen ? 'translate-x-0' : 'translate-x-full',
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
        <div className="flex h-full flex-col overflow-y-auto overscroll-contain">
          {displayed && insights && (
            <>
              {/* ── Header zone ── */}
              <div className="shrink-0 px-5 pt-3 pb-5 max-md:px-4">
                {/* Toolbar row */}
                <div className="mb-3 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close panel"
                    className="flex size-10 items-center justify-center rounded-md text-ink3 transition-colors hover:bg-surface2 hover:text-ink md:size-9"
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
                      className="flex size-10 items-center justify-center rounded-md transition-all duration-100 hover:bg-gold-dim md:size-9"
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
                    <span className="rounded-lg bg-surface2 px-2 py-0.5 text-[0.62rem] font-semibold uppercase tracking-[0.06em] text-ink3">
                      {displayed.sport}
                    </span>
                  )}
                </div>

                {/* Title + rating */}
                <div className="mt-3 flex items-start justify-between gap-3">
                  <h2 className="font-display text-[1.35rem] font-semibold leading-tight text-ink">
                    {displayed.name}
                  </h2>
                  <span className={cn(ratingClasses(displayed.agg), 'shrink-0 text-[1rem] px-2.5 py-1 min-w-[42px] rounded-xl')}>
                    {displayed.agg.toFixed(1)}
                  </span>
                </div>
                <p className="mt-1 text-[0.82rem] leading-relaxed text-ink2">{displayed.desc}</p>

                {/* Metadata row */}
                <div className="mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[0.76rem] text-ink3">
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
                <div className="mt-2 text-[0.9rem] font-semibold tabular-nums text-ink">
                  {fmtPrice(displayed.pLo, displayed.pHi)}
                </div>
              </div>

              {/* ── Blurb ── */}
              <div className="px-5 pt-2 pb-5 max-md:px-4">
                <h3 className="text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-ink3">
                  Summary
                </h3>
                <div className="mt-2 space-y-3 text-[0.86rem] font-medium leading-snug text-ink">
                  {insights.summary.split('\n\n').map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>
              </div>

              {/* ── Scorecard dimensions ── */}
              <div className="px-5 pt-2 pb-5 max-md:px-4">
                <h3 className="text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-ink3">
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
                          <span className="text-[0.78rem] font-semibold text-ink">{dim.label}</span>
                          <span className={cn('text-[0.9rem] font-bold tabular-nums', colors?.score)}>
                            {dim.score.toFixed(1)}
                          </span>
                        </div>
                        <p className="mt-1.5 text-[0.72rem] leading-snug text-ink3">
                          {dim.explanation}
                        </p>
                      </div>
                    )
                  })}
                </div>

                <p className="mt-3 text-[0.78rem] leading-relaxed text-ink3">
                  {insights.overallExplanation}
                </p>
              </div>

              {/* ── Contenders ── */}
              {insights.contenders.length > 0 && (
                <div className="px-5 pt-2 pb-5 max-md:px-4">
                  <h3 className="text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-ink3">
                    Contenders to Watch
                  </h3>
                  <div className="mt-3">
                    <ContendersSection contenders={insights.contenders} />
                  </div>
                </div>
              )}

              {/* Bottom breathing room */}
              <div className="shrink-0 h-6" />
            </>
          )}
        </div>
      </div>
    </>
  )
}
