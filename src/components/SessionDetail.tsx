import {
  Bookmark,
  ChevronsRight,
  ExternalLink,
  MapPin,
  Newspaper,
  UserRound,
  X,
} from 'lucide-react'
import { startTransition, useEffect, useMemo, useRef, useState } from 'react'

import { cn } from '@/lib/cn'
import { fmtPrice, fmtTime } from '@/lib/format'
import { ratingClasses, roundTagClasses } from '@/lib/tw'
import type { SessionInsights } from '@/lib/ai-scorecard'
import type { Contender, RelatedNews, Session } from '@/types/session'

import { SideDrawer } from './SideDrawer'

const DEFAULT_WIDTH = 480

type ScoreKey = 'rSig' | 'rExp' | 'rStar' | 'rUniq' | 'rDem'

const ringColors: Record<ScoreKey, { border: string; score: string }> = {
  rSig: { border: 'border-l-[#0085c7]', score: 'text-[#0085c7]' },
  rExp: { border: 'border-l-[#f4c300]', score: 'text-[#dab200]' },
  rStar: { border: 'border-l-[#97928a]', score: 'text-ink2' },
  rUniq: { border: 'border-l-[#009f3d]', score: 'text-[#009f3d]' },
  rDem: { border: 'border-l-[#df0024]', score: 'text-[#df0024]' },
}

const newsDateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

interface RelatedNewsItem {
  id: string
  title: string
  sourceName: string
  sourceUrl: string
  date?: string
  summary?: string
  tags?: string[]
}

function formatNewsDate(publishedDate: string) {
  const [year, month, day] = publishedDate.split('-').map(Number)
  if (!year || !month || !day) return publishedDate
  return newsDateFormatter.format(new Date(year, month - 1, day))
}

function fromCuratedNews(item: RelatedNews): RelatedNewsItem {
  return {
    id: `curated-${item.id}`,
    title: item.title,
    summary: item.summary,
    sourceName: item.sourceName,
    sourceUrl: item.sourceUrl,
    date: formatNewsDate(item.publishedDate),
    tags: item.tags,
  }
}

function PotentialContendersSection({
  potentialContenders,
  potentialContendersIntro,
}: {
  potentialContenders: Contender[]
  potentialContendersIntro?: string
}) {
  return (
    <div className="grid gap-3">
      {potentialContendersIntro && (
        <p className="text-ink2 text-[0.8rem] leading-relaxed font-medium">
          {potentialContendersIntro}
        </p>
      )}
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
    </div>
  )
}

function RelatedNewsSection({ items }: { items: RelatedNewsItem[] }) {
  return (
    <div className="grid gap-2.5">
      {items.map((item) => (
        <a
          key={item.id}
          href={item.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="group border-border bg-surface2 hover:bg-surface3 grid gap-2 rounded-md border px-3 py-2.5 transition-colors"
        >
          <span className="flex items-start gap-3">
            <span className="bg-surface3 text-accent mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md">
              <Newspaper size={14} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-start justify-between gap-3">
                <span className="text-ink min-w-0 text-[0.78rem] leading-snug font-semibold">
                  {item.title}
                </span>
                <ExternalLink
                  size={13}
                  className="text-ink3 group-hover:text-accent mt-0.5 shrink-0 transition-colors"
                />
              </span>
              {item.summary && (
                <span className="text-ink3 mt-1 block text-[0.72rem] leading-snug">
                  {item.summary}
                </span>
              )}
              <span className="text-ink3 mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[0.68rem] font-medium">
                <span>{item.sourceName}</span>
                {item.date && (
                  <>
                    <span className="text-border2">·</span>
                    <span>{item.date}</span>
                  </>
                )}
                {item.tags?.map((tag) => (
                  <span
                    key={tag}
                    className="bg-surface3 text-ink3 rounded-md px-1.5 py-0.5 text-[0.58rem] font-semibold tracking-normal normal-case"
                  >
                    {tag}
                  </span>
                ))}
              </span>
            </span>
          </span>
        </a>
      ))}
    </div>
  )
}

export function SessionDetail({
  session,
  insights,
  onClose,
  isBookmarked,
  onToggleBookmark,
}: {
  session: Session | null
  insights: SessionInsights | null
  onClose: () => void
  isBookmarked?: (id: string) => boolean
  onToggleBookmark?: (id: string) => void
}) {
  const lastSessionRef = useRef<Session | null>(null)
  const lastInsightsRef = useRef<SessionInsights | null>(null)
  if (session) lastSessionRef.current = session
  if (insights) lastInsightsRef.current = insights

  const displayedSession = session ?? lastSessionRef.current
  const displayedInsights = insights ?? lastInsightsRef.current

  const isOpen = !!session
  const [showSecondarySections, setShowSecondarySections] = useState(false)

  useEffect(() => {
    if (!session) {
      setShowSecondarySections(false)
      return
    }

    setShowSecondarySections(false)
    startTransition(() => {
      setShowSecondarySections(true)
    })
  }, [session?.id])

  const summaryParagraphs = useMemo(
    () => (displayedInsights ? displayedInsights.summary.split('\n\n') : []),
    [displayedInsights],
  )
  const relatedNewsItems = useMemo(() => {
    if (!showSecondarySections || !displayedInsights) return []
    return displayedInsights.relatedNews.map(fromCuratedNews)
  }, [displayedInsights, showSecondarySections])

  const panelContent =
    displayedSession && displayedInsights ? (
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
                onClick={() => onToggleBookmark(displayedSession.id)}
                title={isBookmarked(displayedSession.id) ? 'Remove from saved' : 'Save session'}
                aria-label={
                  isBookmarked(displayedSession.id)
                    ? `Remove ${displayedSession.name} from saved`
                    : `Save ${displayedSession.name}`
                }
                className="hover:bg-gold-dim flex size-10 items-center justify-center rounded-md transition-all duration-100 md:size-9"
              >
                <Bookmark
                  size={20}
                  className="transition-all duration-100"
                  fill={isBookmarked(displayedSession.id) ? 'var(--gold)' : 'none'}
                  stroke={isBookmarked(displayedSession.id) ? 'var(--gold)' : 'var(--ink3)'}
                />
              </button>
            )}
          </div>

          {/* Tags row */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={roundTagClasses(displayedSession.rt)}>{displayedSession.rt}</span>
            {displayedSession.sport && (
              <span className="bg-surface2 text-ink3 rounded-lg px-2 py-0.5 text-[0.62rem] font-semibold tracking-[0.06em] uppercase">
                {displayedSession.sport}
              </span>
            )}
          </div>

          {/* Title + rating */}
          <div className="mt-3 flex items-start justify-between gap-3">
            <h2 className="font-display text-ink text-[1.35rem] leading-tight font-semibold">
              {displayedSession.name}
            </h2>
            <span
              className={cn(
                ratingClasses(displayedSession.agg),
                'shrink-0 text-[1rem] px-2.5 py-1 min-w-[42px] rounded-xl',
              )}
            >
              {displayedSession.agg.toFixed(1)}
            </span>
          </div>
          <p className="text-ink2 mt-1 text-[0.82rem] leading-relaxed">{displayedSession.desc}</p>

          {/* Metadata row */}
          <div className="text-ink3 mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[0.76rem]">
            <span>{displayedSession.date}</span>
            <span className="text-border2">·</span>
            <span>{fmtTime(displayedSession.time)}</span>
            <span className="text-border2">·</span>
            <span className="inline-flex items-center gap-1">
              <MapPin size={12} className="shrink-0" />
              {displayedSession.venue}
            </span>
          </div>

          {/* Price */}
          <div className="text-ink mt-2 text-[0.9rem] font-semibold tabular-nums">
            {fmtPrice(displayedSession.pLo, displayedSession.pHi)}
          </div>
        </div>

        {/* ── Blurb ── */}
        <div className="px-5 pt-2 pb-5 max-md:px-4">
          <h3 className="text-ink3 text-[0.68rem] font-semibold tracking-[0.08em] uppercase">
            Summary
          </h3>
          <div className="text-ink mt-2 space-y-3 text-[0.86rem] leading-relaxed font-medium">
            {summaryParagraphs.map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        </div>

        {showSecondarySections ? (
          <>
            {/* ── Scorecard dimensions ── */}
            <div className="px-5 pt-2 pb-5 max-md:px-4">
              <h3 className="text-ink3 text-[0.68rem] font-semibold tracking-[0.08em] uppercase">
                Scorecard
              </h3>

              <div className="mt-3 grid grid-cols-2 gap-2.5 max-sm:grid-cols-1">
                {displayedInsights.dimensions.map((dim) => {
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
            {displayedInsights.potentialContenders.length > 0 && (
              <div className="px-5 pt-2 pb-5 max-md:px-4">
                <h3 className="text-ink3 text-[0.68rem] font-semibold tracking-[0.08em] uppercase">
                  Potential Contenders
                </h3>
                <div className="mt-3">
                  <PotentialContendersSection
                    potentialContenders={displayedInsights.potentialContenders}
                    potentialContendersIntro={displayedInsights.potentialContendersIntro}
                  />
                </div>
              </div>
            )}

            {/* ── Related News ── */}
            {relatedNewsItems.length > 0 && (
              <div className="px-5 pt-2 pb-5 max-md:px-4">
                <h3 className="text-ink3 text-[0.68rem] font-semibold tracking-[0.08em] uppercase">
                  Related News
                </h3>
                <div className="mt-3">
                  <RelatedNewsSection items={relatedNewsItems} />
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="px-5 pt-2 pb-5 max-md:px-4" aria-hidden>
            <div className="bg-surface2 border-border rounded-lg border px-3.5 py-3 text-[0.74rem] text-ink3">
              Loading analysis...
            </div>
          </div>
        )}

        {/* Bottom breathing room */}
        <div className="h-6 shrink-0" />
      </>
    ) : null

  return (
    <SideDrawer
      open={isOpen}
      onClose={onClose}
      aria-label={displayedSession?.name ?? 'Session details'}
      defaultWidth={DEFAULT_WIDTH}
    >
      {panelContent}
    </SideDrawer>
  )
}
