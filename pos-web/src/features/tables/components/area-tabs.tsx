import type { KeyboardEvent } from 'react'
import { useRef } from 'react'
import { cn } from '../../../shared/lib/cn'
import type { AreaDto, TableDto, TableOccupancyStatus } from '../api'

type TableStatus = TableOccupancyStatus | 'inactive'

type AreaTabsProps = {
  areas: AreaDto[]
  tables: TableDto[]
  statusByTableId: Map<string, TableStatus>
  selectedAreaId: string | null
  onSelect: (areaId: string) => void
}

export function AreaTabs({ areas, tables, statusByTableId, selectedAreaId, onSelect }: AreaTabsProps) {
  const tabListRef = useRef<HTMLDivElement>(null)

  if (areas.length === 0) return null

  function getAreaCounts(area: AreaDto) {
    const activeTables = tables.filter((t) => t.areaId === area.id && t.isActive)
    const freeCount = activeTables.filter((t) => statusByTableId.get(t.id) === 'empty').length
    return { freeCount, totalCount: activeTables.length }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const tabs = tabListRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
    if (!tabs || tabs.length === 0) return

    const currentIndex = Array.from(tabs).findIndex((tab) => tab === document.activeElement)

    if (event.key === 'ArrowRight') {
      event.preventDefault()
      const nextIndex = (currentIndex + 1) % tabs.length
      tabs[nextIndex]?.focus()
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault()
      const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length
      tabs[prevIndex]?.focus()
    } else if (event.key === 'Home') {
      event.preventDefault()
      tabs[0]?.focus()
    } else if (event.key === 'End') {
      event.preventDefault()
      tabs[tabs.length - 1]?.focus()
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      const focused = document.activeElement as HTMLButtonElement
      focused?.click()
    }
  }

  return (
    <div
      ref={tabListRef}
      role="tablist"
      aria-label="Khu vực"
      className="flex overflow-x-auto gap-2 border-b border-outline-variant/30 px-4 scrollbar-thin"
      onKeyDown={handleKeyDown}
    >
      {areas.map((area) => {
        const isActive = area.id === selectedAreaId
        const { freeCount, totalCount } = getAreaCounts(area)

        return (
          <button
            key={area.id}
            role="tab"
            type="button"
            aria-selected={isActive}
            onClick={() => onSelect(area.id)}
            className={cn(
              'min-h-[44px] px-4 py-2 text-sm whitespace-nowrap border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              isActive
                ? 'border-primary font-bold text-primary'
                : 'border-transparent text-on-surface-variant hover:text-on-surface',
            )}
          >
            {area.name} · {freeCount}/{totalCount}
          </button>
        )
      })}
    </div>
  )
}
