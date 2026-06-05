import { db } from '../../db/dexie'
import { MENU_META_ID } from '../../db/schemas/menu'
import { generateOrderCode } from '../../shared/lib/order-code'
import { createUuidV7 } from '../../shared/lib/uuid'
import { calculateCartTotals } from './cart-store'
import type { CartDiscount, CartItem, LocalOrder, LocalOrderItem, PaymentMethod } from './types'

type CartLike = { items: CartItem[]; discount: CartDiscount | null; tableId?: string | null; tableNameSnapshot?: string | null }

function localDayBounds(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const end = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
  return { start, end }
}

export async function getNextOrderSequence(deviceId: string, now = new Date()): Promise<number> {
  const { start, end } = localDayBounds(now)
  const rows = await db.orders.toArray()
  const count = rows.filter((row) => {
    if (row.deviceId !== deviceId || !row.soldAt) return false
    const soldAt = new Date(row.soldAt)
    return soldAt >= start && soldAt < end
  }).length
  return count + 1
}

async function getMenuVersionAtSale() {
  const meta = await db.menuMeta.get(MENU_META_ID)
  return meta?.menuVersion ?? 0
}

function copyOrderItem(item: CartItem): LocalOrderItem {
  const orderItem: LocalOrderItem = {
    productId: item.productId,
    productNameSnapshot: item.productNameSnapshot,
    unitPriceSnapshot: item.unitPriceSnapshot,
    options: item.options.map((option) => ({ ...option })),
    quantity: item.quantity,
    lineTotal: item.lineTotal,
  }
  return item.note ? { ...orderItem, note: item.note } : orderItem
}

export async function buildLocalOrder(cart: CartLike, paymentMethod: PaymentMethod, deviceId: string): Promise<LocalOrder> {
  const soldAtDate = new Date()
  const soldAt = soldAtDate.toISOString()
  const [menuVersionAtSale, sequence] = await Promise.all([
    getMenuVersionAtSale(),
    getNextOrderSequence(deviceId, soldAtDate),
  ])
  const totals = calculateCartTotals(cart.items, cart.discount)
  return {
    clientOrderId: createUuidV7(),
    orderCode: generateOrderCode(deviceId, sequence, soldAtDate),
    deviceId,
    soldAt,
    menuVersionAtSale,
    items: cart.items.map(copyOrderItem),
    discountAmount: totals.discountAmount,
    total: totals.total,
    paymentMethod,
    tableId: cart.tableId ?? null,
    tableNameSnapshot: cart.tableNameSnapshot ?? null,
  }
}
