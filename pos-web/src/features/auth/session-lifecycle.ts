import { AUTH_EXPIRED_MESSAGE, AUTH_OFFLINE_EXPIRED_MESSAGE } from '../../shared/i18n/messages'
import type { SessionRecord, UserRole } from './token-store-types'

export const SESSION_REFRESH_THRESHOLD_MS = 24 * 60 * 60 * 1000

export type RouteDecision = '/admin' | '/pos' | '/login'

export function getRoleRoute(role: UserRole | string | undefined): RouteDecision {
  if (role === 'admin') return '/admin'
  if (role === 'cashier') return '/pos'
  return '/login'
}

export function isExpired(expiresAt: number, now: number): boolean {
  return expiresAt <= now
}

export function shouldRefreshSoon(expiresAt: number, now: number, thresholdMs = SESSION_REFRESH_THRESHOLD_MS): boolean {
  return expiresAt > now && expiresAt - now < thresholdMs
}

export type RestoreSessionResult =
  | { status: 'empty' }
  | { status: 'restored'; session: SessionRecord; route: RouteDecision; shouldRefresh: boolean }
  | { status: 'expired'; message: string }

export async function restoreSessionOnBoot(deps: {
  getCurrentSession: () => Promise<SessionRecord | undefined>
  isOnline: () => boolean
  now: () => number
}): Promise<RestoreSessionResult> {
  const session = await deps.getCurrentSession()
  if (!session) return { status: 'empty' }
  if (isExpired(session.expiresAt, deps.now())) {
    return { status: 'expired', message: deps.isOnline() ? AUTH_EXPIRED_MESSAGE : AUTH_OFFLINE_EXPIRED_MESSAGE }
  }
  return {
    status: 'restored',
    session,
    route: getRoleRoute(session.userInfo.role),
    shouldRefresh: deps.isOnline() && shouldRefreshSoon(session.expiresAt, deps.now()),
  }
}

export async function expireSession(deps: {
  clearSession: () => Promise<void>
  clearSessionState: (message?: string) => void
  message: string
}): Promise<void> {
  await deps.clearSession()
  deps.clearSessionState(deps.message)
}
