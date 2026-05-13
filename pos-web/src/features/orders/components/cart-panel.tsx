import { useMemo, useState } from 'react'
import { Button } from '../../../shared/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../../shared/components/ui/dialog'
import { EmptyState } from '../../../shared/components/ui/empty-state'
import { formatVnd } from '../../../shared/lib/format-vnd'
import { calculateCartTotals, useCartStore } from '../cart-store'
import type { CartItem } from '../types'
import { DiscountControl } from './discount-control'

function optionText(item: CartItem) {
  return item.options.map((option) => `${option.priceDeltaSnapshot > 0 ? '+' : ''}${option.labelSnapshot}`).join(', ')
}

type LineItemProps = {
  item: CartItem
  onAskRemove: (item: CartItem) => void
}

function CartLineItem({ item, onAskRemove }: LineItemProps) {
  const updateQuantity = useCartStore((state) => state.updateQuantity)
  const updateItemNote = useCartStore((state) => state.updateItemNote)
  const removeItem = useCartStore((state) => state.removeItem)
  const [isEditingNote, setIsEditingNote] = useState(false)
  const [noteDraft, setNoteDraft] = useState(item.note ?? '')

  function removeLine() {
    if (item.quantity > 1) onAskRemove(item)
    else removeItem(item.tempId)
  }

  return (
    <article className="rounded-lg border border-border bg-surface p-3" aria-label={`Món ${item.productNameSnapshot}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-text-primary">{item.productNameSnapshot}</h3>
          {item.options.length > 0 ? <p className="mt-1 text-sm text-text-secondary">{optionText(item)}</p> : null}
          {item.note ? <p className="mt-1 text-sm italic text-text-secondary">Ghi chú: {item.note}</p> : null}
        </div>
        <Button type="button" variant="ghost" size="icon" aria-label={`Xóa ${item.productNameSnapshot}`} onClick={removeLine}>X</Button>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex items-center rounded-md border border-border" aria-label={`Số lượng ${item.productNameSnapshot}`}>
          <Button type="button" variant="ghost" size="icon" aria-label={`Giảm ${item.productNameSnapshot}`} onClick={() => updateQuantity(item.tempId, item.quantity - 1)} disabled={item.quantity <= 1}>−</Button>
          <span className="min-w-11 text-center font-semibold" aria-label="Số lượng hiện tại">{item.quantity}</span>
          <Button type="button" variant="ghost" size="icon" aria-label={`Tăng ${item.productNameSnapshot}`} onClick={() => updateQuantity(item.tempId, item.quantity + 1)}>+</Button>
        </div>
        <div className="text-right font-bold">{formatVnd(item.lineTotal)}</div>
      </div>
      <Button type="button" variant="outline" className="mt-3 w-full" onClick={() => { setNoteDraft(item.note ?? ''); setIsEditingNote((value) => !value) }}>Sửa ghi chú</Button>
      {isEditingNote ? (
        <div className="mt-2">
          <label className="text-sm font-medium" htmlFor={`note-${item.tempId}`}>Ghi chú món</label>
          <textarea id={`note-${item.tempId}`} value={noteDraft} maxLength={200} onChange={(event) => setNoteDraft(event.target.value)} className="mt-1 min-h-20 w-full rounded-md border border-border bg-surface px-3 py-2 focus-visible:outline-none" />
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="text-xs text-text-secondary">Tối đa 200 ký tự</span>
            <Button type="button" onClick={() => { updateItemNote(item.tempId, noteDraft); setIsEditingNote(false) }}>Lưu ghi chú</Button>
          </div>
        </div>
      ) : null}
    </article>
  )
}

export function CartPanel() {
  const items = useCartStore((state) => state.items)
  const discount = useCartStore((state) => state.discount)
  const setDiscount = useCartStore((state) => state.setDiscount)
  const removeItem = useCartStore((state) => state.removeItem)
  const [pendingRemove, setPendingRemove] = useState<CartItem | null>(null)
  const totals = useMemo(() => calculateCartTotals(items, discount), [discount, items])

  return (
    <aside className="flex min-h-[70vh] flex-col rounded-lg border border-border bg-surface p-6" aria-label="Giỏ hàng và thanh toán" tabIndex={0}>
      <div>
        <h2 className="text-xl font-semibold">Giỏ hàng / thanh toán</h2>
        <p className="mt-2 text-sm text-text-secondary">Panel cố định bên phải cho đơn hiện tại.</p>
      </div>
      <div className="mt-6 flex-1 space-y-3">
        {items.length === 0 ? (
          <EmptyState title="Chọn món để bắt đầu đơn." description="☕ Các món đã chọn sẽ xuất hiện ở đây." />
        ) : items.map((item) => <CartLineItem key={item.tempId} item={item} onAskRemove={setPendingRemove} />)}
      </div>
      <div className="mt-6 space-y-4 border-t border-border pt-4">
        {items.length > 0 ? <DiscountControl subtotal={totals.subtotal} discount={totals.discount} onChange={setDiscount} /> : null}
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between"><dt>Tạm tính</dt><dd>{formatVnd(totals.subtotal)}</dd></div>
          {totals.discount ? <div className="flex justify-between text-text-secondary"><dt>Giảm giá</dt><dd>-{formatVnd(totals.discountAmount)}</dd></div> : null}
          <div className="flex items-end justify-between pt-2"><dt className="font-semibold">Tổng tiền</dt><dd className="text-3xl font-bold leading-none">{formatVnd(totals.total)}</dd></div>
        </dl>
        <Button type="button" className="w-full" size="lg" disabled>Hoàn tất</Button>
      </div>
      <Dialog open={pendingRemove !== null} onOpenChange={(open) => { if (!open) setPendingRemove(null) }}>
        <DialogContent aria-describedby="remove-line-description">
          <DialogHeader>
            <DialogTitle>Xóa toàn bộ dòng món?</DialogTitle>
            <DialogDescription id="remove-line-description">Dòng này đang có số lượng {pendingRemove?.quantity ?? 0}. Hành động này sẽ xóa toàn bộ dòng khỏi giỏ.</DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setPendingRemove(null)}>Giữ lại</Button>
            <Button type="button" variant="destructive" onClick={() => { if (pendingRemove) removeItem(pendingRemove.tempId); setPendingRemove(null) }}>Xóa dòng</Button>
          </div>
        </DialogContent>
      </Dialog>
    </aside>
  )
}
