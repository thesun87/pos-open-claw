import { useEffect } from 'react'
import { registerSyncTriggers } from './features/sync/triggers'

export function SyncTriggerRegistrar(): null {
  useEffect(() => registerSyncTriggers(), [])
  return null
}
