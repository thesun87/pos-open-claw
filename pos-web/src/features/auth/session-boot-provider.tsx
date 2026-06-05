import * as React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AUTH_EXPIRED_MESSAGE } from '../../shared/i18n/messages'
import { BootStatusContext, type BootStatus } from './session-boot-context'
import { useSessionStore } from './session-store'
import { clearSession, getCurrentSession, saveRefreshedAccessToken } from './token-store'
import { refresh } from './api'
import { expireSession, getRoleRoute, restoreSessionOnBoot, shouldRefreshSoon } from './session-lifecycle'
import { installMenuOnlineRecovery, triggerMenuPull } from '../menu/sync'
import { installTableConfigOnlineRecovery, triggerTableConfigPull } from '../tables/cache'
import { installSessionSyncOnlineRecovery, sessionSyncEngine } from '../tables/session-sync'


let refreshInFlight: Promise<void> | null = null

async function refreshBestEffort(setSessionFromRecord: ReturnType<typeof useSessionStore.getState>['setSessionFromRecord']) {
  if (refreshInFlight) return refreshInFlight
  refreshInFlight = (async () => {
    try {
      const response = await refresh()
      const updated = await saveRefreshedAccessToken(response.accessToken)
      if (updated) setSessionFromRecord(updated)
    } catch {
      // Best-effort only: keep valid sessions usable and let interceptor handle future 401s.
    } finally {
      refreshInFlight = null
    }
  })()
  return refreshInFlight
}

export function SessionBootProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const locationRef = React.useRef(location)
  React.useEffect(() => { locationRef.current = location })
  const setSessionFromRecord = useSessionStore((state) => state.setSessionFromRecord)
  const clearSessionState = useSessionStore((state) => state.clearSessionState)
  const currentUser = useSessionStore((state) => state.currentUser)
  const [bootStatus, setBootStatus] = React.useState<BootStatus>('loading')

  React.useEffect(() => {
    let cancelled = false
    async function boot() {
      const result = await restoreSessionOnBoot({
        getCurrentSession,
        isOnline: () => navigator.onLine,
        now: Date.now,
      })
      if (cancelled) return
      if (result.status === 'restored') {
        setSessionFromRecord(result.session)
        if (location.pathname === '/' || location.pathname === '/login') {
          navigate(result.route, { replace: true })
        }
        void triggerMenuPull({ isAuthenticated: () => true })?.catch(() => {
          // Best-effort cache refresh: cached/offline POS shell must still boot.
        })
        void triggerTableConfigPull({ isAuthenticated: () => true })?.catch(() => {
          // Best-effort: table config cache refresh; offline boot must not be blocked.
        })
        if (result.shouldRefresh) void refreshBestEffort(setSessionFromRecord)
      } else if (result.status === 'expired') {
        await expireSession({ clearSession, clearSessionState, message: result.message })
        if (!cancelled && location.pathname !== '/login') navigate('/login', { replace: true })
      } else if (location.pathname !== '/login') {
        navigate('/login', { replace: true })
      }
      if (!cancelled) setBootStatus('ready')
    }
    void boot()
    return () => { cancelled = true }
    // boot exactly once per app mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  React.useEffect(() => {
    async function onVisible() {
      if (document.visibilityState !== 'visible' || !navigator.onLine) return
      const session = await getCurrentSession()
      if (session && shouldRefreshSoon(session.expiresAt, Date.now())) void refreshBestEffort(setSessionFromRecord)
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [setSessionFromRecord])

  React.useEffect(() => {
    const onExpired = async () => {
      await expireSession({ clearSession, clearSessionState, message: AUTH_EXPIRED_MESSAGE })
      if (locationRef.current.pathname !== '/login') navigate('/login', { replace: true })
    }
    window.addEventListener('auth.expired', onExpired)
    return () => window.removeEventListener('auth.expired', onExpired)
  }, [clearSessionState, navigate])

  React.useEffect(() => {
    if (bootStatus !== 'ready' || !currentUser) return
    const cleanupMenu = installMenuOnlineRecovery({ isAuthenticated: () => useSessionStore.getState().isAuthenticated })
    const cleanupTableConfig = installTableConfigOnlineRecovery({ isAuthenticated: () => useSessionStore.getState().isAuthenticated })
    // Story 6.8: kick pending session syncs on boot + wire online-resume
    sessionSyncEngine.kick()
    const cleanupSessionSync = installSessionSyncOnlineRecovery({ isAuthenticated: () => useSessionStore.getState().isAuthenticated })
    return () => { cleanupMenu(); cleanupTableConfig(); cleanupSessionSync() }
  }, [bootStatus, currentUser])

  React.useEffect(() => {
    if (bootStatus !== 'ready' || location.pathname !== '/' || !currentUser) return
    navigate(getRoleRoute(currentUser.role), { replace: true })
  }, [bootStatus, currentUser, location.pathname, navigate])

  return <BootStatusContext.Provider value={bootStatus}>{children}</BootStatusContext.Provider>
}

