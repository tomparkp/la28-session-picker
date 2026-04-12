import { Collapsible } from '@base-ui/react/collapsible'
import { Combobox } from '@base-ui/react/combobox'
import { Select } from '@base-ui/react/select'
import { Bookmark, ChevronDown, SlidersHorizontal, X } from 'lucide-react'
import { useState } from 'react'

import { roundTypes } from '@/data/sessions'
import { useStickyFilterBorder } from '@/hooks/useStickyFilterBorder'
import { cn } from '@/lib/cn'
import type { Filters } from '@/types/session'

interface FilterBarProps {
  filters: Filters
  onChange: (filters: Filters) => void
  sports: string[]
  zones: string[]
  bookmarkCount: number
  onOpenBookmarks: () => void
}

const inputBase =
  'bg-surface2 border border-border rounded-md text-ink text-[0.74rem] font-[system-ui] outline-none transition-[border-color] duration-150 px-2 py-1.5 focus:border-gold'

const selectCls = inputBase

const activeCls = 'border-gold bg-gold-dim'

const actionBtnCls =
  'flex items-center gap-1.5 shrink-0 rounded-md border border-border bg-surface2 px-2.5 py-1.5 text-[0.74rem] font-medium text-ink2 cursor-pointer transition-colors duration-150'

const actionActiveCls = 'border-gold text-gold'

const badgeCls =
  'flex size-[18px] items-center justify-center rounded-full bg-gold text-bg text-[0.6rem] font-bold'

const selectPositionerCls = 'z-50'

const selectPopupCls =
  'flex max-h-[min(22rem,var(--available-height))] min-w-[var(--anchor-width)] flex-col overflow-hidden rounded-md border border-border bg-surface shadow-2xl outline-none'

const selectListCls = 'flex-1 overflow-y-auto py-1'

const selectItemCls =
  'grid cursor-default grid-cols-[0.75rem_1fr] items-center gap-2 px-2.5 py-1.5 text-[0.74rem] text-ink outline-none data-[highlighted]:bg-surface2 data-[selected]:text-gold'

const selectTriggerCls = 'flex min-w-[7.5rem] max-w-[15rem] items-center justify-between gap-2'

const selectValueCls = 'min-w-0 flex-1 truncate text-left data-[placeholder]:text-ink3'

const popupSearchRowCls = 'flex items-center gap-2 border-b border-border px-2.5 py-1.5'

const popupSearchInputCls =
  'min-w-0 flex-1 bg-transparent text-[0.74rem] text-ink outline-none placeholder:text-ink3'

const popupActionBtnCls =
  'text-ink3 hover:text-ink flex shrink-0 cursor-pointer items-center justify-center rounded-sm transition-colors'

interface FilterOption {
  value: string
  label: string
}

interface FilterComboboxProps {
  value: string
  label: string
  placeholder: string
  options: readonly FilterOption[]
  active: boolean
  onChange: (value: string) => void
}

interface FilterSelectProps {
  value: string
  label: string
  placeholder: string
  options: readonly FilterOption[]
  active: boolean
  onChange: (value: string) => void
}

function activeFilterCount(filters: Filters): number {
  let count = 0
  if (filters.sport) count++
  if (filters.round) count++
  if (filters.zone) count++
  if (filters.score) count++
  if (filters.price) count++
  return count
}

function FilterCombobox({
  value,
  label,
  placeholder,
  options,
  active,
  onChange,
}: FilterComboboxProps) {
  return (
    <Combobox.Root
      items={options}
      modal={false}
      itemToStringLabel={(item: FilterOption) => item.label}
      value={value || null}
      onValueChange={(nextValue) => onChange(typeof nextValue === 'string' ? nextValue : '')}
    >
      <Combobox.Trigger className={cn(selectCls, active && activeCls, selectTriggerCls)}>
        <span className={selectValueCls}>
          <Combobox.Value>
            {(selectedValue: string | null) => {
              if (!selectedValue) return <span className="text-ink3">{placeholder}</span>
              return options.find((o) => o.value === selectedValue)?.label ?? selectedValue
            }}
          </Combobox.Value>
        </span>
        <span className="text-ink3 shrink-0">
          <ChevronDown size={14} />
        </span>
      </Combobox.Trigger>
      <Combobox.Portal>
        <Combobox.Positioner sideOffset={4} className={selectPositionerCls}>
          <Combobox.Popup className={selectPopupCls}>
            <div className={popupSearchRowCls}>
              <Combobox.Input
                autoFocus
                placeholder={`Search ${label.toLowerCase()}...`}
                className={popupSearchInputCls}
              />
              <Combobox.Clear
                aria-label={`Clear ${label.toLowerCase()} filter`}
                className={cn(popupActionBtnCls, 'size-5')}
              >
                <X size={12} />
              </Combobox.Clear>
            </div>
            <Combobox.Empty className="px-2.5 py-2 text-[0.72rem] text-ink3 empty:hidden">
              No matches.
            </Combobox.Empty>
            <Combobox.List className={selectListCls}>
              {(item: FilterOption) => (
                <Combobox.Item key={item.value} value={item.value} className={selectItemCls}>
                  <Combobox.ItemIndicator className="col-start-1 text-gold">
                    ✓
                  </Combobox.ItemIndicator>
                  <span className="col-start-2">{item.label}</span>
                </Combobox.Item>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  )
}

function FilterSelect({ value, label, placeholder, options, active, onChange }: FilterSelectProps) {
  return (
    <Select.Root
      items={options}
      modal={false}
      value={value || null}
      onValueChange={(nextValue) => onChange(String(nextValue ?? ''))}
    >
      <Select.Trigger className={cn(selectCls, active && activeCls, selectTriggerCls)}>
        <Select.Value className={selectValueCls} placeholder={placeholder} />
        <Select.Icon className="text-ink3">
          <ChevronDown size={14} />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner alignItemWithTrigger={false} sideOffset={4} className={selectPositionerCls}>
          <Select.Popup className={selectPopupCls}>
            {active && (
              <div className="border-b border-border px-2.5 py-1.5">
                <button
                  type="button"
                  onClick={() => onChange('')}
                  className={cn(popupActionBtnCls, 'text-[0.68rem] font-medium')}
                  aria-label={`Clear ${label.toLowerCase()} filter`}
                >
                  Clear selection
                </button>
              </div>
            )}
            <Select.List className={selectListCls}>
              {options.map((item) => (
                <Select.Item
                  key={item.value}
                  value={item.value}
                  className={selectItemCls}
                >
                  <Select.ItemIndicator className="col-start-1 text-gold">✓</Select.ItemIndicator>
                  <Select.ItemText className="col-start-2">{item.label}</Select.ItemText>
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
  sports,
  zones,
  bookmarkCount,
  onOpenBookmarks,
}: FilterBarProps) {
  const { sentinelRef, stuck } = useStickyFilterBorder()
  const [filtersOpen, setFiltersOpen] = useState(false)
  const activeCount = activeFilterCount(filters)

  function update<K extends keyof Filters>(key: K, value: Filters[K]) {
    onChange({ ...filters, [key]: value })
  }

  const savedButton = (
    <button
      type="button"
      onClick={onOpenBookmarks}
      className={cn(actionBtnCls, bookmarkCount > 0 && actionActiveCls)}
    >
      <Bookmark
        size={14}
        fill={bookmarkCount > 0 ? 'var(--gold)' : 'none'}
        stroke={bookmarkCount > 0 ? 'var(--gold)' : 'currentColor'}
      />
      <span>Saved</span>
      {bookmarkCount > 0 && <span className={badgeCls}>{bookmarkCount}</span>}
    </button>
  )

  const filterSelects = (
    <>
      <FilterCombobox
        label="Sports"
        placeholder="All Sports"
        value={filters.sport}
        options={sports.map((s) => ({ value: s, label: s }))}
        active={!!filters.sport}
        onChange={(value) => update('sport', value)}
      />
      <FilterCombobox
        label="Rounds"
        placeholder="All Rounds"
        value={filters.round}
        options={roundTypes.map((r) => ({ value: r, label: r }))}
        active={!!filters.round}
        onChange={(value) => update('round', value)}
      />
      <FilterCombobox
        label="Venues"
        placeholder="All Venues"
        value={filters.zone}
        options={zones.map((z) => ({ value: z, label: z }))}
        active={!!filters.zone}
        onChange={(value) => update('zone', value)}
      />
      <FilterSelect
        label="Rating"
        placeholder="Any Rating"
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
        label="Price"
        placeholder="Any Price"
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

  return (
    <>
      <div ref={sentinelRef} className="pointer-events-none m-0 h-px" aria-hidden />
      <div className={cn('sticky top-0 z-10 bg-bg', stuck && 'border-b border-border')}>
        {/* ─── Desktop: single row ─── */}
        <div className="mx-auto hidden max-w-[1400px] items-center gap-1.5 px-4 py-2.5 min-[880px]:flex">
          {savedButton}
          <span className="flex-1" />
          {filterSelects}
        </div>

        {/* ─── Mobile: collapsible ─── */}
        <Collapsible.Root
          open={filtersOpen}
          onOpenChange={setFiltersOpen}
          className="mx-auto max-w-[1400px] space-y-1.5 px-3 py-2 min-[880px]:hidden"
        >
          <div className="flex gap-1.5">
            {savedButton}
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
            </div>
          </Collapsible.Panel>
        </Collapsible.Root>
      </div>
    </>
  )
}
