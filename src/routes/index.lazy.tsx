import { createLazyFileRoute, useNavigate } from '@tanstack/react-router'
import { Bookmark } from 'lucide-react'
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react'

import { BookmarkPanel } from '@/components/BookmarkPanel'
import { FilterBar } from '@/components/FilterBar'
import { SessionDetail } from '@/components/SessionDetail'
import { SessionTable } from '@/components/SessionTable'
import { useBookmarks } from '@/hooks/useBookmarks'
import { cn } from '@/lib/cn'
import { filterSessions, sortSessions } from '@/lib/filter'
import type { Filters, GroupBy, Session, SortColumn, SortState } from '@/types/session'

export const Route = createLazyFileRoute('/')({ component: SessionPicker })

const defaultFilters: Filters = {
  search: '',
  sport: '',
  round: '',
  zone: '',
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

  const selectedSession = useMemo(
    () => sessions.find((s) => s.id === selectedSessionId) ?? null,
    [sessions, selectedSessionId],
  )

  const handleSelectSession = useCallback(
    (session: Session) => {
      setBookmarkPanelOpen(false)
      void navigate({
        search: (prev) => ({
          ...prev,
          session: prev.session === session.id ? undefined : session.id,
        }),
        resetScroll: false,
      })
    },
    [navigate],
  )

  const handleCloseSession = useCallback(() => {
    void navigate({ search: (prev) => ({ ...prev, session: undefined }), resetScroll: false })
  }, [navigate])

  const handleOpenBookmarks = useCallback(() => {
    void navigate({ search: (prev) => ({ ...prev, session: undefined }), resetScroll: false })
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

  const deferredSearch = useDeferredValue(filters.search)
  const effectiveFilters = useMemo<Filters>(
    () => ({ ...filters, search: deferredSearch }),
    [filters, deferredSearch],
  )

  const filtered = useMemo(
    () => filterSessions(sessions, effectiveFilters),
    [sessions, effectiveFilters],
  )
  const sorted = useMemo(() => sortSessions(filtered, sort), [filtered, sort])

  function handleSort(col: SortColumn) {
    setSort((prev) => ({
      col,
      dir: prev.col === col && prev.dir === 'desc' ? 'asc' : 'desc',
    }))
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpenBookmarks}
        className={cn(
          'absolute top-4 left-5 z-20 flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 text-[0.8rem] font-medium text-ink2 transition-all duration-150 hover:border-gold hover:bg-surface2 hover:text-gold max-md:top-3 max-md:left-3',
          bookmarks.size > 0 && 'border-gold text-gold',
        )}
      >
        <Bookmark
          size={15}
          fill={bookmarks.size > 0 ? 'var(--gold)' : 'none'}
          stroke={bookmarks.size > 0 ? 'var(--gold)' : 'currentColor'}
        />
        Saved
        {bookmarks.size > 0 && (
          <span className="bg-gold text-bg flex size-[18px] items-center justify-center rounded-full text-[0.6rem] font-bold">
            {bookmarks.size}
          </span>
        )}
      </button>

      <FilterBar
        filters={filters}
        onChange={setFilters}
        groupBy={groupBy}
        onGroupByChange={setGroupBy}
        sports={sports}
        zones={zones}
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
          onSelectSession={handleSelectSession}
        />

        <SessionDetail
          session={selectedSession}
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
          onSelectSession={handleSelectSession}
        />
      </div>
    </>
  )
}
