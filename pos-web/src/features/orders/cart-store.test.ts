import { beforeEach, describe, expect, it } from 'vitest'
import { calculateCartTotals, useCartStore } from './cart-store'
import type { CartItemInput } from './types'

const baseItem: CartItemInput = {
  productId: 'p-1',
  productNameSnapshot: 'Cà phê sữa',
  unitPriceSnapshot: 30000,
  options: [{ optionId: 'o-l', labelSnapshot: 'Size L', priceDeltaSnapshot: 5000 }],
  quantity: 1,
  lineTotal: 35000,
}

beforeEach(() => useCartStore.getState().resetCart())

describe('cart store', () => {
  it('merges same product/options/note/unit price by increasing quantity', () => {
    const first = useCartStore.getState().addItem({ ...baseItem, note: ' ít đá ' })
    const second = useCartStore.getState().addItem({ ...baseItem, note: 'ít đá' })
    const [item] = useCartStore.getState().items
    expect(second.tempId).toBe(first.tempId)
    expect(item).toMatchObject({ quantity: 2, lineTotal: 70000, note: 'ít đá' })
  })

  it('creates separate lines for different notes or options', () => {
    useCartStore.getState().addItem(baseItem)
    useCartStore.getState().addItem({ ...baseItem, note: 'mang đi' })
    useCartStore.getState().addItem({ ...baseItem, options: [{ optionId: 'o-m', labelSnapshot: 'Size M', priceDeltaSnapshot: 0 }], lineTotal: 30000 })
    expect(useCartStore.getState().items).toHaveLength(3)
  })

  it('updates quantity, recalculates snapshot line total, and removes quantity zero', () => {
    const item = useCartStore.getState().addItem(baseItem)
    useCartStore.getState().updateQuantity(item.tempId, 3)
    expect(useCartStore.getState().items[0]).toMatchObject({ quantity: 3, lineTotal: 105000 })
    useCartStore.getState().updateQuantity(item.tempId, 0)
    expect(useCartStore.getState().items).toEqual([])
  })

  it('removes last item and clears discounts safely', () => {
    const item = useCartStore.getState().addItem(baseItem)
    useCartStore.getState().setDiscount({ type: 'fixed', value: 10000 })
    useCartStore.getState().removeItem(item.tempId)
    expect(useCartStore.getState().items).toEqual([])
    expect(useCartStore.getState().discount).toBeNull()
  })

  it('trims item notes, caps at 200 characters, and clears blank notes', () => {
    const item = useCartStore.getState().addItem(baseItem)
    useCartStore.getState().updateItemNote(item.tempId, ` ${'a'.repeat(250)} `)
    expect(useCartStore.getState().items[0]?.note).toHaveLength(200)
    useCartStore.getState().updateItemNote(item.tempId, '   ')
    expect(useCartStore.getState().items[0]?.note).toBeUndefined()
  })

  it('applies/removes discounts and clamps invalid values', () => {
    useCartStore.getState().addItem(baseItem)
    useCartStore.getState().setDiscount({ type: 'fixed', value: 999999 })
    expect(useCartStore.getState().discount).toEqual({ type: 'fixed', value: 35000 })
    useCartStore.getState().setDiscount({ type: 'percentage', value: 150 })
    expect(useCartStore.getState().discount).toEqual({ type: 'percentage', value: 100 })
    useCartStore.getState().setDiscount(null)
    expect(useCartStore.getState().discount).toBeNull()
  })

  it('calculates subtotal, discount amount, and total with integer VND math', () => {
    const item = useCartStore.getState().addItem({ ...baseItem, quantity: 2 })
    expect(calculateCartTotals([item], { type: 'percentage', value: 15 })).toMatchObject({ subtotal: 70000, discountAmount: 10500, total: 59500 })
  })

  it('clearCart and resetCart both clear items and discount', () => {
    useCartStore.getState().addItem(baseItem)
    useCartStore.getState().setDiscount({ type: 'percentage', value: 10 })
    useCartStore.getState().clearCart()
    expect(useCartStore.getState()).toMatchObject({ items: [], discount: null })
    useCartStore.getState().addItem(baseItem)
    useCartStore.getState().resetCart()
    expect(useCartStore.getState()).toMatchObject({ items: [], discount: null })
  })

  // Story 6.8: table context tests (AC15)
  it('setTableContext sets tableId and tableNameSnapshot as a pair', () => {
    useCartStore.getState().setTableContext({ id: 'table-1', name: 'Bàn 3' })
    expect(useCartStore.getState()).toMatchObject({ tableId: 'table-1', tableNameSnapshot: 'Bàn 3' })
  })

  it('setTableContext(null) clears both tableId and tableNameSnapshot', () => {
    useCartStore.getState().setTableContext({ id: 'table-1', name: 'Bàn 3' })
    useCartStore.getState().setTableContext(null)
    expect(useCartStore.getState()).toMatchObject({ tableId: null, tableNameSnapshot: null })
  })

  it('resetCart clears tableId and tableNameSnapshot (AC3)', () => {
    useCartStore.getState().setTableContext({ id: 'table-1', name: 'Bàn 3' })
    useCartStore.getState().addItem(baseItem)
    useCartStore.getState().resetCart()
    expect(useCartStore.getState()).toMatchObject({ tableId: null, tableNameSnapshot: null, items: [] })
  })

  it('clearCart clears tableId and tableNameSnapshot (AC3)', () => {
    useCartStore.getState().setTableContext({ id: 'table-2', name: 'Bàn 5' })
    useCartStore.getState().addItem(baseItem)
    useCartStore.getState().clearCart()
    expect(useCartStore.getState()).toMatchObject({ tableId: null, tableNameSnapshot: null, items: [] })
  })

  it('initial state has tableId and tableNameSnapshot as null', () => {
    expect(useCartStore.getState()).toMatchObject({ tableId: null, tableNameSnapshot: null })
  })
})
