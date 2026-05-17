import { Button } from '../../../shared/components/ui/button'
import { formatVnd } from '../../../shared/lib/format-vnd'
import { calculateCartTotals } from '../cart-store'
import { useCheckoutStore } from '../checkout-store'
import type { CartDiscount, CartItem } from '../types'

type CheckoutSummaryProps = {
  items: CartItem[]
  discount: CartDiscount | null
}

export function CheckoutSummary({ items, discount }: CheckoutSummaryProps) {
  const isCheckingOut = useCheckoutStore((state) => state.isCheckingOut)
  const isPaymentMethodModalOpen = useCheckoutStore((state) => state.isPaymentMethodModalOpen)
  const openPaymentMethodModal = useCheckoutStore((state) => state.openPaymentMethodModal)
  const errorMessage = useCheckoutStore((state) => state.errorMessage)
  const totals = calculateCartTotals(items, discount)
  const hasItems = items.length > 0

  function handleOpenPaymentMethodModal() {
    if (!hasItems || isCheckingOut) return
    openPaymentMethodModal()
  }

  return (
    <section className="space-y-4" aria-label="Tóm tắt thanh toán">
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between"><dt>Tạm tính</dt><dd>{formatVnd(totals.subtotal)}</dd></div>
        {totals.discount ? <div className="flex justify-between text-text-secondary"><dt>Giảm giá</dt><dd>-{formatVnd(totals.discountAmount)}</dd></div> : null}
        <div className="flex items-end justify-between pt-2"><dt className="text-3xl font-bold leading-none">Tổng tiền</dt><dd className="text-3xl font-bold leading-none">{formatVnd(totals.total)}</dd></div>
      </dl>
      {errorMessage && !isPaymentMethodModalOpen ? <p role="alert" className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{errorMessage}</p> : null}
      <Button type="button" className="min-h-touch w-full" size="lg" disabled={!hasItems || isCheckingOut} onClick={handleOpenPaymentMethodModal}>
        {isCheckingOut ? 'Đang chuẩn bị đơn...' : 'Hoàn tất đơn'}
      </Button>
    </section>
  )
}
