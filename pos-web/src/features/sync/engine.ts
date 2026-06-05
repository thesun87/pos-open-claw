import axios from 'axios'
import { db } from '../../db/dexie'
import type { LocalOrderRecord } from '../../db/schemas/orders'
import { apiClient } from '../../shared/lib/api-client'
import type { ProblemDetails } from '../../shared/lib/error-mapper'
import { useConnectivityStore } from '../../shared/stores/connectivity.store'
import { mapProblemToAction } from '../../shared/lib/error-mapper'
import { checkAndPullIfNewer } from '../menu/sync'
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
  // Story 6.8: pair invariant — both null or both non-null (FR51/AR24)
  tableId: string | null
  tableNameSnapshot: string | null
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
    tableId: order.tableId ?? null,
    tableNameSnapshot: order.tableNameSnapshot ?? null,
  }
}

const SAFE_SYNC_FAIL_REASON = 'Chưa đồng bộ được. Hệ thống sẽ thử lại khi có mạng.'

function extractProblemDetails(error: unknown): ProblemDetails | undefined {
  if (!axios.isAxiosError(error)) return undefined
  const data = error.response?.data
  return data && typeof data === 'object' ? (data as ProblemDetails) : undefined
}

function extractTraceId(error: unknown, problemDetail: ProblemDetails | undefined): string | undefined {
  if (typeof problemDetail?.traceId === 'string') return problemDetail.traceId
  if (!axios.isAxiosError(error)) return undefined
  const headerValue = error.response?.headers?.['x-trace-id'] ?? error.response?.headers?.['X-Trace-Id']
  return typeof headerValue === 'string' ? headerValue : undefined
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
  private readonly refreshMenu: () => Promise<unknown>

  constructor(refreshMenu: () => Promise<unknown> = () => checkAndPullIfNewer()) {
    this.refreshMenu = refreshMenu
  }

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
          const problemDetail = extractProblemDetails(error)
          const action = mapProblemToAction(problemDetail)
          if (action.type === 'retry-after-action' && action.payload.action === 'refresh-menu') {
            try {
              await this.refreshMenu()
              await db.orders.update(order.clientOrderId, { lastTriedAt: nowIso, updatedAt: nowIso })
              continue
            } catch {
              await db.orders.update(order.clientOrderId, { lastTriedAt: nowIso, updatedAt: nowIso })
              this.scheduleBackoff()
              return
            }
          }

          if (isNonRetryableClientError(error)) {
            await db.orders.update(order.clientOrderId, {
              status: 'syncFailed',
              failReason: SAFE_SYNC_FAIL_REASON,
              lastTriedAt: nowIso,
              updatedAt: nowIso,
            })
            console.warn('[sync] failed', {
              clientOrderId: order.clientOrderId,
              problemDetail: { type: problemDetail?.type },
              traceId: extractTraceId(error, problemDetail),
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
