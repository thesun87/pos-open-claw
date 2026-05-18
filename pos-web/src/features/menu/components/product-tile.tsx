import type { MenuProductRecord } from '../../../db/schemas/menu'
import { cn } from '../../../shared/lib/cn'
import { formatVnd } from '../../../shared/lib/format-vnd'
import { getTextInitials } from '../../../shared/lib/text-initials'

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
    <button type="button" aria-label={ariaLabel} onClick={onSelect} className={cn('group relative min-h-32 w-full overflow-hidden rounded-3xl border border-outline-variant/15 bg-surface-container text-left shadow-md shadow-on-surface/10 transition active:scale-[0.98] hover:border-primary/45 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary', variant === 'default' && 'aspect-[4/5]', variant === 'compact' && 'min-h-24')}>
      <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-primary-container/75 via-surface-container-high to-surface-container"><span aria-hidden="true" className="text-5xl font-bold text-primary/35">{getTextInitials(product.name)}</span></div>
      <div className="absolute inset-0 bg-gradient-to-t from-inverse-surface/85 via-inverse-surface/10 to-transparent" />
      {hasOptions ? <span className="absolute right-3 top-3 rounded-full bg-surface/95 px-3 py-1 text-[10px] font-bold tracking-wide text-primary shadow-sm backdrop-blur-md">OPTIONS</span> : null}
      <span className="absolute bottom-0 left-0 right-0 p-5 text-left"><span className="block text-lg font-bold leading-6 text-white">{product.name}</span><span className="price mt-1 block font-label-sm text-white/90">{price}</span></span>
    </button>
  )
}
