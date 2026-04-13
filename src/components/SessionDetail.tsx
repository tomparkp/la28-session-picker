import {
  Bookmark,
  ChevronsRight,
  ExternalLink,
  LoaderCircle,
  MapPin,
  Newspaper,
  UserRound,
  X,
} from 'lucide-react'
import { useMemo, useState } from 'react'

import type { SessionInsights } from '@/lib/ai-scorecard'
import { cn } from '@/lib/cn'
import { fmtPrice, fmtTime } from '@/lib/format'
import { ratingClasses, roundTagClasses } from '@/lib/tw'
import type { Contender, RelatedNews, Session } from '@/types/session'

import { ReportIssueDialog } from './ReportIssueDialog'
import { SideDrawer } from './SideDrawer'

const DEFAULT_WIDTH = 560

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
        {potentialContenders.map((contender) => (
          <div key={`${contender.name}-${contender.country}`} className="flex items-start gap-3">
            <span className="bg-surface3 text-ink3 mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full">
              <UserRound size={14} />
            </span>
            <div className="min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-ink text-[0.84rem] font-semibold">{contender.name}</span>
                <span className="text-accent text-[0.6rem] font-bold tracking-[0.06em] uppercase">
                  {contender.country}
                </span>
              </div>
              <p className="text-ink3 mt-0.5 text-[0.76rem] leading-snug">{contender.note}</p>
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

function LoadingBlock({ session, onClose }: { session: Session | null; onClose: () => void }) {
  return (
    <>
      <div className="shrink-0 px-5 pt-3 pb-5 max-md:px-4">
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
          <div className="text-ink3 flex size-10 items-center justify-center rounded-md md:size-9">
            <LoaderCircle size={18} className="animate-spin" />
          </div>
        </div>

        {session ? (
          <>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className={roundTagClasses(session.rt)}>{session.rt}</span>
              {session.sport && (
                <span className="bg-surface2 text-ink3 rounded-lg px-2 py-0.5 text-[0.62rem] font-semibold tracking-[0.06em] uppercase">
                  {session.sport}
                </span>
              )}
            </div>

            <div className="mt-3 flex items-start justify-between gap-3">
              <h2 className="font-display text-ink text-[1.35rem] leading-tight font-semibold">
                {session.name}
              </h2>
              <span
                className={cn(
                  ratingClasses(session.agg),
                  'shrink-0 text-[1rem] px-2.5 py-1 min-w-[42px] rounded-xl',
                )}
              >
                {session.agg.toFixed(1)}
              </span>
            </div>
            <p className="text-ink2 mt-1 text-[0.82rem] leading-relaxed">{session.desc}</p>

            <div className="text-ink3 mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[0.76rem]">
              <span>{session.date}</span>
              <span className="text-border2">·</span>
              <span>{fmtTime(session.time)}</span>
              <span className="text-border2">·</span>
              <span className="inline-flex items-center gap-1">
                <MapPin size={12} className="shrink-0" />
                {session.venue}
              </span>
            </div>

            <div className="text-ink mt-2 text-[0.9rem] font-semibold tabular-nums">
              {fmtPrice(session.pLo, session.pHi)}
            </div>
          </>
        ) : null}
      </div>

      <div className="px-5 pt-2 pb-5 max-md:px-4">
        <div className="bg-surface2 border-border text-ink3 flex items-center gap-2 rounded-lg border px-3.5 py-3 text-[0.74rem]">
          <LoaderCircle size={14} className="animate-spin" />
          Loading analysis...
        </div>
      </div>
    </>
  )
}

export function SessionDetail({
  open,
  session,
  insights,
  isLoading,
  onClose,
  isBookmarked,
  onToggleBookmark,
}: {
  open: boolean
  session: Session | null
  insights: SessionInsights | null
  isLoading: boolean
  onClose: () => void
  isBookmarked?: (id: string) => boolean
  onToggleBookmark?: (id: string) => void
}) {
  const [reportSubject, setReportSubject] = useState<{ id: string; name: string } | null>(null)

  const summaryParagraphs = useMemo(
    () => (insights ? insights.summary.split('\n\n') : []),
    [insights],
  )
  const relatedNewsItems = useMemo(
    () => (insights ? insights.relatedNews.map(fromCuratedNews) : []),
    [insights],
  )

  const panelContent = !open ? null : !isLoading && insights && session ? (
    <>
      <div className="shrink-0 px-5 pt-3 pb-5 max-md:px-4">
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

          {onToggleBookmark && isBookmarked ? (
            <button
              type="button"
              onClick={() => onToggleBookmark(session.id)}
              title={isBookmarked(session.id) ? 'Remove from saved' : 'Save session'}
              aria-label={
                isBookmarked(session.id)
                  ? `Remove ${session.name} from saved`
                  : `Save ${session.name}`
              }
              className="hover:bg-gold-dim flex size-10 items-center justify-center rounded-md transition-all duration-100 md:size-9"
            >
              <Bookmark
                size={20}
                className="transition-all duration-100"
                fill={isBookmarked(session.id) ? 'var(--gold)' : 'none'}
                stroke={isBookmarked(session.id) ? 'var(--gold)' : 'var(--ink3)'}
              />
            </button>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className={roundTagClasses(session.rt)}>{session.rt}</span>
          {session.sport && (
            <span className="bg-surface2 text-ink3 rounded-lg px-2 py-0.5 text-[0.62rem] font-semibold tracking-[0.06em] uppercase">
              {session.sport}
            </span>
          )}
        </div>

        <div className="mt-3 flex items-start justify-between gap-3">
          <h2 className="font-display text-ink text-[1.35rem] leading-tight font-semibold">
            {session.name}
          </h2>
          <span
            className={cn(
              ratingClasses(session.agg),
              'shrink-0 text-[1rem] px-2.5 py-1 min-w-[42px] rounded-xl',
            )}
          >
            {session.agg.toFixed(1)}
          </span>
        </div>
        <p className="text-ink2 mt-1 text-[0.82rem] leading-relaxed">{session.desc}</p>

        <div className="text-ink3 mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[0.76rem]">
          <span>{session.date}</span>
          <span className="text-border2">·</span>
          <span>{fmtTime(session.time)}</span>
          <span className="text-border2">·</span>
          <span className="inline-flex items-center gap-1">
            <MapPin size={12} className="shrink-0" />
            {session.venue}
          </span>
        </div>

        <div className="text-ink mt-2 text-[0.9rem] font-semibold tabular-nums">
          {fmtPrice(session.pLo, session.pHi)}
        </div>
      </div>

      <div className="px-5 pt-2 pb-5 max-md:px-4">
        <h3 className="text-ink3 text-[0.68rem] font-semibold tracking-[0.08em] uppercase">
          Disclaimer
        </h3>
        <p className="text-ink3 mt-2 text-[0.82rem] leading-snug italic">
          The content below is AI-generated and may contain inaccuracies — double-check relevant
          information with official sources.
        </p>
        <div className="mt-2 text-[0.78rem]">
          <button
            type="button"
            onClick={() => {
              const subject = { id: session.id, name: session.name }
              onClose()
              setTimeout(() => setReportSubject(subject), 200)
            }}
            className="text-ink3 hover:text-ink underline decoration-dotted underline-offset-2 transition-colors"
          >
            Report an issue
          </button>
        </div>
      </div>

      <div className="px-5 pt-2 pb-5 max-md:px-4">
        <h3 className="text-ink3 text-[0.68rem] font-semibold tracking-[0.08em] uppercase">
          Summary
        </h3>
        <div className="text-ink mt-2 space-y-3 text-[0.86rem] leading-relaxed font-medium">
          {summaryParagraphs.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
      </div>

      <div className="px-5 pt-2 pb-5 max-md:px-4">
        <h3 className="text-ink3 text-[0.68rem] font-semibold tracking-[0.08em] uppercase">
          Scorecard
        </h3>

        <div className="mt-3 grid grid-cols-2 gap-2.5 max-sm:grid-cols-1">
          {insights.dimensions.map((dimension) => {
            const colors = ringColors[dimension.key as ScoreKey]
            return (
              <div
                key={dimension.key}
                className={cn(
                  'rounded-lg border border-border bg-surface2 border-l-[3px] px-3.5 py-3',
                  colors?.border,
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-ink text-[0.78rem] font-semibold">{dimension.label}</span>
                  <span className={cn('text-[0.9rem] font-bold tabular-nums', colors?.score)}>
                    {dimension.score.toFixed(1)}
                  </span>
                </div>
                <p className="text-ink3 mt-1.5 text-[0.72rem] leading-normal">
                  {dimension.explanation}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {insights.potentialContenders.length > 0 ? (
        <div className="px-5 pt-2 pb-5 max-md:px-4">
          <h3 className="text-ink3 text-[0.68rem] font-semibold tracking-[0.08em] uppercase">
            Potential Contenders
          </h3>
          <div className="mt-3">
            <PotentialContendersSection
              potentialContenders={insights.potentialContenders}
              potentialContendersIntro={insights.potentialContendersIntro}
            />
          </div>
        </div>
      ) : null}

      {relatedNewsItems.length > 0 ? (
        <div className="px-5 pt-2 pb-5 max-md:px-4">
          <h3 className="text-ink3 text-[0.68rem] font-semibold tracking-[0.08em] uppercase">
            Related News
          </h3>
          <div className="mt-3">
            <RelatedNewsSection items={relatedNewsItems} />
          </div>
        </div>
      ) : null}

      <div className="h-6 shrink-0" />
    </>
  ) : (
    <LoadingBlock session={session} onClose={onClose} />
  )

  return (
    <>
      <SideDrawer
        open={open}
        onClose={onClose}
        aria-label={session?.name ?? 'Session details'}
        defaultWidth={DEFAULT_WIDTH}
        scrollResetKey={session?.id ?? null}
      >
        {panelContent}
      </SideDrawer>
      <ReportIssueDialog
        open={reportSubject !== null}
        onOpenChange={(next) => {
          if (!next) setReportSubject(null)
        }}
        sessionId={reportSubject?.id}
        sessionName={reportSubject?.name}
      />
    </>
  )
}
