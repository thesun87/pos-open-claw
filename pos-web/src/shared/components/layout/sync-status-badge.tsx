import type { OrderSyncStatus } from '../../../db/schemas/orders'
import { cn } from '../../lib/cn'

const LABELS: Record<OrderSyncStatus, string> = {
  pendingSync: 'Chờ đồng bộ',
  synced: 'Đã đồng bộ',
  syncFailed: 'Lỗi đồng bộ',
}

const STYLES: Record<OrderSyncStatus, string> = {
  pendingSync: 'border-warning/40 bg-warning/10 text-warning',
  synced: 'border-success/40 bg-success/10 text-success',
  syncFailed: 'border-danger/40 bg-danger/10 text-danger',
}

export function SyncStatusBadge({ status }: { status: OrderSyncStatus }) {
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold', STYLES[status])} aria-label={`Trạng thái đồng bộ: ${LABELS[status]}`}>
      {LABELS[status]}
    </span>
  )
}
