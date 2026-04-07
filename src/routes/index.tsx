import { createFileRoute } from '@tanstack/react-router'
import { useState, useMemo } from 'react'

import { BookmarkSection } from '@/components/BookmarkSection'
import { FilterBar } from '@/components/FilterBar'
import { SessionTable } from '@/components/SessionTable'
import { sessions } from '@/data/sessions'
import { useBookmarks } from '@/hooks/useBookmarks'
import { filterSessions, sortSessions } from '@/lib/filter'
import type { Filters, SortColumn, SortState, GroupBy } from '@/types/session'

export const Route = createFileRoute('/')({ component: SessionPicker })

const defaultFilters: Filters = {
  search: '',
  sport: '',
  round: '',
  zone: '',
  score: '',
  price: '',
}

function SessionPicker() {
  const [filters, setFilters] = useState<Filters>(defaultFilters)
  const [sort, setSort] = useState<SortState>({ col: 'agg', dir: 'desc' })
  const [groupBy, setGroupBy] = useState<GroupBy>('')
  const { bookmarks, toggle, clearAll, isBookmarked } = useBookmarks()

  const filtered = useMemo(() => filterSessions(sessions, filters), [filters])
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
      />

      <div className="wrap">
        <BookmarkSection
          sessions={sessions}
          bookmarks={bookmarks}
          onToggleBookmark={toggle}
          onClearAll={clearAll}
        />

        <SessionTable
          sessions={sorted}
          sort={sort}
          onSort={handleSort}
          isBookmarked={isBookmarked}
          onToggleBookmark={toggle}
          groupBy={groupBy}
        />

        <div className="footer-note">
          Data sourced from LA 2028 Session Table &middot; Los Angeles 2028
        </div>
      </div>
    </>
  )
}
