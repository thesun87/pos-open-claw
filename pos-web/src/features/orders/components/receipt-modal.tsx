import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../../db/dexie'
import type { LocalOrderRecord } from '../../../db/schemas/orders'
import { SyncStatusBadge } from '../../../shared/components/layout/sync-status-badge'
import { Button } from '../../../shared/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../../shared/components/ui/dialog'
import { usePrint } from '../../../shared/hooks/use-print'
import { formatVnd } from '../../../shared/lib/format-vnd'
import type { PaymentMethod } from '../types'

const PAYMENT_LABELS: Record<PaymentMethod, string> = { cash: 'Tiền mặt', transfer: 'Chuyển khoản', card: 'Thẻ' }

function formatReceiptDate(value: string) {
  const parts = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date(value))
  const pick = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? ''
  return `${pick('day')}/${pick('month')}/${pick('year')} ${pick('hour')}:${pick('minute')}`
}

export type ReceiptModalProps = { order: LocalOrderRecord | null; open: boolean; onOpenChange: (open: boolean) => void }

export function ReceiptModal({ order, open, onOpenChange }: ReceiptModalProps) {
  const print = usePrint()
  const liveOrder = useLiveQuery(() => order ? db.orders.where('clientOrderId').equals(order.clientOrderId).first() : undefined, [order?.clientOrderId])
  const displayOrder = order ? { ...order, status: liveOrder?.status ?? order.status } : null
  if (!displayOrder) return null

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
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-sm text-text-secondary"><span>{formatReceiptDate(displayOrder.soldAt)}</span><SyncStatusBadge status={displayOrder.status} /></div>
          </header>
          <section aria-labelledby="receipt-details-heading" className="space-y-3">
            <h3 id="receipt-details-heading" className="text-lg font-semibold">Chi tiết</h3>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
              <dt className="text-text-secondary">Thu ngân</dt><dd className="text-right font-medium">{displayOrder.cashierId || 'Thu ngân POS'}</dd>
              <dt className="text-text-secondary">Thanh toán</dt><dd className="text-right font-medium">{PAYMENT_LABELS[displayOrder.paymentMethod]}</dd>
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
        <div className="receipt-actions flex gap-3 pt-2"><Button type="button" className="flex-1" onClick={print}>In hóa đơn</Button><Button type="button" variant="secondary" className="flex-1" onClick={() => onOpenChange(false)}>Đóng</Button></div>
      </DialogContent>
    </Dialog>
  )
}
