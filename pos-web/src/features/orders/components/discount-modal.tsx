import React, { useId, useMemo, useState } from 'react'
import { Button } from '../../../shared/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../../shared/components/ui/dialog'
import { Input } from '../../../shared/components/ui/input'
import { formatVnd } from '../../../shared/lib/format-vnd'
import type { CartDiscount } from '../types'

type DiscountModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  subtotal: number
  discount: CartDiscount | null
  onApply: (discount: CartDiscount | null) => void
}

function integerText(value: string) {
  return value.replace(/\D/g, '')
}

export function DiscountModal({ open, onOpenChange, subtotal, discount, onApply }: DiscountModalProps) {
  const fixedId = useId()
  const percentId = useId()

  // Initialize state from discount prop when modal opens
  const initialType = discount?.type ?? 'fixed'
  const initialValue = discount?.value ? String(discount.value) : ''
  
  const [type, setType] = useState<CartDiscount['type']>(initialType)
  const [value, setValue] = useState(initialValue)

  // Reset form when modal opens with new discount value
  const prevOpenRef = React.useRef(open)
  React.useEffect(() => {
    if (open && !prevOpenRef.current) {
      // Modal just opened - reset to current discount
      setType(discount?.type ?? 'fixed')
      setValue(discount?.value ? String(discount.value) : '')
    }
    prevOpenRef.current = open
  }, [open, discount])

  const numericValue = value === '' ? NaN : Number(value)
  const error = useMemo(() => {
    if (value === '') return ''
    if (!Number.isInteger(numericValue)) return 'Chỉ nhập số nguyên.'
    if (type === 'fixed' && (numericValue < 0 || numericValue > subtotal)) return `Giảm tiền phải từ 0 đến ${formatVnd(subtotal)}.`
    if (type === 'percentage' && (numericValue < 0 || numericValue > 100)) return 'Giảm phần trăm phải từ 0 đến 100%.'
    return ''
  }, [numericValue, subtotal, type, value])

  const canApply = value === '' || (value !== '' && !error)

  function handleTypeChange(nextType: CartDiscount['type']) {
    setType(nextType)
    setValue('')
  }

  function handleApply() {
    if (!canApply) return
    if (value === '' || numericValue === 0) {
      onApply(null)
    } else {
      onApply({ type, value: numericValue })
    }
    onOpenChange(false)
  }

  function handleClear() {
    onApply(null)
    onOpenChange(false)
  }

  function handleCancel() {
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby="discount-modal-description">
        <DialogHeader>
          <DialogTitle>Giảm giá đơn hàng</DialogTitle>
          <DialogDescription id="discount-modal-description">
            Nhập giá trị giảm cho đơn hiện tại. Áp dụng để cập nhật tổng tiền.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <fieldset>
            <legend className="sr-only">Loại giảm giá</legend>
            <div className="grid gap-2">
              <label
                htmlFor={fixedId}
                className="flex min-h-touch items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm"
              >
                <input
                  id={fixedId}
                  type="radio"
                  name="discount-type"
                  checked={type === 'fixed'}
                  onChange={() => handleTypeChange('fixed')}
                />
                Giảm tiền cố định
              </label>
              <label
                htmlFor={percentId}
                className="flex min-h-touch items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm"
              >
                <input
                  id={percentId}
                  type="radio"
                  name="discount-type"
                  checked={type === 'percentage'}
                  onChange={() => handleTypeChange('percentage')}
                />
                Giảm theo %
              </label>
            </div>
          </fieldset>

          <div>
            <label htmlFor="discount-value" className="block text-sm font-medium">
              Giá trị giảm
            </label>
            <Input
              id="discount-value"
              inputMode="numeric"
              value={value}
              onChange={(event) => setValue(integerText(event.target.value))}
              placeholder={type === 'fixed' ? 'VD: 10000' : 'VD: 10'}
              aria-invalid={Boolean(error)}
              aria-describedby="discount-help"
              className="mt-1"
            />
            <p
              id="discount-help"
              className={`mt-2 text-sm ${error ? 'font-medium text-danger' : 'text-text-secondary'}`}
            >
              {error || (type === 'fixed' ? `Tối đa ${formatVnd(subtotal)}.` : 'Nhập số nguyên 0-100.')}
            </p>
          </div>
        </div>

        <div className="flex justify-between">
          {discount ? (
            <Button type="button" variant="ghost" onClick={handleClear}>
              Bỏ giảm giá
            </Button>
          ) : (
            <div />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={handleCancel}>
              Quay lại
            </Button>
            <Button type="button" disabled={!canApply} onClick={handleApply}>
              Áp dụng
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
