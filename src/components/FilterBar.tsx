import { Collapsible } from '@base-ui/react/collapsible'
import { Select } from '@base-ui/react/select'
import { ChevronDown, SlidersHorizontal, X } from 'lucide-react'
import { useState } from 'react'

import { roundTypes } from '@/data/sessions'
import { useStickyFilterBorder } from '@/hooks/useStickyFilterBorder'
import { cn } from '@/lib/cn'
import type { Filters, GroupBy } from '@/types/session'

interface FilterBarProps {
  filters: Filters
  onChange: (filters: Filters) => void
  groupBy: GroupBy
  onGroupByChange: (groupBy: GroupBy) => void
  sports: string[]
  zones: string[]
}

const inputBase =
  'bg-surface2 border border-border rounded-md text-ink text-[0.74rem] font-[system-ui] outline-none transition-[border-color] duration-150 px-2 py-1.5 focus:border-gold'

const selectCls = `${inputBase} filter-select`

const activeCls = 'border-gold bg-gold-dim'

const actionBtnCls =
  'flex items-center gap-1.5 shrink-0 rounded-md border border-border bg-surface2 px-2.5 py-1.5 text-[0.74rem] font-medium text-ink2 cursor-pointer transition-colors duration-150'

const actionActiveCls = 'border-gold text-gold'

const badgeCls =
  'flex size-[18px] items-center justify-center rounded-full bg-gold text-bg text-[0.6rem] font-bold'

const selectPopupCls =
  'z-50 max-h-[min(22rem,var(--available-height))] min-w-36 overflow-y-auto rounded-md border border-border bg-surface py-1 shadow-2xl outline-none'

const selectItemCls =
  'flex cursor-default items-center justify-between gap-2 px-2.5 py-1.5 text-[0.74rem] text-ink outline-none data-[highlighted]:bg-surface2 data-[selected]:text-gold'

interface FilterSelectProps {
  value: string
  placeholder: string
  options: readonly { value: string; label: string }[]
  active: boolean
  onChange: (value: string) => void
}

function activeFilterCount(filters: Filters, groupBy: GroupBy): number {
  let count = 0
  if (filters.sport) count++
  if (filters.round) count++
  if (filters.zone) count++
  if (filters.score) count++
  if (filters.price) count++
  if (groupBy) count++
  return count
}

function FilterSelect({ value, placeholder, options, active, onChange }: FilterSelectProps) {
  const items = [{ value: '', label: placeholder }, ...options]

  return (
    <Select.Root
      items={items}
      modal={false}
      value={value}
      onValueChange={(nextValue) => onChange(String(nextValue ?? ''))}
    >
      <Select.Trigger
        className={cn(selectCls, active && activeCls, 'flex items-center justify-between gap-2')}
      >
        <Select.Value />
        <Select.Icon className="text-ink3">
          <ChevronDown size={14} />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner alignItemWithTrigger={false} sideOffset={4}>
          <Select.Popup className={selectPopupCls}>
            <Select.List>
              {items.map((item) => (
                <Select.Item
                  key={item.value || placeholder}
                  value={item.value}
                  className={selectItemCls}
                >
                  <Select.ItemText>{item.label}</Select.ItemText>
                  <Select.ItemIndicator className="text-gold">✓</Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  )
}

export function FilterBar({
  filters,
  onChange,
  groupBy,
  onGroupByChange,
  sports,
  zones,
}: FilterBarProps) {
  const { sentinelRef, stuck } = useStickyFilterBorder()
  const [filtersOpen, setFiltersOpen] = useState(false)
  const activeCount = activeFilterCount(filters, groupBy)

  function update(key: keyof Filters, value: string) {
    onChange({ ...filters, [key]: value })
  }

  const searchInput = (desktop: boolean) => (
    <div className={cn('relative', !desktop && 'flex-1 min-w-0')}>
      <input
        type="text"
        placeholder="Search events..."
        value={filters.search}
        className={cn(
          inputBase,
          'placeholder:text-ink3',
          desktop ? 'w-[150px] lg:w-[220px]' : 'w-full',
          filters.search && 'pr-6',
          filters.search && activeCls,
        )}
        onChange={(e) => update('search', e.target.value)}
      />
      {filters.search && (
        <button
          type="button"
          onClick={() => update('search', '')}
          className="text-ink3 hover:text-ink absolute top-1/2 right-1.5 -translate-y-1/2 cursor-pointer transition-colors"
          aria-label="Clear search"
        >
          <X size={14} />
        </button>
      )}
    </div>
  )

  const filterSelects = (
    <>
      <FilterSelect
        placeholder="Sport"
        value={filters.sport}
        options={sports.map((s) => ({ value: s, label: s }))}
        active={!!filters.sport}
        onChange={(value) => update('sport', value)}
      />
      <FilterSelect
        placeholder="Round"
        value={filters.round}
        options={roundTypes.map((r) => ({ value: r, label: r }))}
        active={!!filters.round}
        onChange={(value) => update('round', value)}
      />
      <FilterSelect
        placeholder="Zone"
        value={filters.zone}
        options={zones.map((z) => ({ value: z, label: z }))}
        active={!!filters.zone}
        onChange={(value) => update('zone', value)}
      />
      <FilterSelect
        placeholder="Rating"
        value={filters.score}
        options={[
          { value: '8', label: '8+' },
          { value: '6', label: '6+' },
          { value: '4', label: '4+' },
        ]}
        active={!!filters.score}
        onChange={(value) => update('score', value)}
      />
      <FilterSelect
        placeholder="Price"
        value={filters.price}
        options={[
          { value: '0-50', label: '<$50' },
          { value: '0-100', label: '<$100' },
          { value: '0-200', label: '<$200' },
          { value: '0-500', label: '<$500' },
          { value: '500-99999', label: '$500+' },
        ]}
        active={!!filters.price}
        onChange={(value) => update('price', value)}
      />
    </>
  )

  const groupBySelect = (
    <FilterSelect
      placeholder="Group By"
      value={groupBy}
      options={[
        { value: 'sport', label: 'Sport' },
        { value: 'rt', label: 'Round' },
        { value: 'zone', label: 'Zone' },
        { value: 'date', label: 'Date' },
      ]}
      active={!!groupBy}
      onChange={(value) => onGroupByChange(value as GroupBy)}
    />
  )

  return (
    <>
      <div ref={sentinelRef} className="pointer-events-none m-0 h-px" aria-hidden />
      <div className={cn('sticky top-0 z-10 bg-bg', stuck && 'border-b border-border')}>
        {/* ─── Desktop: single row ─── */}
        <div className="mx-auto hidden max-w-[1400px] items-center gap-1.5 px-4 py-2.5 min-[880px]:flex">
          {searchInput(true)}
          <span className="flex-1" />
          {filterSelects}
          <span className="flex-1" />
          {groupBySelect}
        </div>

        {/* ─── Mobile / narrow: collapsible filters ─── */}
        <Collapsible.Root
          open={filtersOpen}
          onOpenChange={setFiltersOpen}
          className="mx-auto max-w-[1400px] space-y-1.5 px-3 py-2 min-[880px]:hidden"
        >
          <div className="flex gap-1.5">
            {searchInput(false)}
            <Collapsible.Trigger
              className={cn(actionBtnCls, (filtersOpen || activeCount > 0) && actionActiveCls)}
            >
              <SlidersHorizontal size={14} />
              <span>Filters</span>
              {activeCount > 0 && <span className={badgeCls}>{activeCount}</span>}
              <ChevronDown
                size={14}
                className={cn('transition-transform duration-150', filtersOpen && 'rotate-180')}
              />
            </Collapsible.Trigger>
          </div>

          <Collapsible.Panel
            keepMounted
            className="ease-panel h-[var(--collapsible-panel-height)] overflow-hidden transition-[height] duration-200 data-[closed]:h-0"
          >
            <div className="grid grid-cols-2 gap-2 pt-1 pb-0.5 max-[400px]:grid-cols-1">
              {filterSelects}
              {groupBySelect}
            </div>
          </Collapsible.Panel>
        </Collapsible.Root>
      </div>
    </>
  )
}
