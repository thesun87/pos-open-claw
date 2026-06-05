import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AxiosError, type AxiosResponse } from 'axios'
import { db } from '../../db/dexie'
import type { LocalOrderRecord } from '../../db/schemas/orders'
import { apiClient } from '../../shared/lib/api-client'
import { SyncEngine } from './engine'
import { checkAndPullIfNewer } from '../menu/sync'

vi.mock('../../shared/lib/api-client', () => ({
  apiClient: { post: vi.fn() },
}))
vi.mock('../menu/sync', () => ({ checkAndPullIfNewer: vi.fn().mockResolvedValue(undefined) }))

const postMock = vi.mocked(apiClient.post)

async function flushAsyncWork(): Promise<void> {
  for (let index = 0; index < 5; index += 1) await Promise.resolve()
}

function order(id: string, createdAt: string): LocalOrderRecord {
  return {
    clientOrderId: id,
    orderCode: `OC-${id}`,
    deviceId: 'POS01',
    soldAt: createdAt,
    menuVersionAtSale: 1,
    items: [{ productId: 'p1', productNameSnapshot: 'Cà phê', unitPriceSnapshot: 20000, options: [], quantity: 1, lineTotal: 20000 }],
    discountAmount: 0,
    total: 20000,
    paymentMethod: 'cash',
    tableId: null,
    tableNameSnapshot: null,
    status: 'pendingSync',
    createdAt,
    updatedAt: createdAt,
  }
}

function ok(orderId: string, extra: Record<string, unknown> = {}) {
  return Promise.resolve({ data: { orderId, syncedAt: '2026-05-14T00:00:00.000Z', ...extra } } as AxiosResponse)
}

function axiosError(status?: number, data?: unknown) {
  return new AxiosError('fail', undefined, undefined, undefined, status ? ({ status, data } as AxiosResponse) : undefined)
}

beforeEach(async () => {
  postMock.mockReset()
  vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  await db.orders.clear()
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('SyncEngine', () => {
  it('syncs one pending order with idempotency header and success patch', async () => {
    const engine = new SyncEngine()
    await db.orders.put(order('c1', '2026-05-14T01:00:00.000Z'))
    postMock.mockReturnValue(ok('s1'))

    engine.kick()
    await vi.waitFor(() => expect(postMock).toHaveBeenCalledTimes(1))
    await vi.waitFor(async () => expect((await db.orders.get('c1'))?.status).toBe('synced'))

    expect(postMock).toHaveBeenCalledWith('/orders', expect.objectContaining({ clientOrderId: 'c1', items: expect.any(Array) }), { headers: { 'Idempotency-Key': 'c1' } })
    expect(await db.orders.get('c1')).toMatchObject({ serverOrderId: 's1', syncedAt: '2026-05-14T00:00:00.000Z' })
  })

  it('posts three orders sequentially by createdAt', async () => {
    const engine = new SyncEngine()
    await db.orders.bulkPut([
      order('c3', '2026-05-14T03:00:00.000Z'),
      order('c1', '2026-05-14T01:00:00.000Z'),
      order('c2', '2026-05-14T02:00:00.000Z'),
    ])
    let resolveFirst!: (value: AxiosResponse) => void
    postMock.mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve }))
    postMock.mockReturnValueOnce(ok('s2')).mockReturnValueOnce(ok('s3'))

    const drain = engine.drain()
    await vi.waitFor(() => expect(postMock).toHaveBeenCalledTimes(1))
    expect(postMock.mock.calls[0]?.[1]).toMatchObject({ clientOrderId: 'c1' })
    resolveFirst({ data: { orderId: 's1' } } as AxiosResponse)
    await drain

    expect(postMock.mock.calls.map((call) => (call[1] as { clientOrderId: string }).clientOrderId)).toEqual(['c1', 'c2', 'c3'])
  })

  it('backs off after network failure then succeeds', async () => {
    const engine = new SyncEngine()
    await db.orders.put(order('c1', '2026-05-14T01:00:00.000Z'))
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    postMock.mockRejectedValueOnce(axiosError()).mockReturnValueOnce(ok('s1'))

    await engine.drain()
    expect(engine.getState()).toBe('backoff')
    expect((await db.orders.get('c1'))?.status).toBe('pendingSync')

    await vi.advanceTimersByTimeAsync(999)
    await flushAsyncWork()
    expect(postMock).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    await flushAsyncWork()

    expect(postMock).toHaveBeenCalledTimes(2)
    expect((await db.orders.get('c1'))?.status).toBe('synced')
  })

  it('observes the full 1s, 2s, 4s, 8s, 16s backoff sequence before pausing to idle', async () => {
    const engine = new SyncEngine()
    await db.orders.put(order('c1', '2026-05-14T01:00:00.000Z'))
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    postMock.mockRejectedValue(axiosError())

    await engine.drain()
    expect(engine.getState()).toBe('backoff')

    for (const expectedCallCount of [2, 3, 4, 5]) {
      await vi.advanceTimersToNextTimerAsync()
      expect(postMock).toHaveBeenCalledTimes(expectedCallCount)
      await vi.waitFor(() => expect(engine.getState()).toBe('backoff'))
    }

    await vi.advanceTimersToNextTimerAsync()
    await flushAsyncWork()
    expect(engine.getState()).toBe('idle')
    expect(postMock).toHaveBeenCalledTimes(5)
    expect((await db.orders.get('c1'))?.status).toBe('pendingSync')
  })

  it('marks 4xx validation errors syncFailed with sanitized reason and safe warning payload, then continues', async () => {
    const engine = new SyncEngine()
    await db.orders.bulkPut([order('bad', '2026-05-14T01:00:00.000Z'), order('good', '2026-05-14T02:00:00.000Z')])
    postMock.mockRejectedValueOnce(axiosError(422, { type: 'https://api.test/problems/validation', detail: 'payload invalid tenant_id stack', traceId: 'trace-1' })).mockReturnValueOnce(ok('s2'))

    await engine.drain()

    expect(await db.orders.get('bad')).toMatchObject({ status: 'syncFailed', failReason: 'Chưa đồng bộ được. Hệ thống sẽ thử lại khi có mạng.' })
    expect(await db.orders.get('good')).toMatchObject({ status: 'synced', serverOrderId: 's2' })
    expect(console.warn).toHaveBeenCalledWith('[sync] failed', { clientOrderId: 'bad', problemDetail: { type: 'https://api.test/problems/validation' }, traceId: 'trace-1' })
    expect(JSON.stringify((await db.orders.get('bad'))?.failReason)).not.toContain('tenant_id')
  })

  it('treats idempotent replay as success with local syncedAt fallback', async () => {
    const engine = new SyncEngine()
    await db.orders.put(order('c1', '2026-05-14T01:00:00.000Z'))
    postMock.mockReturnValue(ok('s1', { idempotent_replay: true, syncedAt: undefined }))

    await engine.drain()

    const synced = await db.orders.get('c1')
    expect(synced).toMatchObject({ status: 'synced', serverOrderId: 's1' })
    expect(synced?.syncedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('refreshes menu-version-stale errors and retries without marking order failed or rebuilding payload', async () => {
    const engine = new SyncEngine()
    const stale = order('stale', '2026-05-14T01:00:00.000Z')
    await db.orders.put(stale)
    postMock.mockRejectedValueOnce(axiosError(409, { type: 'https://api.test/problems/menu-version-stale' })).mockReturnValueOnce(ok('s1'))

    await engine.drain()

    expect(checkAndPullIfNewer).toHaveBeenCalledTimes(1)
    expect(postMock).toHaveBeenCalledTimes(2)
    expect(postMock.mock.calls[1]?.[1]).toMatchObject({ menuVersionAtSale: 1, items: stale.items })
    expect(await db.orders.get('stale')).toMatchObject({ status: 'synced', serverOrderId: 's1', menuVersionAtSale: 1, items: stale.items })
  })

  it('keeps stale-menu refresh failures retryable with backoff', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    vi.mocked(checkAndPullIfNewer).mockRejectedValueOnce(new Error('offline'))
    const engine = new SyncEngine()
    await db.orders.put(order('stale', '2026-05-14T01:00:00.000Z'))
    postMock.mockRejectedValueOnce(axiosError(409, { type: 'https://api.test/problems/menu-version-stale' }))

    await engine.drain()

    expect(engine.getState()).toBe('backoff')
    expect(await db.orders.get('stale')).toMatchObject({ status: 'pendingSync' })
  })

  it('keeps kick idempotent while running', async () => {
    const engine = new SyncEngine()
    await db.orders.put(order('c1', '2026-05-14T01:00:00.000Z'))
    let resolvePost!: (value: AxiosResponse) => void
    postMock.mockReturnValue(new Promise((resolve) => { resolvePost = resolve }))

    engine.kick()
    engine.kick()
    await vi.waitFor(() => expect(postMock).toHaveBeenCalledTimes(1))
    resolvePost({ data: { orderId: 's1' } } as AxiosResponse)
    await vi.waitFor(async () => expect((await db.orders.get('c1'))?.status).toBe('synced'))
  })
})
