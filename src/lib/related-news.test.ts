import { describe, expect, it } from 'vitest'

import { getRelatedNewsForSession, relatedNewsMatchesSession, resolveRelatedNewsForSession } from '@/lib/related-news'
import type { RelatedNews, SessionWithContent } from '@/types/session'

function makeSession(overrides: Partial<SessionWithContent> = {}): SessionWithContent {
  return {
    id: 'BKB04',
    sport: 'Basketball',
    name: 'BKB04 Basketball',
    desc: "Men's Group Phase (2 Games)",
    venue: 'Intuit Dome',
    zone: 'LA',
    date: 'Thu Jul 13',
    dk: '2028-07-13',
    time: '12:00 PM-4:15 PM',
    rt: 'Prelim',
    pLo: 150,
    pHi: 500,
    soccer: false,
    rSig: 7,
    rExp: 8,
    rStar: 9,
    rUniq: 6,
    rDem: 8,
    agg: 7.5,
    ...overrides,
  }
}

function makeNews(overrides: Partial<RelatedNews> = {}): RelatedNews {
  return {
    id: 'news-1',
    title: 'Roster update',
    summary: 'A roster note for a future Olympic tournament.',
    sourceName: 'Example',
    sourceUrl: 'https://example.com/news',
    publishedDate: '2025-01-01',
    tags: ['roster'],
    ...overrides,
  }
}

describe('related news matching', () => {
  it('shows curated sport news only for the owning sport', () => {
    const basketballNews = getRelatedNewsForSession(makeSession())
    const swimmingNews = getRelatedNewsForSession(
      makeSession({ id: 'SWM01', sport: 'Swimming', name: 'SWM01 Swimming' }),
    )

    expect(basketballNews.map((item) => item.id)).toContain('basketball-lebron-james-la28-2025-11-18')
    expect(swimmingNews).toEqual([])
  })

  it('matches event keywords without treating women as men', () => {
    const news = makeNews({ eventKeywords: ["Men's"] })

    expect(relatedNewsMatchesSession(news, makeSession())).toBe(true)
    expect(relatedNewsMatchesSession(news, makeSession({ desc: "Women's Group Phase" }))).toBe(false)
  })

  it('restricts matches by round type when configured', () => {
    const news = makeNews({ roundTypes: ['Final'] })

    expect(relatedNewsMatchesSession(news, makeSession({ rt: 'Final' }))).toBe(true)
    expect(relatedNewsMatchesSession(news, makeSession({ rt: 'Prelim' }))).toBe(false)
  })

  it('sorts newest first and caps the result list', () => {
    const news = [
      makeNews({ id: 'oldest', publishedDate: '2025-01-01' }),
      makeNews({ id: 'newest', publishedDate: '2025-05-01' }),
      makeNews({ id: 'middle', publishedDate: '2025-03-01' }),
      makeNews({ id: 'older', publishedDate: '2025-02-01' }),
      makeNews({ id: 'newer', publishedDate: '2025-04-01' }),
    ]

    expect(resolveRelatedNewsForSession(makeSession(), news, 4).map((item) => item.id)).toEqual([
      'newest',
      'newer',
      'middle',
      'older',
    ])
  })

  it('merges generated session news with curated sport news, newest first', () => {
    const generated: RelatedNews[] = [
      makeNews({
        id: 'gen-1',
        title: 'Recent generated news',
        sourceUrl: 'https://example.com/gen-1',
        publishedDate: '2026-02-01',
      }),
    ]
    const merged = getRelatedNewsForSession(makeSession({ relatedNews: generated }))

    expect(merged[0]?.id).toBe('gen-1')
    expect(merged.map((item) => item.id)).toContain('basketball-lebron-james-la28-2025-11-18')
  })

  it('dedupes curated and generated items that share a source URL', () => {
    const duplicate: RelatedNews[] = [
      makeNews({
        id: 'gen-duplicate',
        sourceUrl:
          'https://www.sportsnet.ca/nba/article/lebron-wont-play-for-team-usa-in-2028-olympics-curry-unlikley-to-participate/',
        publishedDate: '2026-01-01',
      }),
    ]
    const merged = getRelatedNewsForSession(makeSession({ relatedNews: duplicate }))
    const matches = merged.filter((item) => item.sourceUrl.includes('lebron-wont-play-for-team-usa'))

    expect(matches).toHaveLength(1)
  })
})
