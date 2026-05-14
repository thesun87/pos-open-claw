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
