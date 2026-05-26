import { useEffect } from 'react'
import { Coffee, CloudOff, Lock, Users } from 'lucide-react'
import { LoadingSkeleton } from '../../../shared/components/ui/loading-skeleton'
import { StatusBadge } from '../../../shared/components/ui/status-badge'
import { useAreas, useTableMode, useTables, useTableStatus } from '../hooks'
import type { TableOccupancyStatus, TableDto } from '../api'
import { usePosTableContextStore } from '../store'
import { AreaTabs } from './area-tabs'
import { TableCard } from './table-card'

type TableStatus = TableOccupancyStatus | 'inactive'

const STATUS_LEGEND = [
  { label: 'Trống', variant: 'success' as const, icon: <Coffee className="size-3" /> },
  { label: 'Đang phục vụ', variant: 'warning' as const, icon: <Users className="size-3" /> },
  { label: 'Chờ đồng bộ', variant: 'danger' as const, icon: <CloudOff className="size-3" /> },
  { label: 'Tạm tắt', variant: 'neutral' as const, icon: <Lock className="size-3" /> },
]

export function FloorPlanView() {
  const { isLoading: tableModeLoading } = useTableMode()
  const areasQuery = useAreas()
  const tablesQuery = useTables()
  const statusQuery = useTableStatus()

  const areas = areasQuery.data ?? []
  const allTables = tablesQuery.data ?? []

  const selectedAreaId = usePosTableContextStore((s) => s.selectedAreaId)
  const setSelectedAreaId = usePosTableContextStore((s) => s.setSelectedAreaId)
  const setSelectedTable = usePosTableContextStore((s) => s.setSelectedTable)
  const setQuickCounterMode = usePosTableContextStore((s) => s.setQuickCounterMode)

  // Auto-select first area on mount or if stale persisted areaId no longer exists
  useEffect(() => {
    if (areas.length === 0) return
    if (!selectedAreaId) {
      setSelectedAreaId(areas[0]!.id)
      return
    }
    const areaExists = areas.some((a) => a.id === selectedAreaId)
    if (!areaExists) {
      setSelectedAreaId(areas[0]?.id ?? null)
    }
  }, [areas, selectedAreaId, setSelectedAreaId])

  // Build status map: tableId → effective status
  const statusByTableId = new Map<string, TableStatus>()
  for (const table of allTables) {
    if (!table.isActive) {
      statusByTableId.set(table.id, 'inactive')
    } else {
      // Default to 'empty' if not in status response (server only returns non-empty or all)
      statusByTableId.set(table.id, 'empty')
    }
  }
  for (const row of statusQuery.data ?? []) {
    const table = allTables.find((t) => t.id === row.tableId)
    if (table && table.isActive) {
      statusByTableId.set(row.tableId, row.status)
    }
  }

  function handleTableSelect(table: TableDto) {
    setSelectedTable({ id: table.id, name: table.name })
  }

  // --- Loading state ---
  if (tableModeLoading || tablesQuery.isLoading || areasQuery.isLoading) {
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

  // --- Error state (tables or areas failed to load) ---
  if (tablesQuery.isError || areasQuery.isError) {
    return (
      <div data-testid="floor-plan-view" className="flex flex-col items-center gap-4 p-8 text-center">
        <h2 className="text-lg font-semibold text-on-surface">Không tải được danh sách bàn</h2>
        <p className="text-sm text-on-surface-variant">
          Vui lòng thử lại. Dữ liệu kỹ thuật đã được ẩn để bảo vệ hệ thống.
        </p>
        <button
          type="button"
          onClick={() => {
            void tablesQuery.refetch()
            void areasQuery.refetch()
          }}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:bg-primary/90 transition-colors"
        >
          Thử lại
        </button>
      </div>
    )
  }

  // --- Empty state (no tables or areas configured) ---
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

  // Filter tables by selected area
  const filteredTables = allTables.filter((t) => t.areaId === selectedAreaId)

  return (
    <div data-testid="floor-plan-view" className="flex flex-col gap-0">
      {/* Status error banner */}
      {statusQuery.isError ? (
        <div
          role="alert"
          className="mx-4 mt-4 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning"
        >
          Không cập nhật được trạng thái bàn. Sẽ tự thử lại.
        </div>
      ) : null}

      {/* Area tabs */}
      <AreaTabs
        areas={areas}
        tables={allTables}
        statusByTableId={statusByTableId}
        selectedAreaId={selectedAreaId}
        onSelect={setSelectedAreaId}
      />

      {/* Table grid */}
      <div
        className="grid grid-cols-2 gap-4 p-4 transition-opacity duration-150 lg:grid-cols-3 xl:grid-cols-4"
        aria-label="Sơ đồ bàn"
      >
        {filteredTables.map((table) => (
          <TableCard
            key={table.id}
            table={table}
            status={statusByTableId.get(table.id) ?? 'empty'}
            onSelect={handleTableSelect}
          />
        ))}
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
