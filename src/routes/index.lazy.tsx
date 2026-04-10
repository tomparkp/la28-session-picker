import { createLazyFileRoute, useNavigate } from '@tanstack/react-router'
import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { BookmarkPanel } from '@/components/BookmarkPanel'
import { FilterBar } from '@/components/FilterBar'
import { SessionDetail } from '@/components/SessionDetail'
import { SessionTable } from '@/components/SessionTable'
import { useBookmarks } from '@/hooks/useBookmarks'
import { getSessionInsights, type SessionInsights } from '@/lib/ai-scorecard'
import { filterSessions, sortSessions } from '@/lib/filter'
import type { Filters, GroupBy, Session, SortColumn, SortState } from '@/types/session'

export const Route = createLazyFileRoute('/')({ component: SessionPicker })

const defaultFilters: Filters = {
  sport: [],
  round: [],
  zone: [],
  score: '',
  price: '',
}

function SessionPicker() {
  const { sessions, sports, zones } = Route.useLoaderData()
  const { session: selectedSessionId } = Route.useSearch()
  const navigate = useNavigate({ from: '/' })
  const [filters, setFilters] = useState<Filters>(defaultFilters)
  const [sort, setSort] = useState<SortState>({ col: 'agg', dir: 'desc' })
  const [groupBy, setGroupBy] = useState<GroupBy>('')
  const [bookmarkPanelOpen, setBookmarkPanelOpen] = useState(false)
  const { bookmarks, toggle, clearAll, isBookmarked } = useBookmarks()
  const insightsCacheRef = useRef<Map<string, SessionInsights>>(new Map())

  const sessionById = useMemo(() => new Map(sessions.map((session) => [session.id, session])), [sessions])
  const selectedSession = selectedSessionId ? sessionById.get(selectedSessionId) ?? null : null

  const getCachedInsights = useCallback((session: Session | null) => {
    if (!session) return null

    const cached = insightsCacheRef.current.get(session.id)
    if (cached) return cached

    const next = getSessionInsights(session)
    insightsCacheRef.current.set(session.id, next)
    return next
  }, [])

  const selectedInsights = useMemo(
    () => getCachedInsights(selectedSession),
    [getCachedInsights, selectedSession],
  )

  const handleSelectSessionId = useCallback(
    (sessionId: string) => {
      setBookmarkPanelOpen(false)
      startTransition(() => {
        void navigate({
          search: (prev) => ({
            ...prev,
            session: prev.session === sessionId ? undefined : sessionId,
          }),
          resetScroll: false,
        })
      })
    },
    [navigate],
  )

  const handleCloseSession = useCallback(() => {
    startTransition(() => {
      void navigate({ search: (prev) => ({ ...prev, session: undefined }), resetScroll: false })
    })
  }, [navigate])

  const handleOpenBookmarks = useCallback(() => {
    startTransition(() => {
      void navigate({ search: (prev) => ({ ...prev, session: undefined }), resetScroll: false })
    })
    setBookmarkPanelOpen(true)
  }, [navigate])

  const handleCloseBookmarks = useCallback(() => {
    setBookmarkPanelOpen(false)
  }, [])

  useEffect(() => {
    if (!selectedSession && !bookmarkPanelOpen) return

    function handleMouseDown(e: MouseEvent) {
      const target = e.target as HTMLElement
      if (target.closest('[data-side-drawer]')) return
      if (target.closest('[data-session-item]')) return

      if (selectedSession) {
        handleCloseSession()
      }

      if (bookmarkPanelOpen) {
        handleCloseBookmarks()
      }
    }

    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [bookmarkPanelOpen, handleCloseBookmarks, handleCloseSession, selectedSession])

  const filtered = useMemo(() => filterSessions(sessions, filters), [sessions, filters])
  const sorted = useMemo(() => sortSessions(filtered, sort), [filtered, sort])

  function handleSort(col: SortColumn) {
    setSort((prev) => ({
      col,
      dir: prev.col === col && prev.dir === 'desc' ? 'asc' : 'desc',
    }))
  }

  return (
    <>
      <FilterBar
        filters={filters}
        onChange={setFilters}
        groupBy={groupBy}
        onGroupByChange={setGroupBy}
        sports={sports}
        zones={zones}
        bookmarkCount={bookmarks.size}
        onOpenBookmarks={handleOpenBookmarks}
      />

      <div className="mx-auto max-w-[1400px] px-4 pt-2 pb-15">
        <SessionTable
          sessions={sorted}
          sort={sort}
          onSort={handleSort}
          isBookmarked={isBookmarked}
          onToggleBookmark={toggle}
          groupBy={groupBy}
          selectedSessionId={selectedSession?.id ?? null}
          onSelectSessionId={handleSelectSessionId}
        />

        <SessionDetail
          session={selectedSession}
          insights={selectedInsights}
          onClose={handleCloseSession}
          isBookmarked={isBookmarked}
          onToggleBookmark={toggle}
        />

        <BookmarkPanel
          open={bookmarkPanelOpen}
          onClose={handleCloseBookmarks}
          sessions={sessions}
          bookmarks={bookmarks}
          onToggleBookmark={toggle}
          onClearAll={clearAll}
          onSelectSessionId={handleSelectSessionId}
        />
      </div>
    </>
  )
}
