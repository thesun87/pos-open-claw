import { useEffect, useRef } from 'react'
import { Button } from '../../../shared/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../../shared/components/ui/dialog'
import { finalizeOrder } from '../api'
import { useCartStore } from '../cart-store'
import { useCheckoutStore } from '../checkout-store'
import type { CartDiscount, CartItem } from '../types'
import { PaymentMethodSelector } from './payment-method-selector'

type PaymentMethodModalProps = {
  items: CartItem[]
  discount: CartDiscount | null
  tableId?: string | null
  tableNameSnapshot?: string | null
}

export function PaymentMethodModal({ items, discount, tableId, tableNameSnapshot }: PaymentMethodModalProps) {
  const paymentMethod = useCheckoutStore((state) => state.paymentMethod)
  const isCheckingOut = useCheckoutStore((state) => state.isCheckingOut)
  const isPaymentMethodModalOpen = useCheckoutStore((state) => state.isPaymentMethodModalOpen)
  const errorMessage = useCheckoutStore((state) => state.errorMessage)
  const setPaymentMethod = useCheckoutStore((state) => state.setPaymentMethod)
  const closePaymentMethodModal = useCheckoutStore((state) => state.closePaymentMethodModal)
  const startCheckout = useCheckoutStore((state) => state.startCheckout)
  const completeCheckout = useCheckoutStore((state) => state.completeCheckout)
  const failCheckout = useCheckoutStore((state) => state.failCheckout)
  const resetCart = useCartStore((state) => state.resetCart)
  const cashRadioRef = useRef<HTMLInputElement>(null)
  const triggerRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (isPaymentMethodModalOpen) {
      triggerRef.current = document.activeElement as HTMLElement
      window.setTimeout(() => cashRadioRef.current?.focus(), 0)
    } else if (triggerRef.current) {
      window.setTimeout(() => triggerRef.current?.focus(), 0)
      triggerRef.current = null
    }
  }, [isPaymentMethodModalOpen])

  function handleCancel() {
    if (isCheckingOut) return
    closePaymentMethodModal()
  }

  async function handleConfirm() {
    if (items.length === 0 || isCheckingOut) return
    startCheckout()
    try {
      const order = await finalizeOrder({ cart: { items, discount, tableId: tableId ?? null, tableNameSnapshot: tableNameSnapshot ?? null }, paymentMethod, deviceId: 'POS01' })
      // Capture tableId BEFORE resetCart() clears it (AC26 fix: settle-on-finalize wiring)
      const finalizedTableId = tableId ?? null
      resetCart()
      completeCheckout(order)
      window.dispatchEvent(new CustomEvent('order.finalized', { detail: { at: new Date().toISOString(), clientOrderId: order.clientOrderId, orderCode: order.orderCode, tableId: finalizedTableId } }))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không thể lưu đơn. Vui lòng thử lại.'
      failCheckout(message)
    }
  }

  return (
    <Dialog open={isPaymentMethodModalOpen} onOpenChange={(open) => { if (!open && !isCheckingOut) handleCancel() }}>
      <DialogContent className="pos-theme" onEscapeKeyDown={(e) => { if (isCheckingOut) e.preventDefault() }} onPointerDownOutside={(e) => { if (isCheckingOut) e.preventDefault() }} onInteractOutside={(e) => { if (isCheckingOut) e.preventDefault() }}>
        <DialogHeader>
          <DialogTitle>Chọn phương thức thanh toán</DialogTitle>
          <DialogDescription>Chọn phương thức thanh toán cho đơn hiện tại.</DialogDescription>
        </DialogHeader>
        <div className="mt-4 space-y-4">
          <PaymentMethodSelector ref={cashRadioRef} value={paymentMethod} onChange={setPaymentMethod} disabled={isCheckingOut} />
          {isPaymentMethodModalOpen && errorMessage ? <p role="alert" className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{errorMessage}</p> : null}
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="outline" disabled={isCheckingOut} onClick={handleCancel}>Quay lại</Button>
          <Button type="button" disabled={isCheckingOut || items.length === 0} onClick={handleConfirm}>{isCheckingOut ? 'Đang chuẩn bị đơn...' : 'Hoàn tất'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
