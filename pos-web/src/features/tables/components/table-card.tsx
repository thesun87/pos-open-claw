import type { ReactNode } from 'react'
import { Coffee, DoorOpen, Lock, TriangleAlert, Users } from 'lucide-react'
import { StatusBadge, type StatusBadgeVariant } from '../../../shared/components/ui/status-badge'
import { cn } from '../../../shared/lib/cn'
import type { TableDisplayStatus } from '../api'

/** Minimal table shape used by TableCard — satisfied by both TableDto and TableRecord (Dexie) */
type TableShape = {
  id: string
  name: string
  capacity: number
}

type StatusMeta = {
  label: string
  variant: StatusBadgeVariant
  icon: ReactNode
  disabled: boolean
}

const STATUS_META: Record<TableDisplayStatus, StatusMeta> = {
  empty: {
    label: 'Trống',
    variant: 'success',
    icon: <Coffee className="size-4" />,
    disabled: false,
  },
  opening: {
    label: 'Đang mở',
    variant: 'accent',
    icon: <DoorOpen className="size-4" />,
    disabled: true,
  },
  serving: {
    label: 'Đang có đơn',
    variant: 'warning',
    icon: <Users className="size-4" />,
    disabled: true,
  },
  conflict: {
    label: 'Xung đột phiên',
    variant: 'danger',
    icon: <TriangleAlert className="size-4" />,
    disabled: true,
  },
  inactive: {
    label: 'Tạm tắt',
    variant: 'neutral',
    icon: <Lock className="size-4" />,
    disabled: true,
  },
}

type TableCardProps = {
  table: TableShape
  status: TableDisplayStatus
  onSelect: (table: TableShape) => void
  /**
   * Story 6.13: When true, this table has a local draft (items saved on this device).
   * Overrides the status-based `disabled` flag so cashier can re-open and reload items (AC9).
   * Tables with drafts show a "Tiếp tục" badge (optional visual cue).
   * An 'opening' table (open session, no local draft — incl. cross-device opens) stays disabled
   * (Epic 7 handles cross-device reopen); a 'serving' table always has a local draft → reopenable.
   */
  hasLocalDraft?: boolean
}

export function TableCard({ table, status, onSelect, hasLocalDraft = false }: TableCardProps) {
  const meta = STATUS_META[status]
  // Story 6.13 (AC9): tables with a local draft override the status-based disabled flag.
  // disabled = status says disabled AND no local draft (cannot reopen cross-device tables).
  const isDisabled = meta.disabled && !hasLocalDraft
  const ariaLabel = `Bàn ${table.name}, ${table.capacity} chỗ, ${meta.label}${hasLocalDraft ? ' — Tiếp tục' : ''}`

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      disabled={isDisabled}
      aria-disabled={isDisabled ? 'true' : undefined}
      onClick={() => onSelect(table)}
      className={cn(
        'min-h-[88px] min-w-[88px] p-4 rounded-2xl border border-outline-variant/30 bg-surface',
        'flex flex-col gap-2 items-start text-left transition-all',
        'active:scale-95 hover:bg-surface-container',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        'disabled:opacity-60 disabled:cursor-not-allowed',
      )}
    >
      <span className="text-2xl font-bold text-on-surface leading-tight">{table.name}</span>
      <span className="text-sm text-on-surface-variant">{table.capacity} chỗ</span>
      <StatusBadge variant={meta.variant} label={meta.label} icon={meta.icon} />
      {/* Story 6.13 (AC9): optional visual cue for tables with a local draft */}
      {hasLocalDraft ? (
        <span className="text-xs font-medium text-warning">Tiếp tục</span>
      ) : null}
    </button>
  )
}
