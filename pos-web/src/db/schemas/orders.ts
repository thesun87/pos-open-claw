import type { CartDiscount, CartItem } from '../../features/orders/types'
import type { LocalOrder } from '../../features/orders/types'

export type OrderSyncStatus = 'pendingSync' | 'synced' | 'syncFailed'

export interface LocalOrderRecord extends LocalOrder {
  cashierId?: string
  status: OrderSyncStatus
  serverOrderId?: string
  failReason?: string | null
  lastTriedAt?: string
  syncedAt?: string
  voidedAt?: string
  voidReason?: string
  createdAt: string
  updatedAt: string
}

export type PersistedLocalOrder = LocalOrderRecord

export const ORDERS_SCHEMA = 'clientOrderId, status, soldAt, deviceId, createdAt'

/**
 * Story 6.13: Per-table draft cart record — single-device local storage.
 * PK = tableId (one draft per table). Stores items + discount to reload when
 * cashier re-selects a previously held table on the same device.
 * KHÔNG sync to server; KHÔNG cross-device. Epic 7 handles multi-device.
 */
export interface TableDraftRecord {
  tableId: string
  items: CartItem[]
  discount: CartDiscount | null
  updatedAt: string
}
