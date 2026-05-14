import { syncEngine } from './engine'

export interface KickableSyncEngine {
  kick(): void
}

export function registerSyncTriggers(engine: KickableSyncEngine = syncEngine): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return () => undefined
  }

  const kickWhenOnline = () => engine.kick()
  const kickWhenVisibleAndOnline = () => {
    if (document.visibilityState === 'visible' && window.navigator.onLine) {
      engine.kick()
    }
  }
  const intervalId = window.setInterval(() => {
    if (window.navigator.onLine) {
      engine.kick()
    }
  }, 60_000)

  window.addEventListener('online', kickWhenOnline)
  document.addEventListener('visibilitychange', kickWhenVisibleAndOnline)

  return () => {
    window.removeEventListener('online', kickWhenOnline)
    document.removeEventListener('visibilitychange', kickWhenVisibleAndOnline)
    window.clearInterval(intervalId)
  }
}
