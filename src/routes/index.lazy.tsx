import { useQuery, useSuspenseInfiniteQuery } from '@tanstack/react-query'
import { createLazyFileRoute, useNavigate } from '@tanstack/react-router'
import { LoaderCircle } from 'lucide-react'
import { startTransition, useEffect, useMemo, useRef, useState } from 'react'

import { BookmarkPanel } from '@/components/BookmarkPanel'
import { FilterBar } from '@/components/FilterBar'
import { SessionDetail } from '@/components/SessionDetail'
import { SessionTable } from '@/components/SessionTable'
import { useBookmarks } from '@/hooks/useBookmarks'
import { sessionDetailQueryOptions, sessionsInfiniteQueryOptions } from '@/lib/session-query'
import {
  routeSearchToFilters,
  routeSearchToSort,
  type SessionRouteSearch,
} from '@/lib/session-search'
import type { Filters, SortColumn } from '@/types/session'

export const Route = createLazyFileRoute('/')({ component: SessionPicker })

function SessionPicker() {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: '/' })
  const loadMoreRef = useRef<HTMLDivElement | null>(null)
  const [bookmarkPanelOpen, setBookmarkPanelOpen] = useState(false)
  const { bookmarks, toggle, clearAll, isBookmarked } = useBookmarks()

  const sessionsQuery = useSuspenseInfiniteQuery(sessionsInfiniteQueryOptions(search))
  const pages = sessionsQuery.data.pages
  const firstPage = pages[0]
  const sessions = useMemo(() => pages.flatMap((page) => page.items), [pages])
  const filters = useMemo(() => routeSearchToFilters(search), [search])
  const sort = useMemo(() => routeSearchToSort(search), [search])
  const selectedSessionId = search.session ?? null
  const sessionById = useMemo(
    () => new Map(sessions.map((session) => [session.id, session])),
    [sessions],
  )
  const selectedSummary = selectedSessionId ? (sessionById.get(selectedSessionId) ?? null) : null

  const selectedDetailQuery = useQuery({
    ...sessionDetailQueryOptions(selectedSessionId ?? ''),
    enabled: !!selectedSessionId,
  })

  const selectedSession = selectedDetailQuery.data?.session ?? selectedSummary
  const selectedInsights = selectedDetailQuery.data?.insights ?? null

  useEffect(() => {
    const element = loadMoreRef.current
    if (!element || !sessionsQuery.hasNextPage) return

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (!entry?.isIntersecting || sessionsQuery.isFetchingNextPage) return
        void sessionsQuery.fetchNextPage()
      },
      { rootMargin: '300px 0px' },
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [
    sessionsQuery.fetchNextPage,
    sessionsQuery.hasNextPage,
    sessionsQuery.isFetchingNextPage,
    sessions.length,
  ])

  useEffect(() => {
    if (!selectedSessionId && !bookmarkPanelOpen) return

    function handleMouseDown(event: MouseEvent) {
      const target = event.target as HTMLElement
      if (target.closest('[data-side-drawer]')) return
      if (target.closest('[data-session-item]')) return

      if (selectedSessionId) {
        startTransition(() => {
          void navigate({
            search: (prev) => ({ ...prev, session: undefined }),
            resetScroll: false,
          })
        })
      }

      if (bookmarkPanelOpen) {
        setBookmarkPanelOpen(false)
      }
    }

    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [bookmarkPanelOpen, navigate, selectedSessionId])

  function updateSearch(nextSearch: SessionRouteSearch) {
    startTransition(() => {
      void navigate({
        search: nextSearch,
        resetScroll: false,
      })
    })
  }

  function handleFilterChange(nextFilters: Filters) {
    updateSearch({
      ...search,
      ...nextFilters,
    })
  }

  function handleSort(col: SortColumn) {
    updateSearch({
      ...search,
      sortCol: col,
      sortDir: search.sortCol === col && search.sortDir === 'desc' ? 'asc' : 'desc',
    })
  }

  function handleSelectSessionId(sessionId: string) {
    setBookmarkPanelOpen(false)
    updateSearch({
      ...search,
      session: search.session === sessionId ? undefined : sessionId,
    })
  }

  function handleCloseSession() {
    updateSearch({
      ...search,
      session: undefined,
    })
  }

  function handleOpenBookmarks() {
    updateSearch({
      ...search,
      session: undefined,
    })
    setBookmarkPanelOpen(true)
  }

  const bookmarkIds = useMemo(() => [...bookmarks], [bookmarks])

  return (
    <>
      <FilterBar
        filters={filters}
        onChange={handleFilterChange}
        sports={firstPage.sports}
        zones={firstPage.zones}
        bookmarkCount={bookmarks.size}
        onOpenBookmarks={handleOpenBookmarks}
      />

      <div className="mx-auto max-w-[1400px] px-4 pt-2 pb-15">
        <div className="text-ink3 mb-3 flex items-center justify-between gap-3 text-[0.72rem]">
          <span>
            Showing {sessions.length} of {firstPage.total} sessions
          </span>
          {sessionsQuery.isFetching && !sessionsQuery.isFetchingNextPage ? (
            <span className="inline-flex items-center gap-1.5">
              <LoaderCircle size={12} className="animate-spin" />
              Updating results...
            </span>
          ) : null}
        </div>

        <SessionTable
          sessions={sessions}
          sort={sort}
          onSort={handleSort}
          isBookmarked={isBookmarked}
          onToggleBookmark={toggle}
          selectedSessionId={selectedSessionId}
          onSelectSessionId={handleSelectSessionId}
        />

        <div ref={loadMoreRef} className="flex min-h-16 items-center justify-center">
          {sessionsQuery.isFetchingNextPage ? (
            <div className="text-ink3 inline-flex items-center gap-2 text-[0.8rem]">
              <LoaderCircle size={16} className="animate-spin" />
              Loading more sessions...
            </div>
          ) : sessionsQuery.hasNextPage ? (
            <span className="text-ink3 text-[0.75rem]">Scroll to load more</span>
          ) : firstPage.total > 0 ? (
            <span className="text-ink3 text-[0.75rem]">All matching sessions loaded</span>
          ) : null}
        </div>

        <SessionDetail
          open={!!selectedSessionId}
          session={selectedSession}
          insights={selectedInsights}
          isLoading={selectedDetailQuery.isPending}
          onClose={handleCloseSession}
          isBookmarked={isBookmarked}
          onToggleBookmark={toggle}
        />

        <BookmarkPanel
          open={bookmarkPanelOpen}
          onClose={() => setBookmarkPanelOpen(false)}
          bookmarkIds={bookmarkIds}
          onToggleBookmark={toggle}
          onClearAll={clearAll}
          onSelectSessionId={handleSelectSessionId}
        />
      </div>
    </>
  )
}
