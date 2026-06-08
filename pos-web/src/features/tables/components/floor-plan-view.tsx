import { useEffect } from 'react'
import { AlertTriangle, Coffee, DoorOpen, Lock, Users } from 'lucide-react'
import { LoadingSkeleton } from '../../../shared/components/ui/loading-skeleton'
import { StatusBadge } from '../../../shared/components/ui/status-badge'
import { useConnectivityStore } from '../../../shared/stores/connectivity.store'
import { useCachedAreas, useCachedTables } from '../cache-hooks'
import { useTableStatus } from '../hooks'
import { useLocalTableStatus, toDisplayStatus } from '../status-derivation'
import type { TableDisplayStatus } from '../api'
import { usePosTableContextStore } from '../store'
import { AreaTabs } from './area-tabs'
import { TableCard } from './table-card'

const STATUS_LEGEND = [
  { label: 'Trống', variant: 'success' as const, icon: <Coffee className="size-3" /> },
  { label: 'Đang mở', variant: 'accent' as const, icon: <DoorOpen className="size-3" /> },
  { label: 'Đang có đơn', variant: 'warning' as const, icon: <Users className="size-3" /> },
  { label: 'Xung đột phiên', variant: 'danger' as const, icon: <AlertTriangle className="size-3" /> },
  { label: 'Tạm tắt', variant: 'neutral' as const, icon: <Lock className="size-3" /> },
]

type FloorPlanViewProps = {
  /**
   * Story 6.13: Set of tableIds that have a local draft on this device.
   * Tables in this set are enabled (clickable) even if their status is serving,
   * so the cashier can reopen and reload items (AC9).
   * Boundary: passed from pos-shell.tsx (route-level) to avoid features/tables ↔ features/orders cross-import.
   */
  reopenableTableIds?: Set<string>
}

export function FloorPlanView({ reopenableTableIds = new Set() }: FloorPlanViewProps) {
  // Offline-first data sources (Story 6.10 cache hooks — Dexie via useLiveQuery)
  const areasCache = useCachedAreas()    // undefined = loading, [] = empty cache
  const tablesCache = useCachedTables() // undefined = loading, [] = empty cache

  // Online enhancement: fetch /tables/status for cross-device occupancy merge
  // paused when offline (isOnline gate in hooks.ts — AC2)
  const statusQuery = useTableStatus()

  // Local derivation — merge local Dexie data + optional server status
  const statusMap = useLocalTableStatus(statusQuery.data)

  const isOnline = useConnectivityStore((s) => s.isOnline)

  const selectedAreaId = usePosTableContextStore((s) => s.selectedAreaId)
  const setSelectedAreaId = usePosTableContextStore((s) => s.setSelectedAreaId)
  const setSelectedTable = usePosTableContextStore((s) => s.setSelectedTable)
  const setQuickCounterMode = usePosTableContextStore((s) => s.setQuickCounterMode)

  // Stable references (undefined while loading)
  const areas = areasCache
  const allTables = tablesCache

  // Auto-select first area on mount or if stale persisted areaId no longer exists
  useEffect(() => {
    if (!areas || areas.length === 0) return
    if (!selectedAreaId) {
      setSelectedAreaId(areas[0]!.id)
      return
    }
    const areaExists = areas.some((a) => a.id === selectedAreaId)
    if (!areaExists) {
      setSelectedAreaId(areas[0]?.id ?? null)
    }
  }, [areas, selectedAreaId, setSelectedAreaId])

  // --- Loading state (§5.F: useLiveQuery undefined = still loading) ---
  if (areas === undefined || allTables === undefined || statusMap === undefined) {
    return (
      <div data-testid="floor-plan-view" className="flex flex-col gap-4 p-4">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <LoadingSkeleton.Card key={i} className="min-h-[88px] rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }

  // --- Empty state (cache populated but no tables/areas configured — UX-DR-T9) ---
  if (allTables.length === 0 || areas.length === 0) {
    return (
      <div data-testid="floor-plan-view" className="flex flex-col items-center gap-4 p-8 text-center">
        <p className="font-medium text-on-surface">
          Chưa cấu hình bàn. Vui lòng liên hệ quản trị viên để thêm bàn cho store.
        </p>
        <button
          type="button"
          onClick={() => setQuickCounterMode(true)}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:bg-primary/90 transition-colors"
        >
          Vào Bán hàng nhanh
        </button>
      </div>
    )
  }

  // Build display status map: tableId → TableDisplayStatus (AC4/AC5/AC9)
  const displayStatusMap = new Map<string, TableDisplayStatus>()
  for (const table of allTables) {
    const derived = statusMap.get(table.id)
    displayStatusMap.set(table.id, toDisplayStatus(table, derived))
  }

  function handleTableSelect(tableId: string, tableName: string) {
    setSelectedTable({ id: tableId, name: tableName })
  }

  // Filter tables by selected area
  const filteredTables = allTables.filter((t) => t.areaId === selectedAreaId)

  return (
    <div data-testid="floor-plan-view" className="flex flex-col gap-0">
      {/* Page header */}
      <div className="px-4 pt-5 pb-1">
        <h1 className="text-headline-lg text-on-surface">Chọn bàn</h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          Nhấp vào bàn trống để bắt đầu phục vụ khách
        </p>
      </div>

      {/* Offline indicator banner (AC6) */}
      {!isOnline ? (
        <div
          role="status"
          className="mx-4 mt-4 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning"
        >
          Đang offline — trạng thái bàn lấy từ bộ nhớ cục bộ
        </div>
      ) : null}

      {/* Area tabs — AreaRecord is structurally compatible with what AreaTabs needs */}
      <AreaTabs
        areas={areas}
        tables={allTables}
        statusByTableId={displayStatusMap}
        selectedAreaId={selectedAreaId}
        onSelect={setSelectedAreaId}
      />

      {/* Table grid */}
      <div
        className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4 p-4 transition-opacity duration-150"
        aria-label="Sơ đồ bàn"
      >
        {filteredTables.map((table) => {
          const derived = statusMap.get(table.id)
          return (
            <TableCard
              key={table.id}
              table={table}
              status={displayStatusMap.get(table.id) ?? 'empty'}
              hasLocalDraft={reopenableTableIds.has(table.id)}
              orderTotal={derived?.orderTotal ?? 0}
              itemCount={derived?.itemCount ?? 0}
              {...(derived?.openedAt ? { openedAt: derived.openedAt } : {})}
              onSelect={(t) => handleTableSelect(t.id, t.name)}
            />
          )
        })}
      </div>

      {/* Status legend (decorative) */}
      <div
        aria-hidden="true"
        className="flex flex-wrap justify-end gap-2 px-4 pb-4 pt-2"
      >
        {STATUS_LEGEND.map(({ label, variant, icon }) => (
          <StatusBadge key={label} variant={variant} label={label} icon={icon} />
        ))}
      </div>
    </div>
  )
}
