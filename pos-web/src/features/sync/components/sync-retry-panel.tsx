import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import { db } from '../../../db/dexie'
import type { LocalOrderRecord } from '../../../db/schemas/orders'
import { SyncStatusBadge } from '../../../shared/components/layout/sync-status-badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../../shared/components/ui/dialog'
import { formatVnd } from '../../../shared/lib/format-vnd'
import { syncEngine } from '../engine'

const SAFE_FAIL_REASON = 'Chưa đồng bộ được. Hệ thống sẽ thử lại khi có mạng.'

type ActionState = { type: 'single'; clientOrderId: string } | { type: 'all' } | null

export interface SyncRetryPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function formatSoldAt(value: string): string {
  const parts = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date(value))
  const pick = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? ''
  return `${pick('day')}/${pick('month')}/${pick('year')} ${pick('hour')}:${pick('minute')}`
}

function resetOrderRecord(order: LocalOrderRecord, nowIso: string): void {
  order.status = 'pendingSync'
  order.failReason = null
  order.updatedAt = nowIso
  order.lastTriedAt = nowIso
}

async function resetOrderForRetry(clientOrderId: string): Promise<void> {
  const nowIso = new Date().toISOString()
  await db.orders.update(clientOrderId, (order) => resetOrderRecord(order, nowIso))
}

async function resetAllFailedForRetry(orders: LocalOrderRecord[]): Promise<void> {
  const nowIso = new Date().toISOString()
  const failedOrderIds = orders.filter((order) => order.status === 'syncFailed').map((order) => order.clientOrderId)
  if (!failedOrderIds.length) return
  await db.transaction('rw', db.orders, async () => {
    await Promise.all(failedOrderIds.map((clientOrderId) => db.orders.update(clientOrderId, (order) => resetOrderRecord(order, nowIso))))
  })
}

export function SyncRetryPanel({ open, onOpenChange }: SyncRetryPanelProps) {
  const [actionState, setActionState] = useState<ActionState>(null)
  const orders = useLiveQuery(async () => {
    const [pending, failed] = await Promise.all([db.orders.where('status').equals('pendingSync').toArray(), db.orders.where('status').equals('syncFailed').toArray()])
    return [...pending, ...failed].sort((a, b) => b.soldAt.localeCompare(a.soldAt))
  }, [], [])

  const hasFailedOrders = useMemo(() => orders.some((order) => order.status === 'syncFailed'), [orders])
  const isBusy = actionState !== null

  async function handleRetryOne(clientOrderId: string) {
    setActionState({ type: 'single', clientOrderId })
    try {
      await resetOrderForRetry(clientOrderId)
      syncEngine.kick()
    } finally {
      setActionState(null)
    }
  }

  async function handleRetryAll() {
    setActionState({ type: 'all' })
    try {
      await resetAllFailedForRetry(orders)
      syncEngine.kick()
    } finally {
      setActionState(null)
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!isBusy) onOpenChange(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[88vh] w-[min(96vw,44rem)] flex-col gap-4 overflow-hidden p-0">
        <DialogHeader className="border-b border-border px-5 py-4">
          <div className="flex items-start justify-between gap-4 pr-8">
            <div>
              <DialogTitle>Đồng bộ đơn hàng</DialogTitle>
              <DialogDescription>Kiểm tra các đơn đang chờ đồng bộ và thử lại khi cần.</DialogDescription>
            </div>
            <button type="button" onClick={handleRetryAll} disabled={!hasFailedOrders || isBusy} className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50">
              Đồng bộ tất cả
            </button>
          </div>
        </DialogHeader>

        {orders.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-text-secondary">Không có đơn chờ đồng bộ.</div>
        ) : (
          <ul className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 pb-5" aria-label="Danh sách đơn chờ đồng bộ">
            {orders.map((order) => {
              const isRetryingThis = actionState?.type === 'single' && actionState.clientOrderId === order.clientOrderId
              return (
                <li key={order.clientOrderId} className="rounded-lg border border-border bg-bg p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-text-primary">{order.orderCode}</p>
                        <SyncStatusBadge status={order.status} />
                      </div>
                      <p className="text-sm text-text-secondary">{formatSoldAt(order.soldAt)}</p>
                      {order.status === 'syncFailed' ? <p className="text-sm text-text-secondary">{SAFE_FAIL_REASON}</p> : null}
                    </div>
                    <div className="text-right">
                      <p className="font-semibold tabular-nums">{formatVnd(order.total)}</p>
                      <button type="button" onClick={() => void handleRetryOne(order.clientOrderId)} disabled={isBusy} className="mt-2 rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50" aria-label={`Thử đồng bộ lại đơn ${order.orderCode}`}>
                        {isRetryingThis ? 'Đang chuẩn bị...' : 'Thử đồng bộ lại'}
                      </button>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  )
}

export { SAFE_FAIL_REASON as SYNC_SAFE_FAIL_REASON }
