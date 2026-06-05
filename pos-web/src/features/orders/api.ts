import { db } from '../../db/dexie'
import { apiClient } from '../../shared/lib/api-client'
import type { LocalOrderRecord } from '../../db/schemas/orders'
import { syncEngine } from '../sync/engine'
import { buildLocalOrder } from './builder'
import type { CartDiscount, CartItem, PaymentMethod } from './types'

export type FinalizeOrderInput = {
  cart: { items: CartItem[]; discount: CartDiscount | null; tableId?: string | null; tableNameSnapshot?: string | null }
  paymentMethod: PaymentMethod
  deviceId: string
  cashierId?: string
}

export type VoidSyncedOrderInput = { serverOrderId: string; reason: string }
export type VoidSyncedOrderResponse = { voidId: string; voidedAt: string }

export async function voidSyncedOrder({ serverOrderId, reason }: VoidSyncedOrderInput): Promise<VoidSyncedOrderResponse> {
  const response = await apiClient.post<VoidSyncedOrderResponse>(`/orders/${serverOrderId}/void`, { reason: reason.trim() })
  return response.data
}

export class FinalizeOrderError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FinalizeOrderError'
  }
}

export async function finalizeOrder({ cart, paymentMethod, deviceId, cashierId }: FinalizeOrderInput): Promise<LocalOrderRecord> {
  if (cart.items.length === 0) {
    throw new FinalizeOrderError('Không thể hoàn tất đơn trống.')
  }

  const localOrder = await buildLocalOrder(cart, paymentMethod, deviceId)
  const nowIso = new Date().toISOString()
  const persistedOrder: LocalOrderRecord = {
    ...localOrder,
    ...(cashierId ? { cashierId } : {}),
    status: 'pendingSync',
    createdAt: nowIso,
    updatedAt: nowIso,
  }

  await db.orders.add(persistedOrder)
  void syncEngine.kick()
  return persistedOrder
}
