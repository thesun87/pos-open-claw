import { useEffect } from 'react'
import { apiClient } from '../lib/api-client'
import { useConnectivityStore } from '../stores/connectivity.store'

const HEALTH_INTERVAL_MS = 30_000

function hasBrowserConnectivityApis(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined' && typeof navigator !== 'undefined'
}

export function useConnectivity() {
  const setConnectivityState = useConnectivityStore((state) => state.setConnectivityState)

  useEffect(() => {
    if (!hasBrowserConnectivityApis()) return
    let isDisposed = false
    let intervalId: ReturnType<typeof setInterval> | undefined
    const update = (isOnline: boolean) => {
      if (!isDisposed) setConnectivityState({ isOnline, lastCheckedAt: new Date() })
    }
    const checkHealth = async () => {
      if (!navigator.onLine) return update(false)
      try { await apiClient.get('/health'); update(true) } catch { update(false) }
    }
    const onOnline = () => { void checkHealth() }
    const onOffline = () => update(false)
    const startInterval = () => {
      if (intervalId || document.visibilityState !== 'visible') return
      intervalId = setInterval(() => { void checkHealth() }, HEALTH_INTERVAL_MS)
    }
    const stopInterval = () => { if (intervalId) { clearInterval(intervalId); intervalId = undefined } }
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') { void checkHealth(); startInterval() } else stopInterval()
    }
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    document.addEventListener('visibilitychange', onVisibilityChange)
    void checkHealth(); startInterval()
    return () => {
      isDisposed = true; stopInterval()
      window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [setConnectivityState])

  const isOnline = useConnectivityStore((state) => state.isOnline)
  const lastCheckedAt = useConnectivityStore((state) => state.lastCheckedAt)
  return { isOnline, lastCheckedAt }
}
