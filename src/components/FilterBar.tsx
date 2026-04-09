import { Bookmark } from 'lucide-react'

import { cn } from '@/lib/cn'
import { roundTypes } from '@/data/sessions'
import { useStickyFilterBorder } from '@/hooks/useStickyFilterBorder'
import type { Filters, GroupBy } from '@/types/session'

interface FilterBarProps {
  filters: Filters
  onChange: (filters: Filters) => void
  groupBy: GroupBy
  onGroupByChange: (groupBy: GroupBy) => void
  sports: string[]
  zones: string[]
  bookmarkCount: number
  onOpenBookmarks: () => void
}

const inputBase =
  'bg-surface2 border border-border rounded-md text-ink text-[0.78rem] font-[system-ui] outline-none transition-[border-color] duration-150 px-2.5 py-1.5 focus:border-gold'

const selectCls = `${inputBase} filter-select`

const activeCls = 'border-gold bg-gold-dim'

export function FilterBar({
  filters,
  onChange,
  groupBy,
  onGroupByChange,
  sports,
  zones,
  bookmarkCount,
  onOpenBookmarks,
}: FilterBarProps) {
  const { sentinelRef, stuck } = useStickyFilterBorder()

  function update(key: keyof Filters, value: string) {
    onChange({ ...filters, [key]: value })
  }

  return (
    <>
      <div ref={sentinelRef} className="h-px m-0 pointer-events-none" aria-hidden />
      <div className={cn('sticky top-0 z-10 bg-bg', stuck && 'border-b border-border')}>
        <div className="flex flex-wrap justify-center items-center gap-1.5 px-4 py-2.5 mx-auto max-w-[1400px] max-md:gap-1 max-md:px-2.5 max-md:py-2">
          <input
            type="text"
            placeholder="Search events..."
            value={filters.search}
            className={cn(inputBase, 'w-[220px] max-md:w-[140px] placeholder:text-ink3', filters.search && activeCls)}
            onChange={(e) => update('search', e.target.value)}
          />
          <span className="flex-1" />
          <select
            className={cn(selectCls, filters.sport && activeCls)}
            value={filters.sport}
            onChange={(e) => update('sport', e.target.value)}
          >
            <option value="" className="text-ink bg-surface">All Sports</option>
            {sports.map((s) => (
              <option key={s} value={s} className="text-ink bg-surface">
                {s}
              </option>
            ))}
          </select>
          <select
            className={cn(selectCls, filters.round && activeCls)}
            value={filters.round}
            onChange={(e) => update('round', e.target.value)}
          >
            <option value="" className="text-ink bg-surface">All Rounds</option>
            {roundTypes.map((r) => (
              <option key={r} value={r} className="text-ink bg-surface">
                {r}
              </option>
            ))}
          </select>
          <select
            className={cn(selectCls, filters.zone && activeCls)}
            value={filters.zone}
            onChange={(e) => update('zone', e.target.value)}
          >
            <option value="" className="text-ink bg-surface">All Zones</option>
            {zones.map((z) => (
              <option key={z} value={z} className="text-ink bg-surface">
                {z}
              </option>
            ))}
          </select>
          <select
            className={cn(selectCls, filters.score && activeCls)}
            value={filters.score}
            onChange={(e) => update('score', e.target.value)}
          >
            <option value="" className="text-ink bg-surface">Any Rating</option>
            <option value="8">8+ (Great)</option>
            <option value="6">6+ (Good)</option>
            <option value="4">4+ (Decent)</option>
          </select>
          <select
            className={cn(selectCls, filters.price && activeCls)}
            value={filters.price}
            onChange={(e) => update('price', e.target.value)}
          >
            <option value="" className="text-ink bg-surface">Any Price</option>
            <option value="0-50">Under $50</option>
            <option value="0-100">Under $100</option>
            <option value="0-200">Under $200</option>
            <option value="0-500">Under $500</option>
            <option value="500-99999">$500+</option>
          </select>
          <span className="flex-1" />
          <select
            className={cn(selectCls, groupBy && activeCls)}
            value={groupBy}
            onChange={(e) => onGroupByChange(e.target.value as GroupBy)}
          >
            <option value="" className="text-ink bg-surface">No Grouping</option>
            <option value="sport">Group by Sport</option>
            <option value="rt">Group by Round</option>
            <option value="zone">Group by Zone</option>
            <option value="date">Group by Date</option>
          </select>
          <button
            type="button"
            onClick={onOpenBookmarks}
            className={cn(
              inputBase,
              'flex items-center gap-1.5 cursor-pointer font-semibold',
              bookmarkCount > 0 && activeCls,
            )}
          >
            <Bookmark
              size={14}
              fill={bookmarkCount > 0 ? 'var(--gold)' : 'none'}
              stroke={bookmarkCount > 0 ? 'var(--gold)' : 'currentColor'}
            />
            Saved
            {bookmarkCount > 0 && (
              <span className="bg-gold text-bg text-[0.55rem] font-bold min-w-[17px] h-[17px] rounded-full inline-flex items-center justify-center px-1">
                {bookmarkCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </>
  )
}
