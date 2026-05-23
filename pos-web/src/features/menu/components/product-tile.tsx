import type { MenuProductRecord } from '../../../db/schemas/menu'
import { cn } from '../../../shared/lib/cn'
import { formatVnd } from '../../../shared/lib/format-vnd'
import { getTextInitials } from '../../../shared/lib/text-initials'

type ProductTileProps = {
  product: Pick<MenuProductRecord, 'name' | 'priceVnd' | 'imageUrl' | 'optionGroupIds'>
  onSelect: () => void
  variant?: 'default' | 'compact'
}

export function ProductTile({ product, onSelect, variant = 'default' }: ProductTileProps) {
  const hasOptions = product.optionGroupIds.length > 0
  const price = formatVnd(product.priceVnd)
  const ariaLabel = `${product.name}, ${price}${hasOptions ? ', có tùy chọn' : ''}`

  if (variant === 'compact') {
    return (
      <button
        type="button"
        aria-label={ariaLabel}
        onClick={onSelect}
        className="group relative flex items-center gap-3 w-full p-3 rounded-xl bg-surface-container border border-outline-variant/30 hover:border-primary-container shadow-sm transition active:scale-[0.98] text-left"
      >
        <div className="w-12 h-12 flex items-center justify-center rounded-lg bg-surface-container-low font-bold text-primary-container text-sm select-none overflow-hidden">
          {product.imageUrl ? <img src={product.imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" /> : getTextInitials(product.name)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-on-surface truncate text-base">{product.name}</div>
          <span className="text-sm font-semibold text-primary-container">{price}</span>
        </div>
      </button>
    )
  }

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onSelect}
      className={cn(
        'group relative overflow-hidden rounded-xl bg-surface-container border border-outline-variant/20 hover:border-primary-container shadow-[0_4px_8px_rgba(0,0,0,0.04)] transition-all active:scale-[0.98] text-left w-full flex flex-col justify-start focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary pb-3',
        variant === 'default' && 'aspect-[4/4.6]'
      )}
    >
      {/* Product Image / Initials */}
      <div className="aspect-[4/3] w-full bg-surface-container-low overflow-hidden flex items-center justify-center relative select-none shrink-0">
        {product.imageUrl ? <img src={product.imageUrl} alt="" className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" /> : <span className="text-3xl font-bold text-primary/35 group-hover:scale-105 transition-transform duration-300">
          {getTextInitials(product.name)}
        </span>}
        {hasOptions && (
          <span className="absolute right-3 top-3 rounded-full bg-surface/95 px-3 py-1 text-[10px] font-bold tracking-wide text-primary shadow-sm backdrop-blur-md">
            OPTIONS
          </span>
        )}
      </div>

      {/* Card Info */}
      <div className="px-4 pt-2.5 flex flex-col gap-0.5 w-full flex-1 justify-start">
        <div className="font-semibold text-on-surface truncate text-base" title={product.name}>
          {product.name}
        </div>
        <div className="flex justify-between items-center">
          <span className="font-bold text-primary-container text-base">{price}</span>
          <span className="px-3 py-1 border border-primary-container text-primary-container rounded-full text-sm font-semibold group-hover:bg-primary-container group-hover:text-on-primary-container transition-colors">
            Đặt món
          </span>
        </div>
      </div>
    </button>
  )
}
