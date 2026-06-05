import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../db/dexie'
import { useConnectivityStore } from '../../shared/stores/connectivity.store'
import type { TableSessionRecord } from '../../db/schemas/tables'
import { openTableSession, settleTableSession } from './session-api'

vi.mock('./session-api', () => ({
  openTableSession: vi.fn(),
  settleTableSession: vi.fn(),
}))

import { sessionSyncEngine } from './session-sync'

const mockOpenTableSession = vi.mocked(openTableSession)
const mockSettleTableSession = vi.mocked(settleTableSession)

function makeSession(overrides: Partial<TableSessionRecord> = {}): TableSessionRecord {
  return {
    id: 'client-session-1',
    clientSessionId: 'client-session-1',
    tableId: 'table-1',
    status: 'open',
    openedByDevice: 'POS01',
    openedAt: '2026-06-05T08:00:00.000Z',
    syncStatus: 'pendingOpen',
    ...overrides,
  }
}

beforeEach(async () => {
  useConnectivityStore.getState().setConnectivityState({ isOnline: true, lastCheckedAt: new Date() })
  await db.open()
  await db.tableSessions.clear()
  mockOpenTableSession.mockReset()
  mockSettleTableSession.mockReset()
})

afterEach(async () => {
  vi.restoreAllMocks()
  await db.tableSessions.clear()
  db.close()
})

describe('sessionSyncEngine.drainSessions', () => {
  it('pushes pendingOpen → gets serverSessionId, sets syncStatus=synced (AC25)', async () => {
    const session = makeSession({ syncStatus: 'pendingOpen' })
    await db.tableSessions.add(session)

    mockOpenTableSession.mockResolvedValue({
      id: 'server-session-id-1',
      tableId: 'table-1',
      status: 'open',
      openedByDevice: 'POS01',
      openedAt: '2026-06-05T08:00:00.000Z',
      clientSessionId: 'client-session-1',
      createdAt: '2026-06-05T08:00:00.000Z',
      updatedAt: '2026-06-05T08:00:00.000Z',
    })

    await sessionSyncEngine.drainSessions()

    const updated = await db.tableSessions.get(session.id)
    expect(updated?.serverSessionId).toBe('server-session-id-1')
    expect(updated?.syncStatus).toBe('synced')
    expect(mockOpenTableSession).toHaveBeenCalledWith(
      expect.objectContaining({ tableId: 'table-1', clientSessionId: 'client-session-1' }),
    )
  })

  it('pushes pendingSettle with serverSessionId (AC26, AC27)', async () => {
    const session = makeSession({ syncStatus: 'pendingSettle', serverSessionId: 'server-session-id-1', status: 'settled' })
    await db.tableSessions.add(session)

    mockSettleTableSession.mockResolvedValue({
      id: 'server-session-id-1',
      tableId: 'table-1',
      status: 'settled',
      openedByDevice: 'POS01',
      openedAt: '2026-06-05T08:00:00.000Z',
      clientSessionId: 'client-session-1',
      createdAt: '2026-06-05T08:00:00.000Z',
      updatedAt: '2026-06-05T08:00:00.000Z',
    })

    await sessionSyncEngine.drainSessions()

    const updated = await db.tableSessions.get(session.id)
    expect(updated?.syncStatus).toBe('settled')
    expect(mockSettleTableSession).toHaveBeenCalledWith('server-session-id-1')
  })

  it('skips settle when no serverSessionId yet — waits for open to sync first (AC27)', async () => {
    const session = makeSession({ syncStatus: 'pendingSettle', status: 'settled' })
    // No serverSessionId: open has not yet synced
    await db.tableSessions.add(session)

    await sessionSyncEngine.drainSessions()

    expect(mockSettleTableSession).not.toHaveBeenCalled()
    // Session remains pendingSettle
    const unchanged = await db.tableSessions.get(session.id)
    expect(unchanged?.syncStatus).toBe('pendingSettle')
  })

  it('processes open before settle in single drain pass (AC27)', async () => {
    const openSession = makeSession({ id: 'cs-open', clientSessionId: 'cs-open', syncStatus: 'pendingOpen' })
    const settleSession = makeSession({
      id: 'cs-settle',
      clientSessionId: 'cs-settle',
      tableId: 'table-2',
      syncStatus: 'pendingSettle',
      status: 'settled',
      serverSessionId: 'server-id-2',
    })
    await db.tableSessions.bulkAdd([openSession, settleSession])

    const callOrder: string[] = []
    mockOpenTableSession.mockImplementation(async () => {
      callOrder.push('open')
      return {
        id: 'server-id-1',
        tableId: 'table-1',
        status: 'open',
        openedByDevice: 'POS01',
        openedAt: '2026-06-05T08:00:00.000Z',
        clientSessionId: 'cs-open',
        createdAt: '2026-06-05T08:00:00.000Z',
        updatedAt: '2026-06-05T08:00:00.000Z',
      }
    })
    mockSettleTableSession.mockImplementation(async () => {
      callOrder.push('settle')
      return {
        id: 'server-id-2',
        tableId: 'table-2',
        status: 'settled',
        openedByDevice: 'POS01',
        openedAt: '2026-06-05T08:00:00.000Z',
        clientSessionId: 'cs-settle',
        createdAt: '2026-06-05T08:00:00.000Z',
        updatedAt: '2026-06-05T08:00:00.000Z',
      }
    })

    await sessionSyncEngine.drainSessions()

    // Open must come before settle (AC27)
    expect(callOrder.indexOf('open')).toBeLessThan(callOrder.indexOf('settle'))
  })

  it('marks syncFailed on non-retryable 4xx for open (AC25)', async () => {
    const session = makeSession({ syncStatus: 'pendingOpen' })
    await db.tableSessions.add(session)

    const error = Object.assign(new Error('Bad Request'), {
      isAxiosError: true,
      response: { status: 400 },
    })
    mockOpenTableSession.mockRejectedValue(error)

    await sessionSyncEngine.drainSessions()

    const updated = await db.tableSessions.get(session.id)
    expect(updated?.syncStatus).toBe('syncFailed')
  })

  it('does NOT drain when offline', async () => {
    useConnectivityStore.getState().setConnectivityState({ isOnline: false, lastCheckedAt: new Date() })
    const session = makeSession({ syncStatus: 'pendingOpen' })
    await db.tableSessions.add(session)

    await sessionSyncEngine.drainSessions()

    expect(mockOpenTableSession).not.toHaveBeenCalled()
  })

  it('idempotent replay for open — 200 response still sets serverSessionId (AC25)', async () => {
    const session = makeSession({ syncStatus: 'pendingOpen' })
    await db.tableSessions.add(session)

    mockOpenTableSession.mockResolvedValue({
      id: 'server-session-id-replay',
      tableId: 'table-1',
      status: 'open',
      openedByDevice: 'POS01',
      openedAt: '2026-06-05T08:00:00.000Z',
      clientSessionId: 'client-session-1',
      createdAt: '2026-06-05T08:00:00.000Z',
      updatedAt: '2026-06-05T08:00:00.000Z',
    })

    await sessionSyncEngine.drainSessions()

    const updated = await db.tableSessions.get(session.id)
    expect(updated?.serverSessionId).toBe('server-session-id-replay')
    expect(updated?.syncStatus).toBe('synced')
  })
})
