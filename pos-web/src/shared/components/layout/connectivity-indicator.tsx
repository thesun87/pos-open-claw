import { useEffect, useState } from 'react'
import { STATUS_OFFLINE, STATUS_ONLINE, STATUS_SYNCED, STATUS_SYNCING } from '../../i18n/messages'
import { cn } from '../../lib/cn'
import { useConnectivityStore } from '../../stores/connectivity.store'

const RECENT_SYNC_MS = 3_000

export function ConnectivityIndicator() {
  const isOnline = useConnectivityStore((state) => state.isOnline)
  const syncState = useConnectivityStore((state) => state.syncState)
  const lastSyncedAt = useConnectivityStore((state) => state.lastSyncedAt)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!lastSyncedAt) return
    const timeoutId = setTimeout(() => setNow(Date.now()), RECENT_SYNC_MS)
    return () => clearTimeout(timeoutId)
  }, [lastSyncedAt])

  const isRecentSync = Boolean(lastSyncedAt && now - lastSyncedAt.getTime() < RECENT_SYNC_MS)
  const text = syncState === 'running' ? STATUS_SYNCING : isRecentSync ? STATUS_SYNCED : isOnline ? STATUS_ONLINE : STATUS_OFFLINE
  const tone = syncState === 'running' ? 'border-primary/30 bg-primary/10 text-primary' : isRecentSync || isOnline ? 'border-success/30 bg-success/10 text-success' : 'border-amber-300 bg-amber-50 text-amber-800'

  return (
    <span aria-label={`Trạng thái kết nối: ${text}`} className={cn('inline-flex max-w-full items-center gap-2 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold sm:text-sm', tone)}>
      <span aria-hidden="true" className={cn('h-2 w-2 rounded-full', syncState === 'running' ? 'animate-pulse bg-primary' : isRecentSync || isOnline ? 'bg-success' : 'bg-amber-500')} />
      <span>{text}</span>
    </span>
  )
}
