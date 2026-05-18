import { useEffect } from 'react'
import { registerSyncTriggers } from './features/sync/triggers'
import { installMenuSyncTriggers } from './features/menu/triggers'
import { useSessionStore } from './features/auth/session-store'

export function SyncTriggerRegistrar(): null {
  useEffect(() => {
    const isAuthenticated = () => useSessionStore.getState().isAuthenticated
    const cleanupOrderSync = registerSyncTriggers()
    const cleanupMenuSync = installMenuSyncTriggers({ isAuthenticated })
    return () => {
      cleanupOrderSync()
      cleanupMenuSync()
    }
  }, [])
  return null
}
