import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../db/dexie'
import { MENU_META_ID } from '../../db/schemas/menu'
import * as orderCode from '../../shared/lib/order-code'
import { buildLocalOrder } from './builder'
import type { CartItem } from './types'

const items: CartItem[] = [
  { tempId: 'tmp-1', productId: 'p-1', productNameSnapshot: 'Bạc Xỉu', unitPriceSnapshot: 35000, options: [{ optionId: 'o-l', labelSnapshot: 'L', priceDeltaSnapshot: 5000 }], note: 'ít đá', quantity: 2, lineTotal: 80000 },
  { tempId: 'tmp-2', productId: 'p-2', productNameSnapshot: 'Trà đào', unitPriceSnapshot: 45000, options: [], quantity: 1, lineTotal: 45000 },
]

beforeEach(async () => {
  await db.open(); await db.orders.clear(); await db.menuMeta.clear()
  vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date(2026, 4, 9, 8, 0, 0))
  await db.menuMeta.put({ id: MENU_META_ID, menuVersion: 7, lastPulledAt: '2026-05-09T00:00:00.000Z' })
})

afterEach(async () => {
  vi.useRealTimers(); await db.orders.clear(); await db.menuMeta.clear(); db.close()
})

describe('buildLocalOrder', () => {
  it('builds snapshot order with fixed discount, uuid v7, UTC soldAt, menu version, and no mutation', async () => {
    await db.orders.bulkPut([
      { id: 'old-1', createdAt: 1, deviceId: 'POS01', soldAt: '2026-05-09T01:00:00.000Z' },
      { id: 'other-device', createdAt: 2, deviceId: 'POS02', soldAt: '2026-05-09T02:00:00.000Z' },
    ])
    const cart = { items, discount: { type: 'fixed' as const, value: 10000 } }
    const before = structuredClone(cart)
    const order = await buildLocalOrder(cart, 'transfer', 'POS01')

    expect(order.clientOrderId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
    expect(order.orderCode).toBe('20260509-POS01-0002')
    expect(order.soldAt).toBe('2026-05-09T01:00:00.000Z')
    expect(order.soldAt.endsWith('Z')).toBe(true)
    expect(order.menuVersionAtSale).toBe(7)
    expect(order.discountAmount).toBe(10000)
    expect(order.total).toBe(115000)
    expect(order.paymentMethod).toBe('transfer')
    expect(order.items[0]).toMatchObject({ productNameSnapshot: 'Bạc Xỉu', unitPriceSnapshot: 35000, note: 'ít đá', quantity: 2, lineTotal: 80000 })
    expect(order.items[0]?.options).toEqual([{ optionId: 'o-l', labelSnapshot: 'L', priceDeltaSnapshot: 5000 }])
    expect(cart).toEqual(before)
    expect(order.items[0]?.options).not.toBe(items[0]?.options)
  })

  it('supports percentage discounts and menu-version fallback', async () => {
    await db.menuMeta.clear()
    const order = await buildLocalOrder({ items, discount: { type: 'percentage', value: 10 } }, 'card', 'POS01')
    expect(order.discountAmount).toBe(12500)
    expect(order.total).toBe(112500)
    expect(order.menuVersionAtSale).toBe(0)
  })

  it('uses the same captured sale date for soldAt, sequence, and orderCode', async () => {
    const codeSpy = vi.spyOn(orderCode, 'generateOrderCode')
    const order = await buildLocalOrder({ items, discount: null }, 'cash', 'POS01')

    expect(codeSpy).toHaveBeenCalledTimes(1)
    const [, , dateArg] = codeSpy.mock.calls[0] ?? []
    expect(dateArg).toBeInstanceOf(Date)
    expect((dateArg as Date).toISOString()).toBe(order.soldAt)
    expect(order.orderCode.slice(0, 8)).toBe(orderCode.localOrderDatePart(dateArg as Date))
  })
})
