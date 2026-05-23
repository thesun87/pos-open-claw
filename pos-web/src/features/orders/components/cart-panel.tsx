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
import { getTextInitials } from '../../../shared/lib/text-initials'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../../db/dexie'

type LineItemProps = { item: CartItem; onAskRemove: (item: CartItem) => void }

function CartLineItem({ item, onAskRemove }: LineItemProps) {
  const updateQuantity = useCartStore((state) => state.updateQuantity)
  const updateItemNote = useCartStore((state) => state.updateItemNote)
  const removeItem = useCartStore((state) => state.removeItem)
  const [isEditingNote, setIsEditingNote] = useState(false)
  const [noteDraft, setNoteDraft] = useState(item.note ?? '')
  function removeLine() { if (item.quantity > 1) onAskRemove(item); else removeItem(item.tempId) }
  const product = useLiveQuery(() => db.products.get(item.productId), [item.productId])
  const imageUrl = product?.imageUrl
  return (
    <article className="flex flex-col gap-2 p-3 bg-surface-container-lowest rounded-lg border border-outline-variant" aria-label={`Món ${item.productNameSnapshot}`}>
      <div className="flex gap-3">
        {/* Placeholder image / initials */}
        <div className="w-12 h-12 rounded-md bg-surface-container-low flex items-center justify-center font-bold text-primary text-xs select-none shrink-0 overflow-hidden">
          {imageUrl ? (
            <img src={imageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            getTextInitials(item.productNameSnapshot)
          )}
        </div>
        <div className="flex-1 flex flex-col min-w-0">
          <h4 className="font-bold text-on-surface text-sm truncate">{item.productNameSnapshot}</h4>
          <span className="text-xs text-on-surface-variant font-semibold mt-0.5">{formatVnd(item.unitPriceSnapshot)}</span>
          
          {/* Options list */}
          {item.options.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {item.options.map((option) => (
                <span key={option.optionId} className="rounded-full bg-surface-container-high px-2 py-0.5 text-[10px] font-medium text-on-surface-variant">
                  {option.labelSnapshot}{option.priceDeltaSnapshot ? ` ${option.priceDeltaSnapshot > 0 ? '+' : ''}${formatVnd(option.priceDeltaSnapshot)}` : ''}
                </span>
              ))}
            </div>
          )}

          {/* Note */}
          {item.note && (
            <p className="text-[11px] text-on-surface-variant italic mt-1.5 truncate">
              Ghi chú: {item.note}
            </p>
          )}
        </div>

        {/* Delete button */}
        <button 
          type="button" 
          aria-label={`Xóa ${item.productNameSnapshot}`} 
          onClick={removeLine} 
          className="text-on-surface-variant hover:text-error active:scale-95 transition-all self-start shrink-0"
        >
          <span aria-hidden="true" className="material-symbols-outlined text-lg">close</span>
        </button>
      </div>

      {/* Action / Quantity controls */}
      <div className="flex justify-between items-center mt-1 pt-1 border-t border-outline-variant/30">
        <button 
          type="button" 
          aria-label="Sửa ghi chú"
          onClick={() => { setNoteDraft(item.note ?? ''); setIsEditingNote((value) => !value) }} 
          className="text-primary hover:text-primary-hover text-[11px] font-medium flex items-center gap-1 transition-all"
        >
          <span aria-hidden="true" className="material-symbols-outlined text-[13px]">{item.note ? 'edit' : 'note_add'}</span>
          {item.note ? 'Sửa ghi chú' : 'Thêm ghi chú'}
        </button>

        <div className="flex items-center gap-2">
          <button 
            type="button" 
            aria-label={`Giảm ${item.productNameSnapshot}`} 
            onClick={() => updateQuantity(item.tempId, item.quantity - 1)} 
            disabled={item.quantity <= 1} 
            className="w-7 h-7 flex items-center justify-center rounded-full bg-surface-container-low text-on-surface hover:bg-surface-variant transition-colors disabled:opacity-50"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[12px]">remove</span>
          </button>
          <span aria-label="Số lượng hiện tại" className="text-xs font-semibold w-4 text-center">{item.quantity}</span>
          <button 
            type="button" 
            aria-label={`Tăng ${item.productNameSnapshot}`} 
            onClick={() => updateQuantity(item.tempId, item.quantity + 1)} 
            className="w-7 h-7 flex items-center justify-center rounded-full bg-primary-container/20 text-primary hover:bg-primary-container/30 transition-colors"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[12px]">add</span>
          </button>
        </div>
      </div>

      {/* Note editor textarea */}
      {isEditingNote && (
        <div className="mt-2 pt-2 border-t border-outline-variant/30">
          <textarea 
            id={`note-${item.tempId}`} 
            aria-label="Ghi chú món" 
            value={noteDraft} 
            maxLength={200} 
            onChange={(event) => setNoteDraft(event.target.value)} 
            className="w-full bg-surface-container-low border border-outline-variant/50 rounded p-2 text-xs focus:ring-1 focus:ring-primary outline-none" 
            rows={2} 
            placeholder="Nhập ghi chú mới..." 
          />
          <div className="flex justify-between items-center mt-1">
            <span className="text-[10px] text-on-surface-variant">Tối đa 200 ký tự</span>
            <Button type="button" size="sm" onClick={() => { updateItemNote(item.tempId, noteDraft); setIsEditingNote(false) }}>Lưu ghi chú</Button>
          </div>
        </div>
      )}
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
    <aside 
      ref={cartPanelRef} 
      className="fixed bottom-0 right-0 top-16 z-30 hidden w-[320px] flex-col border-l border-outline-variant bg-surface md:flex" 
      aria-label="Giỏ hàng và thanh toán" 
      tabIndex={0}
    >
      <header className="border-b border-outline-variant p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[18px] font-bold leading-7 text-on-surface">Đơn hiện tại</h2>
            <p className="mt-0.5 text-xs text-on-surface-variant">Đơn mới • POS01</p>
          </div>
          {hasItems ? (
            <button 
              ref={cancelButtonRef} 
              type="button" 
              onClick={() => { setCartFeedback(null); setIsVoidDialogOpen(true) }} 
              className="bg-primary-container text-on-primary-container text-xs px-2.5 py-1 rounded-full hover:brightness-95 transition-all font-semibold"
            >
              Hủy đơn
            </button>
          ) : null}
        </div>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto p-4 no-scrollbar">
        {items.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center font-body-md text-on-surface-variant">
            <span aria-hidden="true" className="material-symbols-outlined mb-3 text-6xl text-on-surface-variant/40">shopping_cart</span>
            Chọn món để bắt đầu đơn.
          </div>
        ) : (
          items.map((item) => <CartLineItem key={item.tempId} item={item} onAskRemove={setPendingRemove} />)
        )}
      </div>

      <footer aria-label="Tóm tắt thanh toán" className="pt-4 border-t border-outline-variant mt-auto flex flex-col gap-3 p-4 bg-surface">
        {cartFeedback ? <p role="status" aria-live="polite" className="rounded-xl border border-primary/20 bg-primary/10 px-3 py-2 text-xs text-on-surface">{cartFeedback}</p> : null}
        {errorMessage ? <p role="alert" className="rounded-xl border border-error/30 bg-error-container/20 px-3 py-2 text-xs text-on-error-container">{errorMessage}</p> : null}
        
        <div className="flex flex-col gap-2 mb-1 bg-surface-container-low p-3 rounded-xl">
          <div className="flex justify-between text-xs text-on-surface-variant">
            <span>Tạm tính</span>
            <span className="price font-medium">{formatVnd(totals.subtotal)}</span>
          </div>
          {totals.discount ? (
            <div className="flex justify-between text-xs text-on-surface-variant">
              <span>Giảm giá</span>
              <span className="price font-medium">-{formatVnd(totals.discountAmount)}</span>
            </div>
          ) : null}
          <div className="w-full h-px bg-outline-variant my-1"></div>
          <div className="flex justify-between text-base font-bold text-on-surface items-center">
            <span className="text-xl font-bold">Tổng tiền</span>
            <span className="total font-bold text-primary-container text-xl">{formatVnd(totals.total)}</span>
          </div>
        </div>

        <div className="flex gap-3">
          <Button 
            ref={discountButtonRef} 
            type="button" 
            variant="outline" 
            className="flex-1 h-12 rounded-xl text-sm" 
            disabled={!hasItems} 
            onClick={() => setIsDiscountModalOpen(true)}
          >
            {totals.discount ? `Giảm giá (${totals.discount.type === 'fixed' ? formatVnd(totals.discount.value) : `${totals.discount.value}%`})` : 'Giảm giá'}
          </Button>
          <Button 
            type="button" 
            className="flex-1 h-12 rounded-xl bg-primary text-on-primary font-bold shadow-md shadow-primary/25 text-sm" 
            disabled={!hasItems || isCheckingOut} 
            onClick={() => openPaymentMethodModal()}
          >
            {isCheckingOut ? 'Đang chuẩn bị...' : 'Hoàn tất đơn'}
          </Button>
        </div>
      </footer>

      <PaymentMethodModal items={items} discount={totals.discount} />
      <VoidOrderDialog open={isVoidDialogOpen} onOpenChange={handleVoidDialogOpenChange} onConfirm={handleVoidOrder} />
      <DiscountModal open={isDiscountModalOpen} onOpenChange={handleDiscountModalOpenChange} subtotal={totals.subtotal} discount={totals.discount} onApply={setDiscount} />
      <Dialog open={pendingRemove !== null} onOpenChange={(open) => { if (!open) setPendingRemove(null) }}>
        <DialogContent className="pos-theme" aria-describedby="remove-line-description">
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
