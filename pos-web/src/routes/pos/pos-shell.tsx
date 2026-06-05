import { useEffect, useMemo, useRef, useState } from 'react'
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
import { useCachedAreas, useCachedTableMode } from '../../features/tables/cache-hooks'
import { usePosTableContextStore } from '../../features/tables/store'
import { FloorPlanView } from '../../features/tables/components/floor-plan-view'
import { TableContextHeader } from '../../features/tables/components/table-context-header'
import { ModeTransitionConfirmDialog } from '../../features/tables/components/mode-transition-confirm-dialog'
import { openLocalSession, settleLocalSession } from '../../features/tables/session-store-actions'
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

  // Story 6.12: Table mode gating from Dexie cache (offline-capable — AC3)
  // useCachedTableMode returns false when loading/no-cache (safe default for counter-mode)
  // Note: first login online has a brief period where cache=false then reactive update → floor-plan appears. Accepted.
  const tableMode = useCachedTableMode()
  const selectedTableId = usePosTableContextStore((s) => s.selectedTableId)
  const selectedTableName = usePosTableContextStore((s) => s.selectedTableName)
  const selectedAreaId = usePosTableContextStore((s) => s.selectedAreaId)
  const quickCounterMode = usePosTableContextStore((s) => s.quickCounterMode)
  const setSelectedTable = usePosTableContextStore((s) => s.setSelectedTable)

  // Cart context for table-flow
  const items = useCartStore((s) => s.items)
  const setTableContext = useCartStore((s) => s.setTableContext)
  const resetCart = useCartStore((s) => s.resetCart)

  // Lookup area name from cached areas
  const areasCache = useCachedAreas()
  const areaName = useMemo(() => {
    if (!selectedAreaId || !areasCache) return ''
    return areasCache.find((a) => a.id === selectedAreaId)?.name ?? ''
  }, [selectedAreaId, areasCache])

  // Story 6.8 Task 5: Sync cart table context when selectedTableId changes in PosTableContextStore
  // Route-level subscription keeps features/tables and features/orders boundary (§8) clean.
  // Also handles Tier A: open a local session when a table is selected (AC24).
  const prevTableIdRef = useRef<string | null>(null)
  useEffect(() => {
    const unsub = usePosTableContextStore.subscribe((state) => {
      const cartStore = useCartStore.getState()
      const prevTableId = prevTableIdRef.current
      const newTableId = state.selectedTableId

      // Sync cart context
      if (newTableId !== cartStore.tableId) {
        if (newTableId && state.selectedTableName) {
          cartStore.setTableContext({ id: newTableId, name: state.selectedTableName })
        } else {
          cartStore.setTableContext(null)
        }
      }

      // Tier A: open local session when cashier selects a table (AC24)
      // Only in table-mode (tableMode check is done by caller — floor-plan only shows in tableMode)
      // KHÔNG mở khi quickCounterMode hoặc tableMode=false
      if (newTableId && newTableId !== prevTableId && !state.quickCounterMode) {
        void openLocalSession({ tableId: newTableId, deviceId: 'POS01' })
      }

      prevTableIdRef.current = newTableId
    })
    return unsub
  }, [])

  // Story 6.8 Tier A: settle session when order is finalized at a table (AC26)
  // Use custom event from payment-method-modal.tsx (already dispatched as 'order.finalized')
  // Route-level: features/orders and features/tables boundary §8 respected via event.
  // AC26 fix: tableId is now included in event.detail (captured BEFORE resetCart() clears the cart store).
  // Reading from event.detail avoids the race condition where resetCart() clears cartStore.tableId
  // before this listener fires, which would cause settle to be skipped and leave orphaned sessions.
  useEffect(() => {
    const onOrderFinalized = (event: Event) => {
      const customEvent = event as CustomEvent<{ clientOrderId: string; orderCode: string; at: string; tableId: string | null }>
      // Use tableId from event detail — cart has already been reset at this point
      const tableId = customEvent.detail.tableId
      if (tableId) {
        void settleLocalSession(tableId)
      }
    }
    window.addEventListener('order.finalized', onOrderFinalized)
    return () => window.removeEventListener('order.finalized', onOrderFinalized)
  }, [])

  // Show floor plan only when: tableMode=true (cache), no table selected, not in quick-counter
  const showFloorPlan = tableMode && selectedTableId === null && !quickCounterMode

  // Show table context header when: table is selected + not in quick-counter mode
  const showTableContextHeader = selectedTableId !== null && !quickCounterMode

  // Dialog state for mode-transition confirm
  const [dialogState, setDialogState] = useState<{ open: boolean; mode: 'change-table' | 'cancel-table' }>({
    open: false,
    mode: 'change-table',
  })

  function handleChangeTable() {
    if (items.length === 0) {
      // Cart empty → skip dialog, go back to floor-plan directly
      // AC29 decision: "Đổi bàn" also settles old session (Phase 1 — no void endpoint)
      if (selectedTableId) void settleLocalSession(selectedTableId)
      setTableContext(null)
      setSelectedTable(null)
      return
    }
    setDialogState({ open: true, mode: 'change-table' })
  }

  function handleCancelTable() {
    if (items.length === 0) {
      // Cart empty → skip dialog, go back to floor-plan directly
      // AC29: settle session to release the table (Phase 1 uses settle as "close/release")
      if (selectedTableId) void settleLocalSession(selectedTableId)
      setTableContext(null)
      setSelectedTable(null)
      return
    }
    setDialogState({ open: true, mode: 'cancel-table' })
  }

  function handleKeepCart() {
    if (dialogState.mode === 'cancel-table') {
      // AC29: settle session when hủy chọn bàn (release table)
      if (selectedTableId) void settleLocalSession(selectedTableId)
      // Clear table context but keep items
      setTableContext(null)
    } else {
      // 'change-table': AC29 decision Phase 1 — settle old table's session, user picks new table
      if (selectedTableId) void settleLocalSession(selectedTableId)
      // Keep items + tableContext will be overwritten when user picks new table
    }
    setSelectedTable(null)
  }

  function handleResetCart() {
    // Settle old table session before resetting
    if (selectedTableId) void settleLocalSession(selectedTableId)
    resetCart()
    setSelectedTable(null)
  }

  // Story 6.8 Tier A: "Giữ bàn" — keep session open, go back to floor-plan (AC28)
  // Session stays open → table shows "Đang phục vụ" on floor-plan.
  // NOTE: cart items are NOT saved (memory-only Phase 1). Toast informs cashier.
  // Story 6.13 will wire saveTableDraft into this handler.
  function handleHoldTable() {
    // Session stays open (no settle) — just navigate back to floor-plan
    setSelectedTable(null)
    // AC28 fix: dispatch 'toast' event (project convention) instead of 'table.hold' (had no listener).
    // Message includes table name and reminds cashier that cart items are not persisted (Phase 1 limit).
    if (selectedTableName) {
      window.dispatchEvent(new CustomEvent('toast', {
        detail: `Đã giữ ${selectedTableName} (đang phục vụ). Lưu ý: món trong giỏ chưa được lưu.`,
      }))
    }
  }

  function handleReceiptOpenChange(open: boolean) { if (!open) clearLastFinalizedOrder() }
  function handleSelectProduct(product: MenuProductRecord) { if (product.optionGroupIds.length > 0) { setSelectedProductForOptions(product); return } addItem({ productId: product.id, productNameSnapshot: product.name, unitPriceSnapshot: product.priceVnd, options: [], quantity: 1, lineTotal: product.priceVnd }) }

  const isLoading = !hasLoadedCategories || (!isMenuEmpty && !products)
  const gridProducts = (effectiveCategoryId ? products : []) ?? []

  return (
    <section className="pos-theme min-h-screen bg-bg">
      <PosTopAppBar search={search} onSearchChange={setSearch} />
      {/* Category sidebar only when showing product grid */}
      {!showFloorPlan && activeCategories.length > 0 ? <PosCategorySidebar categories={activeCategories} selectedCategoryId={effectiveCategoryId} onSelect={setSelectedCategoryId} /> : null}
      <div className="mt-16 rounded-2xl border border-warning bg-surface-container p-4 text-on-surface md:hidden">POS hoạt động tốt nhất ở màn hình ngang hoặc laptop/tablet</div>
      <main className={showFloorPlan ? 'mt-16 h-[calc(100vh-64px)] overflow-y-auto' : 'mt-16 h-[calc(100vh-64px)] overflow-y-auto px-7 py-6 md:ml-24 md:mr-[320px]'} aria-label={showFloorPlan ? 'Sơ đồ bàn' : 'Khu vực sản phẩm'}>
        {showFloorPlan ? (
          <FloorPlanView />
        ) : (
          <>
            {/* Story 6.8: Sticky table context header — only in table-flow (selectedTableId !== null && !quickCounterMode) */}
            {showTableContextHeader ? (
              <TableContextHeader
                tableName={selectedTableName ?? ''}
                areaName={areaName}
                onChangeTable={handleChangeTable}
                onCancelTable={handleCancelTable}
              />
            ) : null}
            {routeMessage ? <p role="alert" className="mb-4 rounded-2xl border border-error/30 bg-error-container/20 px-3 py-2 text-sm text-on-error-container">{routeMessage}</p> : null}
            <div className="sr-only">
              <h1>Menu sản phẩm</h1>
              <p>Chọn món để thêm vào đơn</p>
            </div>
            {isLoading ? <LoadingProducts /> : isMenuEmpty ? <EmptyState title="Chưa có dữ liệu menu. Hãy kết nối mạng để tải menu." /> : gridProducts.length === 0 ? <EmptyState title="Không tìm thấy sản phẩm phù hợp." /> : <div className="grid grid-cols-2 gap-5 lg:grid-cols-3 xl:grid-cols-4" aria-label="Lưới sản phẩm">{gridProducts.map((product) => <ProductTile key={product.id} product={product} onSelect={() => handleSelectProduct(product)} />)}</div>}
          </>
        )}
      </main>
      <CartPanel onHoldTable={handleHoldTable} />
      <ReceiptModal order={lastFinalizedOrder} open={isReceiptOpen} onOpenChange={handleReceiptOpenChange} />
      <OptionModal product={selectedProductForOptions} open={selectedProductForOptions !== null} onOpenChange={(open) => { if (!open) setSelectedProductForOptions(null) }} onAddToCart={addItem} />
      {/* Story 6.8: Mode transition confirm dialog — shown when cart has items + change/cancel table */}
      <ModeTransitionConfirmDialog
        open={dialogState.open}
        onOpenChange={(open) => setDialogState((s) => ({ ...s, open }))}
        tableName={selectedTableName ?? ''}
        itemCount={items.length}
        mode={dialogState.mode}
        onKeepCart={handleKeepCart}
        onResetCart={handleResetCart}
      />
    </section>
  )
}
