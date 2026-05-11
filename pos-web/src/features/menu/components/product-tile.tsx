import type { MenuProductRecord } from '../../../db/schemas/menu'
import { cn } from '../../../shared/lib/cn'
import { formatVnd } from '../../../shared/lib/format-vnd'

type ProductTileProps = {
  product: Pick<MenuProductRecord, 'name' | 'priceVnd' | 'optionGroupIds'>
  onSelect: () => void
  variant?: 'default' | 'compact'
}

export function ProductTile({ product, onSelect, variant = 'default' }: ProductTileProps) {
  const hasOptions = product.optionGroupIds.length > 0
  const price = formatVnd(product.priceVnd)
  const ariaLabel = `${product.name}, ${price}${hasOptions ? ', có tùy chọn' : ''}`

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onSelect}
      className={cn(
        'min-h-24 w-full rounded-lg border border-border bg-surface p-4 text-left shadow-sm transition active:scale-[0.98] hover:border-primary hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
        variant === 'compact' && 'min-h-12 p-3',
      )}
    >
      <span className="block font-semibold text-text-primary">{product.name}</span>
      <span className="mt-2 block text-lg font-bold text-primary">{price}</span>
      {hasOptions ? (
        <span className="mt-3 inline-flex rounded-full border border-warning/40 bg-warning/10 px-2 py-1 text-xs font-medium text-warning">
          Có tùy chọn
        </span>
      ) : null}
    </button>
  )
}
