import { useId, useMemo, useState } from 'react'
import { Button } from '../../../shared/components/ui/button'
import { Input } from '../../../shared/components/ui/input'
import { formatVnd } from '../../../shared/lib/format-vnd'
import type { CartDiscount } from '../types'

type DiscountControlProps = {
  subtotal: number
  discount: CartDiscount | null
  onChange: (discount: CartDiscount | null) => void
}

function integerText(value: string) {
  return value.replace(/\D/g, '')
}

export function DiscountControl({ subtotal, discount, onChange }: DiscountControlProps) {
  const fixedId = useId()
  const percentId = useId()
  const [type, setType] = useState<CartDiscount['type']>(discount?.type ?? 'fixed')
  const [value, setValue] = useState(discount?.value ? String(discount.value) : '')
  const numericValue = value === '' ? NaN : Number(value)
  const error = useMemo(() => {
    if (value === '') return ''
    if (!Number.isInteger(numericValue)) return 'Chỉ nhập số nguyên.'
    if (type === 'fixed' && (numericValue < 0 || numericValue > subtotal)) return `Giảm tiền phải từ 0 đến ${formatVnd(subtotal)}.`
    if (type === 'percentage' && (numericValue < 0 || numericValue > 100)) return 'Giảm phần trăm phải từ 0 đến 100%.'
    return ''
  }, [numericValue, subtotal, type, value])
  const canApply = value !== '' && !error

  function updateType(nextType: CartDiscount['type']) {
    setType(nextType)
    if (discount?.type !== nextType) onChange(null)
  }

  function applyDiscount() {
    if (!canApply) return
    onChange(numericValue > 0 ? { type, value: numericValue } : null)
  }

  return (
    <section className="rounded-lg border border-border bg-surface-muted p-3" aria-label="Giảm giá đơn hàng">
      <div className="text-sm font-semibold text-text-primary">Giảm giá</div>
      <div className="mt-3 grid gap-2">
        <label htmlFor={fixedId} className="flex min-h-touch items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm">
          <input id={fixedId} type="radio" name="discount-type" checked={type === 'fixed'} onChange={() => updateType('fixed')} />
          Giảm tiền cố định
        </label>
        <label htmlFor={percentId} className="flex min-h-touch items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm">
          <input id={percentId} type="radio" name="discount-type" checked={type === 'percentage'} onChange={() => updateType('percentage')} />
          Giảm theo %
        </label>
      </div>
      <label htmlFor="cart-discount-value" className="mt-3 block text-sm font-medium">Giá trị giảm</label>
      <div className="mt-1 flex gap-2">
        <Input id="cart-discount-value" inputMode="numeric" value={value} onChange={(event) => setValue(integerText(event.target.value))} placeholder={type === 'fixed' ? 'VD: 10000' : 'VD: 10'} aria-invalid={Boolean(error)} aria-describedby="discount-help" />
        <Button type="button" variant="secondary" disabled={!canApply} onClick={applyDiscount}>Áp dụng</Button>
      </div>
      <p id="discount-help" className={`mt-2 text-sm ${error ? 'font-medium text-danger' : 'text-text-secondary'}`}>{error || (type === 'fixed' ? `Tối đa ${formatVnd(subtotal)}.` : 'Nhập số nguyên 0-100.')}</p>
      {discount ? <Button type="button" variant="ghost" className="mt-2" onClick={() => { setValue(''); onChange(null) }}>Bỏ giảm giá</Button> : null}
    </section>
  )
}
