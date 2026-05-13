import { Button } from '../../../shared/components/ui/button'
import { formatVnd } from '../../../shared/lib/format-vnd'
import { calculateCartTotals } from '../cart-store'
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
  const totals = calculateCartTotals(items, discount)
  const hasItems = items.length > 0

  return (
    <section className="space-y-4" aria-label="Tóm tắt thanh toán">
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between"><dt>Tạm tính</dt><dd>{formatVnd(totals.subtotal)}</dd></div>
        {totals.discount ? <div className="flex justify-between text-text-secondary"><dt>Giảm giá</dt><dd>-{formatVnd(totals.discountAmount)}</dd></div> : null}
        <div className="flex items-end justify-between pt-2"><dt className="text-3xl font-bold leading-none">Tổng tiền</dt><dd className="text-3xl font-bold leading-none">{formatVnd(totals.total)}</dd></div>
      </dl>
      <PaymentMethodSelector value={paymentMethod} onChange={setPaymentMethod} disabled={!hasItems || isCheckingOut} />
      <Button type="button" className="min-h-touch w-full" size="lg" disabled={!hasItems || isCheckingOut} onClick={startCheckout}>
        {isCheckingOut ? 'Đang chuẩn bị đơn...' : 'Hoàn tất đơn'}
      </Button>
    </section>
  )
}
