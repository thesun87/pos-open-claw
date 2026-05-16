import { useEffect } from 'react'
import { registerSyncTriggers } from './features/sync/triggers'
import { installMenuSyncTriggers } from './features/menu/triggers'

export function SyncTriggerRegistrar(): null {
  useEffect(() => {
    const cleanupOrderSync = registerSyncTriggers()
    const cleanupMenuSync = installMenuSyncTriggers()
    return () => {
      cleanupOrderSync()
      cleanupMenuSync()
    }
  }, [])
  return null
}
