import { sports, zones, roundTypes } from '@/data/sessions'
import type { Filters, GroupBy } from '@/types/session'

interface FilterBarProps {
  filters: Filters
  onChange: (filters: Filters) => void
  groupBy: GroupBy
  onGroupByChange: (groupBy: GroupBy) => void
}

export function FilterBar({ filters, onChange, groupBy, onGroupByChange }: FilterBarProps) {
  function update(key: keyof Filters, value: string) {
    onChange({ ...filters, [key]: value })
  }

  return (
    <div className="filter-bar">
      <div className="filters">
        <input
          type="text"
          placeholder="Search events..."
          value={filters.search}
          className={filters.search ? 'active' : ''}
          onChange={(e) => update('search', e.target.value)}
        />
        <span className="filter-spacer" />
        <select
          className={filters.sport ? 'active' : ''}
          value={filters.sport}
          onChange={(e) => update('sport', e.target.value)}
        >
          <option value="">All Sports</option>
          {sports.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          className={filters.round ? 'active' : ''}
          value={filters.round}
          onChange={(e) => update('round', e.target.value)}
        >
          <option value="">All Rounds</option>
          {roundTypes.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <select
          className={filters.zone ? 'active' : ''}
          value={filters.zone}
          onChange={(e) => update('zone', e.target.value)}
        >
          <option value="">All Zones</option>
          {zones.map((z) => (
            <option key={z} value={z}>
              {z}
            </option>
          ))}
        </select>
        <select
          className={filters.score ? 'active' : ''}
          value={filters.score}
          onChange={(e) => update('score', e.target.value)}
        >
          <option value="">Any Rating</option>
          <option value="8">8+ (Great)</option>
          <option value="6">6+ (Good)</option>
          <option value="4">4+ (Decent)</option>
        </select>
        <select
          className={filters.price ? 'active' : ''}
          value={filters.price}
          onChange={(e) => update('price', e.target.value)}
        >
          <option value="">Any Price</option>
          <option value="0-50">Under $50</option>
          <option value="0-100">Under $100</option>
          <option value="0-200">Under $200</option>
          <option value="0-500">Under $500</option>
          <option value="500-99999">$500+</option>
        </select>
        <span className="filter-spacer" />
        <select
          className={groupBy ? 'active' : ''}
          value={groupBy}
          onChange={(e) => onGroupByChange(e.target.value as GroupBy)}
        >
          <option value="">No Grouping</option>
          <option value="sport">Group by Sport</option>
          <option value="rt">Group by Round</option>
          <option value="zone">Group by Zone</option>
          <option value="date">Group by Date</option>
        </select>
      </div>
    </div>
  )
}
