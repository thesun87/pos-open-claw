import { Button } from '../../../shared/components/ui/button'
import { formatVnd } from '../../../shared/lib/format-vnd'
import { finalizeOrder } from '../api'
import { calculateCartTotals, useCartStore } from '../cart-store'
import { useCheckoutStore } from '../checkout-store'
import type { CartDiscount, CartItem } from '../types'
import { PaymentMethodSelector } from './payment-method-selector'

type CheckoutSummaryProps = {
  items: CartItem[]
  discount: CartDiscount | null
}

export function CheckoutSummary({ items, discount }: CheckoutSummaryProps) {
  const paymentMethod = useCheckoutStore((state) => state.paymentMethod)
  const isCheckingOut = useCheckoutStore((state) => state.isCheckingOut)
  const setPaymentMethod = useCheckoutStore((state) => state.setPaymentMethod)
  const startCheckout = useCheckoutStore((state) => state.startCheckout)
  const completeCheckout = useCheckoutStore((state) => state.completeCheckout)
  const failCheckout = useCheckoutStore((state) => state.failCheckout)
  const errorMessage = useCheckoutStore((state) => state.errorMessage)
  const resetCart = useCartStore((state) => state.resetCart)
  const totals = calculateCartTotals(items, discount)
  const hasItems = items.length > 0

  async function handleFinalizeOrder() {
    if (!hasItems || isCheckingOut) return
    startCheckout()
    try {
      const order = await finalizeOrder({ cart: { items, discount }, paymentMethod, deviceId: 'POS01' })
      resetCart()
      completeCheckout(order)
      window.dispatchEvent(new CustomEvent('order.finalized', { detail: { at: new Date().toISOString(), clientOrderId: order.clientOrderId, orderCode: order.orderCode } }))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không thể lưu đơn. Vui lòng thử lại.'
      failCheckout(message)
    }
  }

  return (
    <section className="space-y-4" aria-label="Tóm tắt thanh toán">
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between"><dt>Tạm tính</dt><dd>{formatVnd(totals.subtotal)}</dd></div>
        {totals.discount ? <div className="flex justify-between text-text-secondary"><dt>Giảm giá</dt><dd>-{formatVnd(totals.discountAmount)}</dd></div> : null}
        <div className="flex items-end justify-between pt-2"><dt className="text-3xl font-bold leading-none">Tổng tiền</dt><dd className="text-3xl font-bold leading-none">{formatVnd(totals.total)}</dd></div>
      </dl>
      <PaymentMethodSelector value={paymentMethod} onChange={setPaymentMethod} disabled={!hasItems || isCheckingOut} />
      {errorMessage ? <p role="alert" className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{errorMessage}</p> : null}
      <Button type="button" className="min-h-touch w-full" size="lg" disabled={!hasItems || isCheckingOut} onClick={handleFinalizeOrder}>
        {isCheckingOut ? 'Đang chuẩn bị đơn...' : 'Hoàn tất đơn'}
      </Button>
    </section>
  )
}
