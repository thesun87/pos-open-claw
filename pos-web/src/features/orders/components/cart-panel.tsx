import { useMemo, useRef, useState } from 'react'
import { Button } from '../../../shared/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../../shared/components/ui/dialog'
import { formatVnd } from '../../../shared/lib/format-vnd'
import { calculateCartTotals, useCartStore } from '../cart-store'
import { useCheckoutStore } from '../checkout-store'
import type { CartItem } from '../types'
import { DiscountModal } from './discount-modal'
import { PaymentMethodModal } from './payment-method-modal'
import { VoidOrderDialog } from './void-order-dialog'

type LineItemProps = { item: CartItem; onAskRemove: (item: CartItem) => void }

function CartLineItem({ item, onAskRemove }: LineItemProps) {
  const updateQuantity = useCartStore((state) => state.updateQuantity)
  const updateItemNote = useCartStore((state) => state.updateItemNote)
  const removeItem = useCartStore((state) => state.removeItem)
  const [isEditingNote, setIsEditingNote] = useState(false)
  const [noteDraft, setNoteDraft] = useState(item.note ?? '')
  function removeLine() { if (item.quantity > 1) onAskRemove(item); else removeItem(item.tempId) }
  return (
    <article className="bg-surface-container-lowest border border-outline-variant/50 rounded-lg p-3 shadow-sm" aria-label={`Món ${item.productNameSnapshot}`}>
      <div className="flex justify-between items-start">
        <h3 className="font-bold text-on-surface line-clamp-1">{item.productNameSnapshot}</h3>
        <button type="button" aria-label={`Xóa ${item.productNameSnapshot}`} onClick={removeLine} className="text-on-surface-variant hover:text-error active:scale-95 transition-all">
          <span aria-hidden="true" className="material-symbols-outlined">close</span>
        </button>
      </div>
      <div className="flex items-center gap-1 mt-1 flex-wrap">
        <span className="text-sm font-medium text-on-surface-variant">{formatVnd(item.unitPriceSnapshot)}</span>
        {item.options.map((option) => (
          <span key={option.optionId} className="px-1 py-[2px] bg-secondary-container text-on-secondary-container text-xs rounded-[4px]">
            {option.labelSnapshot}{option.priceDeltaSnapshot ? ` ${option.priceDeltaSnapshot > 0 ? '+' : ''}${formatVnd(option.priceDeltaSnapshot)}` : ''}
          </span>
        ))}
      </div>
      <div className="mt-1">
        {item.note ? <p className="text-sm text-on-surface-variant italic">Ghi chú: {item.note}</p> : null}
        <button type="button" onClick={() => { setNoteDraft(item.note ?? ''); setIsEditingNote((value) => !value) }} className="mt-1 text-primary text-sm font-medium flex items-center gap-1 hover:underline active:opacity-70 transition-all">
          <span aria-hidden="true" className="material-symbols-outlined" style={{ fontSize: '14px' }}>{item.note ? 'edit' : 'add_comment'}</span>
          {item.note ? 'Sửa ghi chú' : 'Thêm ghi chú'}
        </button>
      </div>
      {isEditingNote && (
        <div className="mt-2 pt-2 border-t border-outline-variant/50">
          <textarea id={`note-${item.tempId}`} value={noteDraft} maxLength={200} onChange={(event) => setNoteDraft(event.target.value)} className="w-full bg-surface-container-low border border-outline-variant/50 rounded p-2 text-sm focus:ring-1 focus:ring-primary outline-none" rows={2} placeholder="Nhập ghi chú mới..." />
          <div className="flex justify-between items-center mt-1">
            <span className="text-xs text-on-surface-variant">Tối đa 200 ký tự</span>
            <Button type="button" size="sm" onClick={() => { updateItemNote(item.tempId, noteDraft); setIsEditingNote(false) }}>Lưu</Button>
          </div>
        </div>
      )}
      <div className="flex justify-between items-center mt-2 pt-2 border-t border-outline-variant/30">
        <div className="flex items-center bg-surface-container-high rounded-lg overflow-hidden" aria-label={`Số lượng ${item.productNameSnapshot}`}>
          <button type="button" aria-label={`Giảm ${item.productNameSnapshot}`} onClick={() => updateQuantity(item.tempId, item.quantity - 1)} disabled={item.quantity <= 1} className="w-8 h-8 flex items-center justify-center text-primary hover:bg-primary-container active:scale-90 transition-all disabled:opacity-50 disabled:active:scale-100">
            <span aria-hidden="true" className="material-symbols-outlined">remove</span>
          </button>
          <span className="w-10 text-center font-bold" aria-label="Số lượng hiện tại">{item.quantity}</span>
          <button type="button" aria-label={`Tăng ${item.productNameSnapshot}`} onClick={() => updateQuantity(item.tempId, item.quantity + 1)} className="w-8 h-8 flex items-center justify-center text-primary hover:bg-primary-container active:scale-90 transition-all">
            <span aria-hidden="true" className="material-symbols-outlined">add</span>
          </button>
        </div>
        <div className="text-right">
          <span className="font-bold text-primary">{formatVnd(item.lineTotal)}</span>
        </div>
      </div>
    </article>
  )
}

export function CartPanel() {
  const items = useCartStore((state) => state.items)
  const discount = useCartStore((state) => state.discount)
  const setDiscount = useCartStore((state) => state.setDiscount)
  const removeItem = useCartStore((state) => state.removeItem)
  const resetCart = useCartStore((state) => state.resetCart)
  const resetCheckoutState = useCheckoutStore((state) => state.resetCheckoutState)
  const openPaymentMethodModal = useCheckoutStore((state) => state.openPaymentMethodModal)
  const isCheckingOut = useCheckoutStore((state) => state.isCheckingOut)
  const errorMessage = useCheckoutStore((state) => state.errorMessage)
  const [pendingRemove, setPendingRemove] = useState<CartItem | null>(null)
  const [isVoidDialogOpen, setIsVoidDialogOpen] = useState(false)
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false)
  const [cartFeedback, setCartFeedback] = useState<string | null>(null)
  const cancelButtonRef = useRef<HTMLButtonElement>(null)
  const discountButtonRef = useRef<HTMLButtonElement>(null)
  const cartPanelRef = useRef<HTMLElement>(null)
  const totals = useMemo(() => calculateCartTotals(items, discount), [discount, items])
  const hasItems = items.length > 0
  function focusCartAfterVoidDialogClose() { window.setTimeout(() => { if (cancelButtonRef.current && items.length > 0) cancelButtonRef.current.focus(); else cartPanelRef.current?.focus() }, 0) }
  function handleVoidDialogOpenChange(open: boolean) { setIsVoidDialogOpen(open); if (!open) focusCartAfterVoidDialogClose() }
  function handleVoidOrder() { resetCart(); resetCheckoutState(); setCartFeedback('Đã hủy đơn'); setIsVoidDialogOpen(false); window.setTimeout(() => cartPanelRef.current?.focus(), 0) }
  function handleDiscountModalOpenChange(open: boolean) { setIsDiscountModalOpen(open); if (!open) window.setTimeout(() => discountButtonRef.current?.focus(), 0) }
  return (
    <aside ref={cartPanelRef} className="fixed bottom-0 right-0 top-16 z-30 hidden w-[380px] flex-col border-l border-outline-variant/20 bg-surface/95 shadow-2xl shadow-on-surface/15 backdrop-blur-2xl md:flex" aria-label="Giỏ hàng và thanh toán" tabIndex={0}>
      <header className="border-b border-outline-variant/20 p-6"><div className="flex items-start justify-between gap-3"><div><h2 className="text-[24px] font-semibold leading-8 text-on-surface">Đơn hiện tại</h2><p className="mt-1 font-label-sm text-on-surface-variant">Đơn mới • POS01</p></div>{hasItems ? <button ref={cancelButtonRef} type="button" onClick={() => { setCartFeedback(null); setIsVoidDialogOpen(true) }} className="font-label-sm text-error hover:underline">Hủy đơn</button> : null}</div></header>
      <div className="flex-1 space-y-2 overflow-y-auto p-4">{items.length === 0 ? <div className="flex h-full flex-col items-center justify-center text-center font-body-md text-on-surface-variant"><span aria-hidden="true" className="material-symbols-outlined mb-3 text-6xl text-on-surface-variant/40">shopping_cart</span>Chọn món để bắt đầu đơn.</div> : items.map((item) => <CartLineItem key={item.tempId} item={item} onAskRemove={setPendingRemove} />)}</div>
      <footer aria-label="Tóm tắt thanh toán" className="space-y-2 border-t border-outline-variant/20 bg-surface p-4">{cartFeedback ? <p role="status" aria-live="polite" className="rounded-xl border border-primary/20 bg-primary/10 px-3 py-2 text-sm text-on-surface">{cartFeedback}</p> : null}{errorMessage ? <p role="alert" className="rounded-xl border border-error/30 bg-error-container/20 px-3 py-2 text-sm text-on-error-container">{errorMessage}</p> : null}<dl className="space-y-1 text-sm"><div className="flex justify-between"><dt className="text-on-surface-variant">Tạm tính</dt><dd className="price font-medium">{formatVnd(totals.subtotal)}</dd></div>{totals.discount ? <div className="flex justify-between text-on-surface-variant"><dt>Giảm giá</dt><dd>-{formatVnd(totals.discountAmount)}</dd></div> : null}<div className="flex items-center justify-between border-t border-outline-variant/20 pt-2"><dt className="text-lg font-bold text-on-surface-variant">Tổng tiền</dt><dd className="total text-xl font-bold text-primary">{formatVnd(totals.total)}</dd></div></dl><div className="flex gap-2"><Button ref={discountButtonRef} type="button" variant="outline" className="w-1/3" disabled={!hasItems} onClick={() => setIsDiscountModalOpen(true)}>{totals.discount ? `Giảm (${totals.discount.type === 'fixed' ? formatVnd(totals.discount.value) : `${totals.discount.value}%`})` : 'Giảm giá'}</Button><Button type="button" className="min-h-[44px] flex-1 rounded-xl bg-primary py-2 font-bold text-on-primary shadow-md shadow-primary/25" disabled={!hasItems || isCheckingOut} onClick={() => openPaymentMethodModal()}>{isCheckingOut ? 'Đang chuẩn bị...' : 'Thanh toán'}</Button></div></footer>
      <PaymentMethodModal items={items} discount={totals.discount} />
      <VoidOrderDialog open={isVoidDialogOpen} onOpenChange={handleVoidDialogOpenChange} onConfirm={handleVoidOrder} />
      <DiscountModal open={isDiscountModalOpen} onOpenChange={handleDiscountModalOpenChange} subtotal={totals.subtotal} discount={totals.discount} onApply={setDiscount} />
      <Dialog open={pendingRemove !== null} onOpenChange={(open) => { if (!open) setPendingRemove(null) }}><DialogContent aria-describedby="remove-line-description"><DialogHeader><DialogTitle>Xóa toàn bộ dòng món?</DialogTitle><DialogDescription id="remove-line-description">Dòng này đang có số lượng {pendingRemove?.quantity ?? 0}. Hành động này sẽ xóa toàn bộ dòng khỏi giỏ.</DialogDescription></DialogHeader><div className="mt-4 flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setPendingRemove(null)}>Giữ lại</Button><Button type="button" variant="destructive" onClick={() => { if (pendingRemove) removeItem(pendingRemove.tempId); setPendingRemove(null) }}>Xóa dòng</Button></div></DialogContent></Dialog>
    </aside>
  )
}
