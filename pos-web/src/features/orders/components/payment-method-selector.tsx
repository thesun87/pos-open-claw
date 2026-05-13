import type { PaymentMethod } from '../types'

const OPTIONS: Array<{ value: PaymentMethod; label: string }> = [
  { value: 'cash', label: 'Tiền mặt' },
  { value: 'transfer', label: 'Chuyển khoản' },
  { value: 'card', label: 'Thẻ' },
]

type PaymentMethodSelectorProps = {
  value: PaymentMethod
  onChange: (value: PaymentMethod) => void
  disabled?: boolean
}

export function PaymentMethodSelector({ value, onChange, disabled = false }: PaymentMethodSelectorProps) {
  return (
    <fieldset className="rounded-lg border border-border bg-surface-muted p-3" aria-label="Phương thức thanh toán">
      <legend className="px-1 text-sm font-semibold text-text-primary">Phương thức thanh toán</legend>
      <div className="mt-2 grid gap-2" role="radiogroup" aria-label="Chọn phương thức thanh toán">
        {OPTIONS.map((option) => {
          const selected = value === option.value
          return (
            <label
              key={option.value}
              className={`flex min-h-touch items-center gap-3 rounded-md border px-3 py-2 text-sm font-medium ${selected ? 'border-primary bg-primary/10 ring-2 ring-primary/30' : 'border-border bg-surface'} ${disabled ? 'opacity-70' : ''}`}
            >
              <input
                type="radio"
                name="payment-method"
                value={option.value}
                checked={selected}
                disabled={disabled}
                onChange={() => onChange(option.value)}
              />
              <span>{option.label}</span>
              {selected ? <span className="ml-auto text-xs font-bold" aria-hidden="true">Đã chọn</span> : null}
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
