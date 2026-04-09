import { ChevronsRight } from 'lucide-react'
import { type PointerEvent as ReactPointerEvent, useEffect, useMemo, useRef, useState } from 'react'

import { cn } from '@/lib/cn'
import { getSessionInsights } from '@/lib/ai-scorecard'
import { fmtPrice } from '@/lib/format'
import { ratingClasses } from '@/lib/tw'
import type { Session } from '@/types/session'

const labelClass = 'text-[0.64rem] font-semibold uppercase tracking-[0.08em] text-ink3'

const DEFAULT_WIDTH = 576
const MIN_WIDTH = 360
const MAX_WIDTH = 900

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

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label={displayed?.name}
      aria-hidden={!isOpen}
      style={{ width }}
      className={cn(
        'fixed inset-y-0 right-0 z-50 max-w-full border-l border-border bg-surface shadow-2xl transition-transform duration-200 ease-panel',
        isOpen ? 'translate-x-0' : 'translate-x-full',
      )}
    >
      {/* Resize handle */}
      <div
        className="group/edge absolute inset-y-0 -left-1 z-20 w-2 cursor-col-resize"
        onPointerDown={handleResizeStart}
        onDoubleClick={handleResizeDoubleClick}
      >
        <div className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-transparent transition-colors group-hover/edge:bg-gold/40 group-active/edge:bg-gold/60" />
      </div>

      {/* Scrollable content */}
      <div className="h-full overflow-y-auto">
        {displayed && insights && (
          <div className="px-5 py-3">
            {/* Toolbar */}
            <div className="flex items-center gap-1 mb-4">
              <button
                type="button"
                onClick={onClose}
                aria-label="Collapse panel"
                className="flex size-7 items-center justify-center rounded-md text-ink3 transition-colors hover:bg-surface2 hover:text-ink"
              >
                <ChevronsRight size={16} />
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
                <div className={labelClass}>AI Summary</div>
                <p className="mt-2 text-[0.9rem] text-ink leading-6">{insights.summary}</p>
                <p className="mt-3 text-[0.82rem] text-ink2 leading-6">
                  {insights.overallExplanation}
                </p>
              </section>

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
  )
}
