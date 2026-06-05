import type { ReactNode } from 'react'
import { Coffee, CloudOff, Lock, ReceiptText, TriangleAlert, Users } from 'lucide-react'
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
  serving: {
    label: 'Đang phục vụ',
    variant: 'warning',
    icon: <Users className="size-4" />,
    disabled: true,
  },
  occupied: {
    label: 'Đã có đơn',
    variant: 'accent',
    icon: <ReceiptText className="size-4" />,
    disabled: true,
  },
  conflict: {
    label: 'Xung đột phiên',
    variant: 'danger',
    icon: <TriangleAlert className="size-4" />,
    disabled: true,
  },
  pending_sync: {
    label: 'Chờ đồng bộ',
    variant: 'danger',
    icon: <CloudOff className="size-4" />,
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
}

export function TableCard({ table, status, onSelect }: TableCardProps) {
  const meta = STATUS_META[status]
  const ariaLabel = `Bàn ${table.name}, ${table.capacity} chỗ, ${meta.label}`

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      disabled={meta.disabled}
      aria-disabled={meta.disabled ? 'true' : undefined}
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
    </button>
  )
}
