import { useMemo, useRef, useState } from 'react'
import { Button } from '../../../shared/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../../shared/components/ui/dialog'
import { formatVnd } from '../../../shared/lib/format-vnd'
import { getTextInitials } from '../../../shared/lib/text-initials'
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
    <article className="flex gap-3 rounded-2xl border border-outline-variant/20 bg-surface-container p-3 shadow-sm shadow-on-surface/5" aria-label={`Món ${item.productNameSnapshot}`}>
      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary-container/70 to-surface-container-high text-sm font-bold text-primary/60">{getTextInitials(item.productNameSnapshot)}</div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2"><div><h3 className="font-bold text-on-surface">{item.productNameSnapshot}</h3><p className="price text-sm font-bold text-on-surface-variant">{formatVnd(item.unitPriceSnapshot)}</p></div><button type="button" aria-label={`Xóa ${item.productNameSnapshot}`} onClick={removeLine} className="grid h-8 w-8 place-items-center rounded-md text-error hover:bg-error-container/40"><span aria-hidden="true" className="material-symbols-outlined">close</span></button></div>
        {item.options.length > 0 ? <div className="mt-2 flex flex-wrap gap-1">{item.options.map((option) => <span key={option.optionId} className="rounded-full bg-surface-container-high px-2 py-0.5 text-[10px] text-on-surface-variant">{option.labelSnapshot}{option.priceDeltaSnapshot ? ` ${option.priceDeltaSnapshot > 0 ? '+' : ''}${formatVnd(option.priceDeltaSnapshot)}` : ''}</span>)}</div> : null}
        {item.note ? <p className="mt-1 text-sm italic text-on-surface-variant">Ghi chú: {item.note}</p> : null}
        <div className="mt-3 flex items-center justify-between gap-3"><div className="flex items-center rounded-md border border-outline-variant/30" aria-label={`Số lượng ${item.productNameSnapshot}`}><Button type="button" variant="ghost" size="icon" aria-label={`Giảm ${item.productNameSnapshot}`} onClick={() => updateQuantity(item.tempId, item.quantity - 1)} disabled={item.quantity <= 1}>−</Button><span className="min-w-8 text-center font-semibold" aria-label="Số lượng hiện tại">{item.quantity}</span><Button type="button" variant="ghost" size="icon" aria-label={`Tăng ${item.productNameSnapshot}`} onClick={() => updateQuantity(item.tempId, item.quantity + 1)}>+</Button></div><div className="total text-right font-bold">{formatVnd(item.lineTotal)}</div></div>
        <Button type="button" variant="outline" className="mt-3 w-full border-outline-variant/30" onClick={() => { setNoteDraft(item.note ?? ''); setIsEditingNote((value) => !value) }}>Sửa ghi chú</Button>
        {isEditingNote ? <div className="mt-2"><label className="text-sm font-medium" htmlFor={`note-${item.tempId}`}>Ghi chú món</label><textarea id={`note-${item.tempId}`} value={noteDraft} maxLength={200} onChange={(event) => setNoteDraft(event.target.value)} className="mt-1 min-h-20 w-full rounded-lg border border-outline-variant bg-surface px-3 py-2" /><div className="mt-2 flex items-center justify-between gap-2"><span className="text-xs text-on-surface-variant">Tối đa 200 ký tự</span><Button type="button" onClick={() => { updateItemNote(item.tempId, noteDraft); setIsEditingNote(false) }}>Lưu ghi chú</Button></div></div> : null}
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
      <div className="flex-1 space-y-3 overflow-y-auto p-4">{items.length === 0 ? <div className="flex h-full flex-col items-center justify-center text-center font-body-md text-on-surface-variant"><span aria-hidden="true" className="material-symbols-outlined mb-3 text-6xl text-on-surface-variant/40">shopping_cart</span>Chọn món để bắt đầu đơn.</div> : items.map((item) => <CartLineItem key={item.tempId} item={item} onAskRemove={setPendingRemove} />)}</div>
      <footer aria-label="Tóm tắt thanh toán" className="space-y-4 border-t border-outline-variant/20 bg-surface p-6">{cartFeedback ? <p role="status" aria-live="polite" className="rounded-xl border border-primary/20 bg-primary/10 px-3 py-2 text-sm text-on-surface">{cartFeedback}</p> : null}{errorMessage ? <p role="alert" className="rounded-xl border border-error/30 bg-error-container/20 px-3 py-2 text-sm text-on-error-container">{errorMessage}</p> : null}<dl className="space-y-2"><div className="flex justify-between"><dt>Tạm tính</dt><dd className="price">{formatVnd(totals.subtotal)}</dd></div>{totals.discount ? <div className="flex justify-between text-on-surface-variant"><dt>Giảm giá</dt><dd>-{formatVnd(totals.discountAmount)}</dd></div> : null}<div className="flex items-end justify-between border-t border-outline-variant/20 pt-3"><dt className="text-[28px] font-bold leading-9">Tổng tiền</dt><dd className="total text-[28px] font-bold leading-9">{formatVnd(totals.total)}</dd></div></dl><Button ref={discountButtonRef} type="button" variant="outline" className="w-full" disabled={!hasItems} onClick={() => setIsDiscountModalOpen(true)}>{totals.discount ? `Giảm giá (${totals.discount.type === 'fixed' ? formatVnd(totals.discount.value) : `${totals.discount.value}%`})` : 'Giảm giá'}</Button><Button type="button" className="min-h-[56px] w-full rounded-2xl bg-primary py-4 font-bold text-on-primary shadow-lg shadow-primary/25" disabled={!hasItems || isCheckingOut} onClick={() => openPaymentMethodModal()}>{isCheckingOut ? 'Đang chuẩn bị đơn...' : 'Hoàn tất đơn'}</Button></footer>
      <PaymentMethodModal items={items} discount={totals.discount} />
      <VoidOrderDialog open={isVoidDialogOpen} onOpenChange={handleVoidDialogOpenChange} onConfirm={handleVoidOrder} />
      <DiscountModal open={isDiscountModalOpen} onOpenChange={handleDiscountModalOpenChange} subtotal={totals.subtotal} discount={totals.discount} onApply={setDiscount} />
      <Dialog open={pendingRemove !== null} onOpenChange={(open) => { if (!open) setPendingRemove(null) }}><DialogContent aria-describedby="remove-line-description"><DialogHeader><DialogTitle>Xóa toàn bộ dòng món?</DialogTitle><DialogDescription id="remove-line-description">Dòng này đang có số lượng {pendingRemove?.quantity ?? 0}. Hành động này sẽ xóa toàn bộ dòng khỏi giỏ.</DialogDescription></DialogHeader><div className="mt-4 flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setPendingRemove(null)}>Giữ lại</Button><Button type="button" variant="destructive" onClick={() => { if (pendingRemove) removeItem(pendingRemove.tempId); setPendingRemove(null) }}>Xóa dòng</Button></div></DialogContent></Dialog>
    </aside>
  )
}
