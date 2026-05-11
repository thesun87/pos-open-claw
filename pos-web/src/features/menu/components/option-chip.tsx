import { Check } from 'lucide-react'
import { cn } from '../../../shared/lib/cn'
import { formatVnd } from '../../../shared/lib/format-vnd'

type OptionChipProps = {
  label: string
  priceDeltaVnd: number
  selected: boolean
  role: 'radio' | 'checkbox'
  disabled?: boolean
  maxReached?: boolean
  onToggle: () => void
}

function formatDelta(delta: number): string {
  if (delta === 0) return 'Không đổi giá'
  return `${delta > 0 ? '+' : '-'}${formatVnd(Math.abs(delta))}`
}

export function OptionChip({ label, priceDeltaVnd, selected, role, disabled = false, maxReached = false, onToggle }: OptionChipProps) {
  return (
    <button
      type="button"
      role={role}
      aria-checked={selected}
      aria-disabled={disabled}
      disabled={disabled}
      onClick={onToggle}
      className={cn(
        'min-h-12 rounded-lg border px-3 py-2 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
        selected ? 'border-primary bg-primary/10 shadow-sm' : 'border-border bg-surface hover:border-primary hover:bg-surface-muted',
        disabled && 'cursor-not-allowed border-border bg-surface-muted opacity-70',
        maxReached && !selected && 'border-dashed',
      )}
    >
      <span className="flex items-center gap-2 font-medium text-text-primary">
        {selected ? <Check className="h-4 w-4 text-primary" aria-hidden="true" /> : <span className="h-4 w-4 rounded-full border border-border" aria-hidden="true" />}
        {label}
        {selected ? <span className="text-xs text-primary">Đã chọn</span> : null}
      </span>
      <span className="mt-1 block text-sm text-text-secondary">{formatDelta(priceDeltaVnd)}</span>
      {maxReached && !selected ? <span className="mt-1 block text-xs text-text-secondary">Đã đạt giới hạn chọn</span> : null}
    </button>
  )
}
