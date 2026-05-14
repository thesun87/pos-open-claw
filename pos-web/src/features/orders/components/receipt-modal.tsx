import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../../db/dexie'
import type { LocalOrderRecord } from '../../../db/schemas/orders'
import { SyncStatusBadge } from '../../../shared/components/layout/sync-status-badge'
import { Button } from '../../../shared/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../../shared/components/ui/dialog'
import { usePrint } from '../../../shared/hooks/use-print'
import type { ApiClientError } from '../../../shared/lib/api-client'
import { formatVnd } from '../../../shared/lib/format-vnd'
import { useConnectivityStore } from '../../../shared/stores/connectivity.store'
import { voidSyncedOrder } from '../api'
import type { PaymentMethod } from '../types'
import { VoidOrderDialog } from './void-order-dialog'

const PAYMENT_LABELS: Record<PaymentMethod, string> = { cash: 'Tiền mặt', transfer: 'Chuyển khoản', card: 'Thẻ' }

function formatReceiptDate(value: string) {
  const parts = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date(value))
  const pick = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? ''
  return `${pick('day')}/${pick('month')}/${pick('year')} ${pick('hour')}:${pick('minute')}`
}

function messageFromError(error: unknown) {
  return (error as ApiClientError | undefined)?.uiError?.message ?? 'Không thể void đơn. Vui lòng thử lại.'
}

export type ReceiptModalProps = { order: LocalOrderRecord | null; open: boolean; onOpenChange: (open: boolean) => void }

export function ReceiptModal({ order, open, onOpenChange }: ReceiptModalProps) {
  const print = usePrint()
  const isOnline = useConnectivityStore((state) => state.isOnline)
  const [voidDialogOpen, setVoidDialogOpen] = useState(false)
  const [isVoiding, setIsVoiding] = useState(false)
  const [voidError, setVoidError] = useState<string | null>(null)
  const [voidFeedback, setVoidFeedback] = useState<string | null>(null)
  const liveOrder = useLiveQuery(() => order ? db.orders.where('clientOrderId').equals(order.clientOrderId).first() : undefined, [order?.clientOrderId])
  const displayOrder = order ? { ...order, ...(liveOrder ?? {}), status: liveOrder?.status ?? order.status } : null
  if (!displayOrder) return null

  const isSyncedWithServer = displayOrder.status === 'synced' && Boolean(displayOrder.serverOrderId)
  const canVoidSyncedOrder = isSyncedWithServer && !displayOrder.voidedAt
  const offlineVoidBlocked = canVoidSyncedOrder && !isOnline

  async function handleVoidSyncedOrder(reason: string) {
    const currentOrder = displayOrder
    if (!currentOrder?.serverOrderId || !isOnline) return
    setIsVoiding(true)
    setVoidError(null)
    setVoidFeedback(null)
    try {
      const result = await voidSyncedOrder({ serverOrderId: currentOrder.serverOrderId, reason })
      await db.orders.update(currentOrder.clientOrderId, { voidedAt: result.voidedAt, voidReason: reason, updatedAt: new Date().toISOString() })
      setVoidFeedback(`Đã void đơn ${currentOrder.orderCode}`)
      setVoidDialogOpen(false)
    } catch (error) {
      setVoidError(messageFromError(error))
    } finally {
      setIsVoiding(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[min(94vw,36rem)] overflow-y-auto">
        <article className="receipt-print-root space-y-5" data-print-receipt>
          <DialogHeader>
            <DialogTitle asChild><h2 className="text-2xl font-bold">Hóa đơn</h2></DialogTitle>
            <DialogDescription>Hóa đơn bán hàng đã lưu cục bộ, có thể in ngay cả khi ngoại tuyến.</DialogDescription>
          </DialogHeader>
          <header className="rounded-lg border border-border bg-surface-muted p-4 text-center">
            <p className="text-sm text-text-secondary">Mã đơn</p>
            <p className="text-3xl font-bold tracking-wide">{displayOrder.orderCode}</p>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-sm text-text-secondary"><span>{formatReceiptDate(displayOrder.soldAt)}</span><SyncStatusBadge status={displayOrder.status} />{displayOrder.voidedAt ? <span className="rounded-full bg-danger/10 px-2 py-1 font-medium text-danger">Đã void</span> : null}</div>
          </header>
          {displayOrder.voidedAt ? <section aria-label="Trạng thái void" className="rounded-lg border-2 border-danger/40 bg-danger/10 p-4 text-center text-danger"><p className="text-3xl font-black tracking-widest">ĐÃ HỦY</p>{displayOrder.voidReason ? <p className="mt-2 text-sm font-medium">Lý do: {displayOrder.voidReason}</p> : null}</section> : null}
          {voidFeedback ? <p role="status" className="rounded-md border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">{voidFeedback}</p> : null}
          {voidError ? <p role="alert" className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{voidError}</p> : null}
          {offlineVoidBlocked ? <p role="note" className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning">Cần kết nối để void đơn đã đồng bộ</p> : null}
          <section aria-labelledby="receipt-details-heading" className="space-y-3">
            <h3 id="receipt-details-heading" className="text-lg font-semibold">Chi tiết</h3>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
              <dt className="text-text-secondary">Thu ngân</dt><dd className="text-right font-medium">{displayOrder.cashierId || 'Thu ngân POS'}</dd>
              <dt className="text-text-secondary">Thanh toán</dt><dd className="text-right font-medium">{PAYMENT_LABELS[displayOrder.paymentMethod]}</dd>
              {displayOrder.voidReason ? <><dt className="text-text-secondary">Lý do hủy</dt><dd className="text-right font-medium">{displayOrder.voidReason}</dd></> : null}
            </dl>
            <ul className="divide-y divide-border rounded-lg border border-border" aria-label="Danh sách món trên hóa đơn">
              {displayOrder.items.map((item, index) => <li key={`${item.productId}-${index}`} className="space-y-1 p-3"><div className="flex gap-3"><div className="min-w-0 flex-1"><p className="font-semibold">{item.productNameSnapshot}</p>{item.options.length ? <p className="text-sm text-text-secondary">{item.options.map((option) => option.labelSnapshot).join(', ')}</p> : null}{item.note ? <p className="text-sm text-text-secondary">Ghi chú: {item.note}</p> : null}</div><p className="tabular-nums">x{item.quantity}</p><p className="min-w-24 text-right font-medium tabular-nums">{formatVnd(item.lineTotal)}</p></div></li>)}
            </ul>
          </section>
          <dl className="space-y-2 rounded-lg border border-border p-4">
            {displayOrder.discountAmount > 0 ? <div className="flex justify-between text-text-secondary"><dt>Giảm giá</dt><dd>-{formatVnd(displayOrder.discountAmount)}</dd></div> : null}
            <div className="flex items-end justify-between"><dt className="text-lg font-semibold">Tổng cộng</dt><dd className="text-3xl font-bold tabular-nums">{formatVnd(displayOrder.total)}</dd></div>
          </dl>
        </article>
        <div className="receipt-actions flex gap-3 pt-2">{canVoidSyncedOrder ? <Button type="button" variant="destructive" className="flex-1" disabled={!isOnline} onClick={() => setVoidDialogOpen(true)}>Void đơn này</Button> : null}<Button type="button" className="flex-1" onClick={print}>In hóa đơn</Button><Button type="button" variant="secondary" className="flex-1" onClick={() => onOpenChange(false)}>Đóng</Button></div>
        <VoidOrderDialog open={voidDialogOpen} onOpenChange={setVoidDialogOpen} onConfirm={handleVoidSyncedOrder} isSubmitting={isVoiding} title="Void đơn đã đồng bộ?" description="Đơn đã đồng bộ sẽ được hủy trên hệ thống bằng bản ghi void riêng; hóa đơn gốc vẫn được giữ nguyên." submitLabel="Void đơn này" />
      </DialogContent>
    </Dialog>
  )
}
