import { forwardRef } from 'react'
import type { PaymentMethod } from '../types'

const OPTIONS: Array<{ value: PaymentMethod; label: string; icon: string }> = [
  { value: 'cash', label: 'Tiền mặt', icon: 'payments' },
  { value: 'transfer', label: 'Chuyển khoản', icon: 'account_balance' },
  { value: 'card', label: 'Thẻ', icon: 'credit_card' },
]

type PaymentMethodSelectorProps = {
  value: PaymentMethod
  onChange: (value: PaymentMethod) => void
  disabled?: boolean
}

export const PaymentMethodSelector = forwardRef<HTMLInputElement, PaymentMethodSelectorProps>(function PaymentMethodSelector({ value, onChange, disabled = false }, ref) {
  return (
    <fieldset>
      <legend className="text-sm font-semibold text-text-primary">Phương thức thanh toán</legend>
      <div className="mt-3 grid gap-2" role="radiogroup" aria-label="Phương thức thanh toán">
        {OPTIONS.map((option) => {
          const selected = value === option.value
          return (
            <label
              key={option.value}
              className={`flex min-h-touch cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-2.5 text-sm font-medium transition-all has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/40 ${selected ? 'border-primary bg-primary-container/40 ring-1 ring-primary/30' : 'border-border bg-surface-container-lowest hover:border-primary/30'} ${disabled ? 'cursor-not-allowed opacity-70' : ''}`}
            >
              <input
                ref={option.value === 'cash' ? ref : undefined}
                type="radio"
                name="payment-method"
                value={option.value}
                checked={selected}
                disabled={disabled}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              <span aria-hidden="true" className={`grid h-9 w-9 place-items-center rounded-lg ${selected ? 'bg-primary text-on-primary' : 'bg-surface-container-low text-text-secondary'}`}>
                <span className="material-symbols-outlined text-[20px]">{option.icon}</span>
              </span>
              <span className={selected ? 'font-semibold text-text-primary' : 'text-text-primary'}>{option.label}</span>
              <span aria-hidden="true" className={`ml-auto grid h-5 w-5 place-items-center rounded-full border-2 ${selected ? 'border-primary' : 'border-border'}`}>
                {selected ? <span className="h-2.5 w-2.5 rounded-full bg-primary" /> : null}
              </span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
})
