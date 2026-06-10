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
  const items = [
    { id: 'all', name: 'Tất cả', icon: 'grid_view' },
    ...categories.map(c => ({ id: c.id, name: c.name, icon: getCategoryIcon(c.name) }))
  ]

  function handleKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    if (!['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft'].includes(event.key)) return
    event.preventDefault()
    const direction = event.key === 'ArrowDown' || event.key === 'ArrowRight' ? 1 : -1
    const nextIndex = (index + direction + items.length) % items.length
    const buttons = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('button')
    buttons?.[nextIndex]?.focus()
    const nextItem = items[nextIndex]
    if (nextItem) onSelect(nextItem.id)
  }

  const effectiveSelectedId = selectedCategoryId ?? 'all'

  return (
    <nav aria-label="Danh mục sản phẩm" className="fixed bottom-0 left-0 top-16 z-40 hidden w-24 flex-col border-r border-outline-variant/50 bg-surface py-4 md:flex">
      <div className="flex-1 overflow-y-auto w-full px-2.5 flex flex-col gap-1.5 no-scrollbar">
        {items.map((item, index) => {
          const selected = item.id === effectiveSelectedId
          return (
            <button
              key={item.id}
              type="button"
              aria-current={selected ? 'page' : undefined}
              onClick={() => onSelect(item.id)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              className={cn(
                'flex flex-col items-center justify-center py-3 w-full rounded-2xl transition-all select-none active:scale-[0.97]',
                selected
                  ? 'bg-primary-container font-bold text-on-primary-container shadow-card ring-1 ring-primary/15'
                  : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
              )}
            >
              <span
                aria-hidden="true"
                className="material-symbols-outlined mb-1 text-[24px]"
                style={{ fontVariationSettings: selected ? "'FILL' 1, 'wght' 600" : "'wght' 400" }}
              >
                {item.icon}
              </span>
              <span className="text-[11px] font-medium leading-4 truncate w-full px-1 text-center">{item.name}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
