import type { MenuCategoryRecord } from '../../../db/schemas/menu'
import { cn } from '../../../shared/lib/cn'

type CategoryNavProps = {
  categories: MenuCategoryRecord[]
  selectedCategoryId: string | undefined
  onSelect: (categoryId: string) => void
}

export function CategoryNav({ categories, selectedCategoryId, onSelect }: CategoryNavProps) {
  return (
    <nav aria-label="Danh mục sản phẩm" className="flex gap-2 overflow-x-auto pb-2">
      {categories.map((category) => {
        const isActive = category.id === selectedCategoryId
        return (
          <button
            key={category.id}
            type="button"
            aria-current={isActive ? 'true' : undefined}
            onClick={() => onSelect(category.id)}
            className={cn(
              'min-h-12 shrink-0 rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium text-text-secondary transition hover:border-primary hover:text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
              isActive && 'border-primary bg-primary/10 font-bold text-text-primary underline decoration-2 underline-offset-4',
            )}
          >
            {category.name}
          </button>
        )
      })}
    </nav>
  )
}
