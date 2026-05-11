import { useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import type { MenuProductRecord } from '../../db/schemas/menu'
import { useCartStore } from '../../features/orders/cart-store'
import { CategoryNav } from '../../features/menu/components/category-nav'
import { OptionModal } from '../../features/menu/components/option-modal'
import { ProductTile } from '../../features/menu/components/product-tile'
import { useCategories, useDebouncedValue, useProducts } from '../../features/menu/hooks'
import { EmptyState } from '../../shared/components/ui/empty-state'
import { Input } from '../../shared/components/ui/input'
import { formatVnd } from '../../shared/lib/format-vnd'

const SEARCH_DEBOUNCE_MS = 200

function LoadingProducts() {
  return <div className="rounded-lg border border-border bg-surface-muted p-4 text-sm text-text-secondary" role="status">Đang tải menu...</div>
}

export function PosShell() {
  const location = useLocation()
  const routeMessage = (location.state as { message?: string } | null)?.message
  const categories = useCategories()
  const activeCategories = useMemo(() => categories?.filter((category) => category.isActive) ?? [], [categories])
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>()
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, SEARCH_DEBOUNCE_MS)
  const effectiveCategoryId = selectedCategoryId ?? activeCategories[0]?.id
  const hasLoadedCategories = categories !== undefined
  const isMenuEmpty = hasLoadedCategories && activeCategories.length === 0
  const products = useProducts({
    categoryId: effectiveCategoryId ?? '__no-selected-category__',
    ...(isMenuEmpty ? {} : { search: debouncedSearch }),
  })
  const [selectedProductForOptions, setSelectedProductForOptions] = useState<MenuProductRecord | null>(null)
  const items = useCartStore((state) => state.items)
  const addItem = useCartStore((state) => state.addItem)
  const total = items.reduce((sum, item) => sum + item.lineTotal, 0)

  function handleSelectProduct(product: MenuProductRecord) {
    if (product.optionGroupIds.length > 0) {
      setSelectedProductForOptions(product)
      return
    }
    addItem({
      productId: product.id,
      productNameSnapshot: product.name,
      unitPriceSnapshot: product.priceVnd,
      options: [],
      quantity: 1,
      lineTotal: product.priceVnd,
    })
  }

  const isLoading = !hasLoadedCategories || (!isMenuEmpty && !products)
  const gridProducts = (effectiveCategoryId ? products : []) ?? []

  return (
    <section className="p-6">
      {routeMessage ? <p role="alert" className="mb-4 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{routeMessage}</p> : null}
      <div className="rounded-lg border border-warning bg-surface-muted p-4 text-text-primary md:hidden">POS hoạt động tốt nhất ở màn hình ngang hoặc laptop/tablet</div>
      <div className="hidden grid-cols-[1fr_360px] gap-6 md:grid lg:grid-cols-[1fr_400px]" aria-label="Bố cục POS hai cột">
        <section className="min-h-[70vh] rounded-lg border border-border bg-surface p-6" aria-label="Khu vực sản phẩm">
          <div className="flex flex-col gap-4">
            <div>
              <h1 className="text-2xl font-semibold">Menu sản phẩm</h1>
              <label htmlFor="product-search" className="mt-4 block text-sm font-medium text-text-primary">Tìm sản phẩm</label>
              <Input
                id="product-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Nhập tên món..."
                className="mt-2"
              />
            </div>

            {activeCategories.length > 0 ? (
              <CategoryNav categories={activeCategories} selectedCategoryId={effectiveCategoryId} onSelect={setSelectedCategoryId} />
            ) : null}

            {isLoading ? <LoadingProducts /> : isMenuEmpty ? (
              <EmptyState title="Chưa có dữ liệu menu. Hãy kết nối mạng để tải menu." />
            ) : gridProducts.length === 0 ? (
              <EmptyState title="Không tìm thấy sản phẩm phù hợp." />
            ) : (
              <div className="grid grid-cols-2 gap-3 xl:grid-cols-3" aria-label="Lưới sản phẩm">
                {gridProducts.map((product) => <ProductTile key={product.id} product={product} onSelect={() => handleSelectProduct(product)} />)}
              </div>
            )}
          </div>
        </section>
        <aside className="min-h-[70vh] rounded-lg border border-border bg-surface p-6" aria-label="Giỏ hàng và thanh toán" tabIndex={0}>
          <h2 className="text-xl font-semibold">Giỏ hàng / thanh toán</h2>
          <p className="mt-2 text-text-secondary">Panel cố định bên phải cho đơn hiện tại.</p>
          <div className="mt-6 rounded-lg border border-border bg-surface-muted p-4">
            <div className="text-sm text-text-secondary">Số món</div>
            <div className="text-2xl font-bold">{items.length}</div>
            <div className="mt-4 text-sm text-text-secondary">Tạm tính</div>
            <div className="text-3xl font-bold">{formatVnd(total)}</div>
          </div>
          {items.length > 0 ? <p className="mt-4 text-sm text-text-secondary">Món mới nhất: {items.at(-1)?.productNameSnapshot ?? ''}</p> : null}
        </aside>
      </div>
      <OptionModal product={selectedProductForOptions} open={selectedProductForOptions !== null} onOpenChange={(open) => { if (!open) setSelectedProductForOptions(null) }} onAddToCart={addItem} />
    </section>
  )
}
