import { Button } from '../../../shared/components/ui/button'

type TableContextHeaderProps = {
  tableName: string
  areaName: string
  onChangeTable: () => void
  onCancelTable: () => void
}

/**
 * Sticky header displayed when cashier is in table-flow (a table is selected).
 * Story 6.8 — UX-DR-T7: shows "Bàn X" + area name + "Đổi bàn" / "Hủy chọn bàn" buttons.
 * z-index: 20 (below PosTopAppBar z-50). Sticky relative to <main> scroll container.
 * KHÔNG render khi selectedTableId === null hoặc quickCounterMode === true — caller guards.
 */
export function TableContextHeader({ tableName, areaName, onChangeTable, onCancelTable }: TableContextHeaderProps) {
  return (
    <header
      role="banner"
      aria-label={`Đang phục vụ Bàn ${tableName}`}
      className="sticky top-0 z-20 -mx-7 -mt-6 mb-5 flex items-center justify-between gap-4 border-b border-outline-variant/50 bg-surface/95 px-7 py-3 backdrop-blur-md"
    >
      <div className="flex items-center gap-3">
        <span aria-hidden="true" className="grid h-10 w-10 place-items-center rounded-xl bg-primary-container text-on-primary-container">
          <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>table_restaurant</span>
        </span>
        <div>
          <h2 className="text-xl font-bold leading-tight tracking-tight text-on-surface">Bàn {tableName}</h2>
          <p className="text-sm text-on-surface-variant">{areaName}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button type="button" variant="secondary" onClick={onChangeTable}>
          Đổi bàn
        </Button>
        <Button type="button" variant="outline" onClick={onCancelTable}>
          Hủy chọn bàn
        </Button>
      </div>
    </header>
  )
}
