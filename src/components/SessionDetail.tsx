import { ChevronsRight, UserRound, X } from 'lucide-react'
import { type PointerEvent as ReactPointerEvent, useEffect, useMemo, useRef, useState } from 'react'

import { cn } from '@/lib/cn'
import { getSessionInsights } from '@/lib/ai-scorecard'
import { fmtPrice } from '@/lib/format'
import { ratingClasses } from '@/lib/tw'
import type { Contender, Session } from '@/types/session'

const labelClass = 'text-[0.64rem] font-semibold uppercase tracking-[0.08em] text-ink3'

const DEFAULT_WIDTH = 576
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

function ContendersSection({ contenders }: { contenders: Contender[] }) {
  return (
    <section className="rounded-xl border border-border bg-surface2 px-4 py-3">
      <div className={labelClass}>Contenders to Watch</div>
      <div className="mt-3 grid gap-2">
        {contenders.map((c) => (
          <div
            key={`${c.name}-${c.country}`}
            className="flex items-start gap-3 rounded-lg border border-border bg-surface px-3 py-2.5"
          >
            <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-surface3 text-ink3">
              <UserRound size={14} />
            </span>
            <div className="min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-[0.84rem] font-semibold text-ink">{c.name}</span>
                <span className="text-[0.62rem] font-bold uppercase tracking-[0.06em] text-accent">
                  {c.country}
                </span>
              </div>
              <p className="mt-0.5 text-[0.76rem] leading-snug text-ink2">{c.note}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export function SessionDetail({
  session,
  onClose,
}: {
  session: Session | null
  onClose: () => void
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
        <div className="h-full overflow-y-auto overscroll-contain">
          {displayed && insights && (
            <div className="px-5 py-3 max-md:px-4">
              {/* Toolbar */}
              <div className="flex items-center gap-1 mb-4">
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close panel"
                  className="flex size-10 items-center justify-center rounded-md text-ink3 transition-colors hover:bg-surface2 hover:text-ink md:size-9"
                >
                  <ChevronsRight size={18} className="hidden md:block" />
                  <X size={20} className="md:hidden" />
                </button>
              </div>

            {/* Title */}
            <h2 className="text-[1.25rem] font-semibold text-ink leading-tight">
              {displayed.name}
            </h2>
            <p className="mt-1 text-[0.78rem] text-ink3">{displayed.desc}</p>

            <div className="mt-5 space-y-4">
              <section className="rounded-xl border border-border bg-surface2 px-4 py-3">
                <div className={labelClass}>Event Details</div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <div className={labelClass}>Sport</div>
                    <div className="mt-1 text-[0.84rem] text-ink">{displayed.sport}</div>
                  </div>
                  <div>
                    <div className={labelClass}>Session</div>
                    <div className="mt-1 text-[0.84rem] text-ink">{displayed.desc}</div>
                  </div>
                  <div>
                    <div className={labelClass}>Price Band</div>
                    <div className="mt-1 text-[0.84rem] text-ink">
                      {fmtPrice(displayed.pLo, displayed.pHi)}
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-xl border border-border bg-surface2 px-4 py-3">
                <div className={labelClass}>Why This Session</div>
                <p className="mt-2 text-[0.9rem] text-ink leading-6">{insights.summary}</p>
                <p className="mt-3 text-[0.82rem] text-ink2 leading-6">
                  {insights.overallExplanation}
                </p>
              </section>

              {insights.contenders.length > 0 && (
                <ContendersSection contenders={insights.contenders} />
              )}

              <section className="rounded-xl border border-border bg-surface2 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className={labelClass}>AI Scorecard</div>
                    <div className="mt-1 text-[0.74rem] text-ink3">
                      Aggregate rating plus per-category rationale
                    </div>
                  </div>
                  <span className={ratingClasses(displayed.agg)}>{displayed.agg.toFixed(1)}</span>
                </div>

                <div className="mt-4 grid gap-3">
                  {insights.dimensions.map((dim) => (
                    <article
                      key={dim.key}
                      className="rounded-lg border border-border bg-surface px-3 py-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-[0.82rem] font-semibold text-ink">{dim.label}</div>
                        <span className={ratingClasses(dim.score)}>{dim.score.toFixed(1)}</span>
                      </div>
                      <p className="mt-2 text-[0.78rem] leading-5 text-ink2">
                        {dim.explanation}
                      </p>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  )
}
