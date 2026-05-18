import type { MenuCategoryRecord } from '../../db/schemas/menu'
import { cn } from '../../shared/lib/cn'

type Props = { categories: MenuCategoryRecord[]; selectedCategoryId?: string | undefined; onSelect: (id: string) => void }

function getCategoryIcon(name: string): string {
  const normalized = name.toLocaleLowerCase('vi')
  if (normalized.includes('cà phê') || normalized.includes('coffee')) return 'coffee'
  if (normalized.includes('trà') || normalized.includes('tea')) return 'local_cafe'
  if (normalized.includes('bánh') || normalized.includes('pastry')) return 'bakery_dining'
  if (normalized.includes('seasonal')) return 'eco'
  return 'shopping_bag'
}

export function PosCategorySidebar({ categories, selectedCategoryId, onSelect }: Props) {
  function handleKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    if (!['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft'].includes(event.key)) return
    event.preventDefault()
    const direction = event.key === 'ArrowDown' || event.key === 'ArrowRight' ? 1 : -1
    const nextIndex = (index + direction + categories.length) % categories.length
    const buttons = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('button')
    buttons?.[nextIndex]?.focus()
    const nextCategory = categories[nextIndex]
    if (nextCategory) onSelect(nextCategory.id)
  }
  return (
    <nav aria-label="Danh mục sản phẩm" className="fixed bottom-0 left-0 top-16 z-40 hidden w-24 flex-col border-r border-outline-variant/20 bg-surface/90 py-4 backdrop-blur-xl md:flex">
      {categories.map((category, index) => {
        const selected = category.id === selectedCategoryId
        return <button key={category.id} type="button" aria-current={selected ? 'page' : undefined} onClick={() => onSelect(category.id)} onKeyDown={(event) => handleKeyDown(event, index)} className={cn('mx-2 flex min-h-[72px] flex-col items-center justify-center gap-1 rounded-2xl px-2 py-3 text-center text-[11px] font-medium leading-4 transition hover:bg-surface-container', selected ? 'bg-primary-container font-bold text-on-primary-container shadow-sm shadow-primary/20' : 'text-on-surface-variant')}><span aria-hidden="true" className="material-symbols-outlined" style={{ fontVariationSettings: selected ? "'FILL' 1, 'wght' 600" : undefined }}>{getCategoryIcon(category.name)}</span><span>{category.name}</span></button>
      })}
    </nav>
  )
}
