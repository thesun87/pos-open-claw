import axios from 'axios'
import { db } from '../../db/dexie'
import type { LocalOrderRecord } from '../../db/schemas/orders'
import { apiClient } from '../../shared/lib/api-client'
import { useConnectivityStore } from '../../shared/stores/connectivity.store'
import { getRetryDelay, shouldPauseAfterAttempt } from './retry'

export type SyncEngineState = 'idle' | 'running' | 'backoff'

interface SyncOrderResponse {
  orderId: string
  idempotent_replay?: boolean
  syncedAt?: string
}

interface SyncOrderPayload {
  clientOrderId: string
  orderCode: string
  deviceId: string
  soldAt: string
  menuVersionAtSale: number
  items: LocalOrderRecord['items']
  discountAmount: number
  total: number
  paymentMethod: LocalOrderRecord['paymentMethod']
}

function buildSyncPayload(order: LocalOrderRecord): SyncOrderPayload {
  return {
    clientOrderId: order.clientOrderId,
    orderCode: order.orderCode,
    deviceId: order.deviceId,
    soldAt: order.soldAt,
    menuVersionAtSale: order.menuVersionAtSale,
    items: order.items,
    discountAmount: order.discountAmount,
    total: order.total,
    paymentMethod: order.paymentMethod,
  }
}

function extractSafeFailReason(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { detail?: unknown; message?: unknown } | undefined
    if (typeof data?.detail === 'string' && data.detail.trim()) return data.detail
    if (typeof data?.message === 'string' && data.message.trim()) return data.message
  }
  return 'Không thể đồng bộ đơn hàng. Vui lòng kiểm tra lại dữ liệu đơn.'
}

function isNonRetryableClientError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false
  const status = error.response?.status
  return status === 400 || status === 409 || status === 422 || (typeof status === 'number' && status >= 400 && status < 500 && status !== 401 && status !== 403 && status !== 429)
}

function isRetryableError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return true
  const status = error.response?.status
  return status === undefined || status >= 500 || status === 401 || status === 403 || status === 429
}

export class SyncEngine {
  private state: SyncEngineState = 'idle'
  private retryAttemptCount = 0
  private backoffTimer: ReturnType<typeof setTimeout> | undefined

  getState(): SyncEngineState {
    return this.state
  }

  kick(): void {
    if (this.state !== 'idle' || this.backoffTimer) return
    void this.drain()
  }

  async drain(): Promise<void> {
    if (this.state === 'running') return
    if (this.state === 'backoff') return

    this.setState('running')

    try {
      while (true) {
        const orders = await db.orders.where('status').equals('pendingSync').sortBy('createdAt')
        const order = orders[0]
        if (!order) {
          this.retryAttemptCount = 0
          this.setState('idle')
          return
        }

        try {
          const response = await apiClient.post<SyncOrderResponse>('/orders', buildSyncPayload(order), {
            headers: { 'Idempotency-Key': order.clientOrderId },
          })
          const nowIso = new Date().toISOString()
          await db.orders.update(order.clientOrderId, {
            status: 'synced',
            serverOrderId: response.data.orderId,
            syncedAt: response.data.syncedAt ?? nowIso,
            updatedAt: nowIso,
          })
          this.retryAttemptCount = 0
          useConnectivityStore.getState().setSyncUiState(this.state, new Date())
        } catch (error) {
          const nowIso = new Date().toISOString()
          if (isNonRetryableClientError(error)) {
            const status = axios.isAxiosError(error) ? error.response?.status : undefined
            const detail = extractSafeFailReason(error)
            await db.orders.update(order.clientOrderId, {
              status: 'syncFailed',
              failReason: detail,
              lastTriedAt: nowIso,
              updatedAt: nowIso,
            })
            console.warn('Order sync failed with non-retryable client error', {
              clientOrderId: order.clientOrderId,
              status,
              detail,
            })
            continue
          }

          if (isRetryableError(error)) {
            await db.orders.update(order.clientOrderId, {
              lastTriedAt: nowIso,
              updatedAt: nowIso,
            })
            this.scheduleBackoff()
            return
          }

          throw error
        }
      }
    } catch (error) {
      this.setState('idle')
      throw error
    }
  }

  private setState(state: SyncEngineState): void {
    this.state = state
    useConnectivityStore.getState().setSyncUiState(state)
  }

  private scheduleBackoff(): void {
    const delay = getRetryDelay(this.retryAttemptCount)
    this.retryAttemptCount += 1

    this.setState('backoff')
    this.backoffTimer = setTimeout(() => {
      this.backoffTimer = undefined
      this.setState('idle')

      if (shouldPauseAfterAttempt(this.retryAttemptCount)) return

      void this.drain()
    }, delay)
  }
}

export const syncEngine = new SyncEngine()
