import type { RelatedNews, Session, SessionWithContent } from '@/types/session'

export const RELATED_NEWS_LIMIT = 10

const REGEX_SPECIAL_CHARS = /[.*+?^${}()|[\]\\]/g

function escapeRegExp(value: string) {
  return value.replace(REGEX_SPECIAL_CHARS, '\\$&')
}

function keywordMatchesSessionText(haystack: string, keyword: string) {
  const trimmed = keyword.trim()
  if (!trimmed) return true

  const pattern = new RegExp(`\\b${escapeRegExp(trimmed)}\\b`, 'i')
  return pattern.test(haystack)
}

export function relatedNewsMatchesSession(news: RelatedNews, session: Session): boolean {
  if (news.roundTypes?.length && !news.roundTypes.includes(session.rt)) return false

  if (news.eventKeywords?.length) {
    const haystack = `${session.name} ${session.desc}`
    return news.eventKeywords.every((keyword) => keywordMatchesSessionText(haystack, keyword))
  }

  return true
}

export function resolveRelatedNewsForSession(
  session: Session,
  relatedNews: RelatedNews[],
  limit = RELATED_NEWS_LIMIT,
): RelatedNews[] {
  return relatedNews
    .filter((news) => relatedNewsMatchesSession(news, session))
    .sort((a, b) => Date.parse(b.publishedDate) - Date.parse(a.publishedDate))
    .slice(0, limit)
}

function hasSafeUrlScheme(sourceUrl: string): boolean {
  try {
    const { protocol } = new URL(sourceUrl)
    return protocol === 'http:' || protocol === 'https:'
  } catch {
    return false
  }
}

function dedupeByUrl(items: RelatedNews[]): RelatedNews[] {
  const seen = new Set<string>()
  const result: RelatedNews[] = []
  for (const item of items) {
    if (!hasSafeUrlScheme(item.sourceUrl)) continue
    const key = item.sourceUrl.trim().toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(item)
  }
  return result
}

export function getRelatedNewsForSession(session: SessionWithContent): RelatedNews[] {
  const generated = session.relatedNews ?? []
  return dedupeByUrl(generated)
    .sort((a, b) => Date.parse(b.publishedDate) - Date.parse(a.publishedDate))
    .slice(0, RELATED_NEWS_LIMIT)
}
