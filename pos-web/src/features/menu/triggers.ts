import { checkAndPullIfNewer } from './sync'

let triggerInFlight: Promise<void> | null = null

export function triggerMenuCheck(options: {
  isOnline?: () => boolean
  isAuthenticated?: () => boolean
  check?: () => Promise<unknown>
} = {}): Promise<void> | null {
  const isOnline = options.isOnline ?? (() => navigator.onLine)
  const isAuthenticated = options.isAuthenticated ?? (() => true)
  const check = options.check ?? (() => checkAndPullIfNewer())
  if (!isOnline() || !isAuthenticated()) return null
  if (triggerInFlight) return triggerInFlight
  triggerInFlight = (async () => { try { await check() } finally { triggerInFlight = null } })()
  return triggerInFlight
}

export function installMenuSyncTriggers(options: {
  isOnline?: () => boolean
  isAuthenticated?: () => boolean
  isActive?: () => boolean
  check?: () => Promise<unknown>
  intervalMs?: number
  visibilityDebounceMs?: number
} = {}): () => void {
  const intervalMs = options.intervalMs ?? 5 * 60 * 1000
  const visibilityDebounceMs = options.visibilityDebounceMs ?? 5_000
  const isActive = options.isActive ?? (() => document.visibilityState === 'visible')
  let visibilityTimer: ReturnType<typeof setTimeout> | undefined
  const run = () => { void triggerMenuCheck(options)?.catch(() => undefined) }
  const runIfActive = () => { if (isActive()) run() }
  const onOnline = () => runIfActive()
  const onVisibility = () => {
    if (visibilityTimer) clearTimeout(visibilityTimer)
    visibilityTimer = setTimeout(() => { visibilityTimer = undefined; runIfActive() }, visibilityDebounceMs)
  }

  runIfActive()
  window.addEventListener('online', onOnline)
  document.addEventListener('visibilitychange', onVisibility)
  const interval = setInterval(runIfActive, intervalMs)

  return () => {
    window.removeEventListener('online', onOnline)
    document.removeEventListener('visibilitychange', onVisibility)
    clearInterval(interval)
    if (visibilityTimer) clearTimeout(visibilityTimer)
  }
}
