import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db, PosDexie } from '../../db/dexie'
import { MENU_META_ID } from '../../db/schemas/menu'
import { syncEngine } from '../sync/engine'
import { finalizeOrder } from './api'
import type { CartItem } from './types'

vi.mock('../sync/engine', () => ({ syncEngine: { kick: vi.fn() } }))

const item: CartItem = {
  tempId: 'tmp-1',
  productId: 'p-tra',
  productNameSnapshot: 'Trà đào',
  unitPriceSnapshot: 45000,
  options: [{ optionId: 'o-l', labelSnapshot: 'L', priceDeltaSnapshot: 5000 }],
  quantity: 1,
  lineTotal: 50000,
}

beforeEach(async () => {
  vi.setSystemTime(new Date('2026-05-13T10:00:00.000Z'))
  await db.open()
  await db.orders.clear()
  await db.menuMeta.clear()
  await db.menuMeta.put({ id: MENU_META_ID, menuVersion: 12, lastPulledAt: '2026-05-13T09:00:00.000Z' })
  vi.mocked(syncEngine.kick).mockReset()
})

afterEach(async () => {
  await db.orders.clear()
  await db.menuMeta.clear()
  db.close()
})

describe('finalizeOrder', () => {
  it('writes a pending local order before kicking sync and returns persisted row', async () => {
    const order = await finalizeOrder({ cart: { items: [item], discount: null }, paymentMethod: 'cash', deviceId: 'POS01', cashierId: 'u-1' })
    const rows = await db.orders.where('status').equals('pendingSync').toArray()
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ clientOrderId: order.clientOrderId, cashierId: 'u-1', status: 'pendingSync', orderCode: '20260513-POS01-0001', menuVersionAtSale: 12, total: 50000, paymentMethod: 'cash' })
    expect(rows[0]!.items[0]).toMatchObject({ productNameSnapshot: 'Trà đào', unitPriceSnapshot: 45000, options: [{ labelSnapshot: 'L', priceDeltaSnapshot: 5000 }] })
    expect(syncEngine.kick).toHaveBeenCalledTimes(1)
  })

  it('does not await sync kick', async () => {
    vi.mocked(syncEngine.kick).mockImplementation(() => new Promise(() => undefined) as never)
    await expect(finalizeOrder({ cart: { items: [item], discount: null }, paymentMethod: 'transfer', deviceId: 'POS01' })).resolves.toMatchObject({ status: 'pendingSync' })
  })

  it('rejects empty carts without writing or kicking sync', async () => {
    await expect(finalizeOrder({ cart: { items: [], discount: null }, paymentMethod: 'cash', deviceId: 'POS01' })).rejects.toThrow('Không thể hoàn tất đơn trống')
    expect(await db.orders.count()).toBe(0)
    expect(syncEngine.kick).not.toHaveBeenCalled()
  })

  it('persists pending orders across Dexie reopen and supports status index queries', async () => {
    const order = await finalizeOrder({ cart: { items: [item], discount: null }, paymentMethod: 'card', deviceId: 'POS01' })
    await db.close()
    const reopened = new PosDexie('pos-bmad')
    await reopened.open()
    const rows = await reopened.orders.where('status').equals('pendingSync').toArray()
    expect(rows.map((row) => row.clientOrderId)).toContain(order.clientOrderId)
    reopened.close()
    await db.open()
  })
})
