import { createLazyFileRoute } from '@tanstack/react-router'
import { useCallback, useDeferredValue, useMemo, useState } from 'react'

import { BookmarkPanel } from '@/components/BookmarkPanel'
import { FilterBar } from '@/components/FilterBar'
import { SessionDetail } from '@/components/SessionDetail'
import { SessionTable } from '@/components/SessionTable'
import { useBookmarks } from '@/hooks/useBookmarks'
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
  const [filters, setFilters] = useState<Filters>(defaultFilters)
  const [sort, setSort] = useState<SortState>({ col: 'agg', dir: 'desc' })
  const [groupBy, setGroupBy] = useState<GroupBy>('')
  const [selectedSession, setSelectedSession] = useState<Session | null>(null)
  const [bookmarkPanelOpen, setBookmarkPanelOpen] = useState(false)
  const { bookmarks, toggle, clearAll, isBookmarked } = useBookmarks()

  const handleSelectSession = useCallback((session: Session) => {
    setBookmarkPanelOpen(false)
    setSelectedSession((current) => (current?.id === session.id ? null : session))
  }, [])

  const handleOpenBookmarks = useCallback(() => {
    setSelectedSession(null)
    setBookmarkPanelOpen(true)
  }, [])

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

      <div className="max-w-[1400px] mx-auto px-4 pt-4 pb-15">
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
          onClose={() => setSelectedSession(null)}
        />

        <BookmarkPanel
          open={bookmarkPanelOpen}
          onClose={() => setBookmarkPanelOpen(false)}
          sessions={sessions}
          bookmarks={bookmarks}
          onToggleBookmark={toggle}
          onClearAll={clearAll}
          onSelectSession={handleSelectSession}
        />

        <div className="text-center p-6 text-[0.72rem] text-ink3 font-light">
          Data sourced from LA 2028 Session Table &middot; Los Angeles 2028
        </div>
      </div>
    </>
  )
}
