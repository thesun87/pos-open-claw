import { useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import type { MenuProductRecord } from '../../db/schemas/menu'
import { useCartStore } from '../../features/orders/cart-store'
import { useCheckoutStore } from '../../features/orders/checkout-store'
import { CartPanel } from '../../features/orders/components/cart-panel'
import { ReceiptModal } from '../../features/orders/components/receipt-modal'
import { OptionModal } from '../../features/menu/components/option-modal'
import { ProductTile } from '../../features/menu/components/product-tile'
import { useCategories, useDebouncedValue, useProducts } from '../../features/menu/hooks'
import { EmptyState } from '../../shared/components/ui/empty-state'
import { PosCategorySidebar } from './pos-category-sidebar'
import { PosTopAppBar } from './pos-top-app-bar'

const SEARCH_DEBOUNCE_MS = 200

function LoadingProducts() { return <div className="rounded-lg border border-outline-variant/30 bg-surface-container p-4 text-on-surface-variant" role="status">Đang tải menu...</div> }

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

  const queryArgs: { categoryId?: string; search?: string } = {}
  if (effectiveCategoryId && effectiveCategoryId !== 'all') {
    queryArgs.categoryId = effectiveCategoryId
  }
  if (!isMenuEmpty && debouncedSearch) {
    queryArgs.search = debouncedSearch
  }
  const products = useProducts(queryArgs)
  const [selectedProductForOptions, setSelectedProductForOptions] = useState<MenuProductRecord | null>(null)
  const addItem = useCartStore((state) => state.addItem)
  const lastFinalizedOrder = useCheckoutStore((state) => state.lastFinalizedOrder)
  const clearLastFinalizedOrder = useCheckoutStore((state) => state.clearLastFinalizedOrder)
  const isReceiptOpen = Boolean(lastFinalizedOrder)

  function handleReceiptOpenChange(open: boolean) { if (!open) clearLastFinalizedOrder() }
  function handleSelectProduct(product: MenuProductRecord) { if (product.optionGroupIds.length > 0) { setSelectedProductForOptions(product); return } addItem({ productId: product.id, productNameSnapshot: product.name, unitPriceSnapshot: product.priceVnd, options: [], quantity: 1, lineTotal: product.priceVnd }) }

  const isLoading = !hasLoadedCategories || (!isMenuEmpty && !products)
  const gridProducts = (effectiveCategoryId ? products : []) ?? []

  return (
    <section className="pos-theme min-h-screen bg-bg">
      <PosTopAppBar search={search} onSearchChange={setSearch} />
      {activeCategories.length > 0 ? <PosCategorySidebar categories={activeCategories} selectedCategoryId={effectiveCategoryId} onSelect={setSelectedCategoryId} /> : null}
      <div className="mt-16 rounded-2xl border border-warning bg-surface-container p-4 text-on-surface md:hidden">POS hoạt động tốt nhất ở màn hình ngang hoặc laptop/tablet</div>
      <main className="mt-16 h-[calc(100vh-64px)] overflow-y-auto px-7 py-6 md:ml-24 md:mr-[320px]" aria-label="Khu vực sản phẩm">
        {routeMessage ? <p role="alert" className="mb-4 rounded-2xl border border-error/30 bg-error-container/20 px-3 py-2 text-sm text-on-error-container">{routeMessage}</p> : null}
        <div className="mb-7">
          <h1 className="text-[34px] font-semibold leading-10 text-on-surface">Menu sản phẩm</h1>
          <p className="mt-1 text-on-surface-variant">Chọn món để thêm vào đơn</p>
        </div>
        {isLoading ? <LoadingProducts /> : isMenuEmpty ? <EmptyState title="Chưa có dữ liệu menu. Hãy kết nối mạng để tải menu." /> : gridProducts.length === 0 ? <EmptyState title="Không tìm thấy sản phẩm phù hợp." /> : <div className="grid grid-cols-2 gap-5 lg:grid-cols-3 xl:grid-cols-4" aria-label="Lưới sản phẩm">{gridProducts.map((product) => <ProductTile key={product.id} product={product} onSelect={() => handleSelectProduct(product)} />)}</div>}
      </main>
      <CartPanel />
      <ReceiptModal order={lastFinalizedOrder} open={isReceiptOpen} onOpenChange={handleReceiptOpenChange} />
      <OptionModal product={selectedProductForOptions} open={selectedProductForOptions !== null} onOpenChange={(open) => { if (!open) setSelectedProductForOptions(null) }} onAddToCart={addItem} />
    </section>
  )
}
