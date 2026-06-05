import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../db/dexie'
import { openLocalSession, settleLocalSession } from './session-store-actions'

// Mock sessionSyncEngine.kick to avoid actual network calls in unit tests
vi.mock('./session-sync', () => ({
  sessionSyncEngine: { kick: vi.fn() },
  installSessionSyncOnlineRecovery: vi.fn(() => () => undefined),
}))

beforeEach(async () => {
  await db.open()
  await db.tableSessions.clear()
})

afterEach(async () => {
  await db.tableSessions.clear()
  db.close()
})

describe('openLocalSession', () => {
  it('creates a new open session with pendingOpen syncStatus (AC24)', async () => {
    await openLocalSession({ tableId: 'table-1', deviceId: 'POS01' })
    const sessions = await db.tableSessions.toArray()
    expect(sessions).toHaveLength(1)
    expect(sessions[0]).toMatchObject({
      tableId: 'table-1',
      status: 'open',
      syncStatus: 'pendingOpen',
      openedByDevice: 'POS01',
    })
    expect(sessions[0]?.clientSessionId).toBeTruthy()
    expect(sessions[0]?.id).toBe(sessions[0]?.clientSessionId) // PK = clientSessionId
  })

  it('is idempotent — does not create a second session if one is already open (AC24)', async () => {
    await openLocalSession({ tableId: 'table-1', deviceId: 'POS01' })
    await openLocalSession({ tableId: 'table-1', deviceId: 'POS01' })
    const sessions = await db.tableSessions.toArray()
    expect(sessions).toHaveLength(1)
  })

  it('generates a valid uuidv7 clientSessionId (AC24)', async () => {
    await openLocalSession({ tableId: 'table-1', deviceId: 'POS01' })
    const session = (await db.tableSessions.toArray())[0]!
    // UUIDv7 pattern
    expect(session.clientSessionId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
  })

  it('creates a new session if existing one is syncFailed (AC24)', async () => {
    // Simulate a failed session
    await db.tableSessions.add({
      id: 'old-session-id',
      clientSessionId: 'old-session-id',
      tableId: 'table-1',
      status: 'open',
      openedByDevice: 'POS01',
      openedAt: new Date().toISOString(),
      syncStatus: 'syncFailed',
    })
    await openLocalSession({ tableId: 'table-1', deviceId: 'POS01' })
    const sessions = await db.tableSessions.toArray()
    // Should have 2 now — the failed one + a new pendingOpen
    expect(sessions).toHaveLength(2)
    const newSession = sessions.find((s) => s.syncStatus === 'pendingOpen')
    expect(newSession).toBeTruthy()
  })

  it('does not open session for different tableIds in isolation', async () => {
    await openLocalSession({ tableId: 'table-1', deviceId: 'POS01' })
    await openLocalSession({ tableId: 'table-2', deviceId: 'POS01' })
    const sessions = await db.tableSessions.toArray()
    expect(sessions).toHaveLength(2)
    expect(sessions.filter((s) => s.tableId === 'table-1')).toHaveLength(1)
    expect(sessions.filter((s) => s.tableId === 'table-2')).toHaveLength(1)
  })
})

describe('settleLocalSession', () => {
  it('settles an open session (AC26)', async () => {
    await openLocalSession({ tableId: 'table-1', deviceId: 'POS01' })
    await settleLocalSession('table-1')
    const sessions = await db.tableSessions.toArray()
    expect(sessions).toHaveLength(1)
    expect(sessions[0]).toMatchObject({ status: 'settled', syncStatus: 'pendingSettle' })
  })

  it('is a no-op when no open session for table (AC26)', async () => {
    // Should not throw
    await expect(settleLocalSession('table-nonexistent')).resolves.toBeUndefined()
    const sessions = await db.tableSessions.toArray()
    expect(sessions).toHaveLength(0)
  })

  it('does not settle sessions of other tables (AC26)', async () => {
    await openLocalSession({ tableId: 'table-1', deviceId: 'POS01' })
    await openLocalSession({ tableId: 'table-2', deviceId: 'POS01' })
    await settleLocalSession('table-1')
    const t1Sessions = await db.tableSessions.filter((s) => s.tableId === 'table-1').toArray()
    const t2Sessions = await db.tableSessions.filter((s) => s.tableId === 'table-2').toArray()
    expect(t1Sessions[0]?.status).toBe('settled')
    expect(t2Sessions[0]?.status).toBe('open')
  })
})
