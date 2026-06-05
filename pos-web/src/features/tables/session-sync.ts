/**
 * Session Sync Engine — Story 6.8 Tier A
 *
 * Mirrors features/sync/engine.ts pattern (drain loop, sequential, retryable vs non-retryable).
 *
 * Two-pass drain:
 *   Pass 1 (open): pendingOpen records → POST /tables/:tableId/sessions → save serverSessionId, syncStatus='synced'
 *   Pass 2 (settle): pendingSettle records WITH serverSessionId → POST /tables/sessions/:id/settle → syncStatus='settled'
 *
 * Thứ tự open→settle: settle requires serverSessionId (AC27). If pendingSettle has no serverSessionId yet
 * (open not yet synced) → skip settle in this pass; retry next kick.
 *
 * Sequential per record; never parallel (project-context §5.D).
 * Gates on isOnline — never fires when offline.
 *
 * Boundary §8: only imports from db/, shared/, features/tables/session-api.ts.
 */
import axios from 'axios'
import { db } from '../../db/dexie'
import { useConnectivityStore } from '../../shared/stores/connectivity.store'
import { openTableSession, settleTableSession } from './session-api'

function isNonRetryableClientError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false
  const status = error.response?.status
  return (
    typeof status === 'number' &&
    status >= 400 &&
    status < 500 &&
    status !== 401 &&
    status !== 403 &&
    status !== 429
  )
}

class SessionSyncEngine {
  private running = false

  kick(): void {
    if (this.running) return
    void this.drainSessions()
  }

  async drainSessions(): Promise<void> {
    if (this.running) return
    if (!useConnectivityStore.getState().isOnline) return

    this.running = true
    try {
      // Pass 1: open pending sessions
      const allPending = await db.tableSessions.toArray()
      const pendingOpen = allPending.filter((s) => s.syncStatus === 'pendingOpen')

      for (const session of pendingOpen) {
        if (!useConnectivityStore.getState().isOnline) break
        try {
          const result = await openTableSession({
            tableId: session.tableId,
            clientSessionId: session.clientSessionId,
            openedByDevice: session.openedByDevice ?? 'POS01',
            openedAt: session.openedAt ?? new Date().toISOString(),
          })
          await db.tableSessions.update(session.id, {
            serverSessionId: result.id,
            syncStatus: 'synced',
          })
        } catch (error) {
          if (isNonRetryableClientError(error)) {
            await db.tableSessions.update(session.id, { syncStatus: 'syncFailed' })
            console.warn('[session-sync] open failed (non-retryable)', {
              clientSessionId: session.clientSessionId,
              tableId: session.tableId,
            })
          }
          // Retryable errors: keep pendingOpen, retry on next kick
        }
      }

      // Pass 2: settle sessions — requires serverSessionId (from Pass 1 or prior sync)
      const afterOpen = await db.tableSessions.toArray()
      const pendingSettle = afterOpen.filter((s) => s.syncStatus === 'pendingSettle')

      for (const session of pendingSettle) {
        if (!useConnectivityStore.getState().isOnline) break

        if (!session.serverSessionId) {
          // open not yet synced — skip; retry settle next kick after open succeeds
          continue
        }

        try {
          await settleTableSession(session.serverSessionId)
          await db.tableSessions.update(session.id, { syncStatus: 'settled' })
        } catch (error) {
          if (isNonRetryableClientError(error)) {
            await db.tableSessions.update(session.id, { syncStatus: 'syncFailed' })
            console.warn('[session-sync] settle failed (non-retryable)', {
              serverSessionId: session.serverSessionId,
              tableId: session.tableId,
            })
          }
          // Retryable: keep pendingSettle, retry on next kick
        }
      }
    } finally {
      this.running = false
    }
  }
}

export const sessionSyncEngine = new SessionSyncEngine()

/**
 * Register 'online' and 'visibilitychange' event listeners to kick session sync on connectivity restore.
 * Mirror of installTableConfigOnlineRecovery. Returns a cleanup function.
 */
export function installSessionSyncOnlineRecovery(options: { isAuthenticated?: () => boolean } = {}): () => void {
  const isAuthenticated = options.isAuthenticated ?? (() => true)

  const onOnline = () => {
    if (isAuthenticated()) sessionSyncEngine.kick()
  }

  const onVisible = () => {
    if (document.visibilityState === 'visible' && navigator.onLine && isAuthenticated()) {
      sessionSyncEngine.kick()
    }
  }

  window.addEventListener('online', onOnline)
  document.addEventListener('visibilitychange', onVisible)

  return () => {
    window.removeEventListener('online', onOnline)
    document.removeEventListener('visibilitychange', onVisible)
  }
}
