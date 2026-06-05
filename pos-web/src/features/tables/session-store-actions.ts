/**
 * Session Dexie write actions — Story 6.8 Tier A
 *
 * Offline-first: writes local Dexie records with syncStatus=pendingOpen/pendingSettle.
 * useLocalTableStatus (6.10) derives 'serving' status from status='open' immediately.
 * Sync is handled separately by sessionSyncEngine.
 *
 * Boundary §8: only imports from db/, shared/. No cross-feature imports.
 */
import { db } from '../../db/dexie'
import { uuidv7 } from '../../shared/lib/uuid'
import { sessionSyncEngine } from './session-sync'

/**
 * Open a local session for a table (idempotent).
 *
 * Idempotency: if there's already an open session for this tableId opened by this device
 * and not syncFailed → reuse (no-op). Only create when none exists.
 * After creating: kicks sessionSyncEngine to push pendingOpen → server.
 */
export async function openLocalSession({
  tableId,
  deviceId,
}: {
  tableId: string
  deviceId: string
}): Promise<void> {
  // Check for existing open session for this tableId
  const existing = await db.tableSessions
    .filter((s) => s.tableId === tableId && s.status === 'open' && s.syncStatus !== 'syncFailed')
    .first()

  if (existing) {
    // Idempotent: already have an open session for this table → reuse
    return
  }

  const clientSessionId = uuidv7()
  await db.tableSessions.add({
    id: clientSessionId,
    clientSessionId,
    tableId,
    status: 'open',
    openedByDevice: deviceId,
    openedAt: new Date().toISOString(),
    syncStatus: 'pendingOpen',
  })

  sessionSyncEngine.kick()
}

/**
 * Settle the open session for a table (idempotent).
 *
 * Finds the open session for the given tableId → sets status='settled', syncStatus='pendingSettle'.
 * useLocalTableStatus will stop counting this session as open immediately.
 * Kicks sessionSyncEngine to push pendingSettle → server.
 *
 * If no open session found → no-op (not an error — order may have been created without opening a session).
 */
export async function settleLocalSession(tableId: string): Promise<void> {
  const session = await db.tableSessions
    .filter((s) => s.tableId === tableId && s.status === 'open')
    .first()

  if (!session) return

  await db.tableSessions.update(session.id, {
    status: 'settled',
    syncStatus: 'pendingSettle',
  })

  sessionSyncEngine.kick()
}
