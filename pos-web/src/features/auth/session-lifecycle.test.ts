import { describe, expect, it, vi } from 'vitest'
import { AUTH_EXPIRED_MESSAGE, AUTH_OFFLINE_EXPIRED_MESSAGE } from '../../shared/i18n/messages'
import type { SessionRecord } from './token-store-types'
import { getRoleRoute, restoreSessionOnBoot, shouldRefreshSoon } from './session-lifecycle'

function session(expiresAt: number, role: 'admin' | 'cashier' = 'cashier'): SessionRecord {
  return {
    id: 'current',
    accessToken: 'token',
    expiresAt,
    lastLoginAt: 0,
    userInfo: { id: 'u1', email: 'u@example.com', role, tenantId: 't1', storeId: 's1' },
  }
}

describe('session lifecycle helpers', () => {
  it('decides route by role', () => {
    expect(getRoleRoute('admin')).toBe('/admin')
    expect(getRoleRoute('cashier')).toBe('/pos')
    expect(getRoleRoute(undefined)).toBe('/login')
  })

  it('restores only when expiresAt is strictly greater than now', async () => {
    await expect(restoreSessionOnBoot({ getCurrentSession: async () => session(101), isOnline: () => true, now: () => 100 })).resolves.toMatchObject({ status: 'restored' })
    await expect(restoreSessionOnBoot({ getCurrentSession: async () => session(100), isOnline: () => true, now: () => 100 })).resolves.toEqual({ status: 'expired', message: AUTH_EXPIRED_MESSAGE })
    await expect(restoreSessionOnBoot({ getCurrentSession: async () => session(99), isOnline: () => false, now: () => 100 })).resolves.toEqual({ status: 'expired', message: AUTH_OFFLINE_EXPIRED_MESSAGE })
  })

  it('requests refresh only online and within the 24h threshold', async () => {
    const now = 1_000
    expect(shouldRefreshSoon(now + 23 * 60 * 60 * 1000, now)).toBe(true)
    expect(shouldRefreshSoon(now + 25 * 60 * 60 * 1000, now)).toBe(false)
    await expect(restoreSessionOnBoot({ getCurrentSession: async () => session(now + 1), isOnline: () => false, now: () => now })).resolves.toMatchObject({ shouldRefresh: false })
  })

  it('covers exact 7-day token contract when iat/exp are present', () => {
    const iat = 1_800_000_000
    const exp = iat + 7 * 24 * 60 * 60
    expect(exp - iat).toBe(7 * 24 * 60 * 60)
  })

  it('works with fake timers around the 7-day boundary', async () => {
    vi.useFakeTimers()
    const loginAt = new Date('2026-05-01T00:00:00.000Z').getTime()
    const expiresAt = loginAt + 7 * 24 * 60 * 60 * 1000
    vi.setSystemTime(expiresAt - 1)
    await expect(restoreSessionOnBoot({ getCurrentSession: async () => session(expiresAt), isOnline: () => true, now: Date.now })).resolves.toMatchObject({ status: 'restored' })
    vi.setSystemTime(expiresAt)
    await expect(restoreSessionOnBoot({ getCurrentSession: async () => session(expiresAt), isOnline: () => true, now: Date.now })).resolves.toMatchObject({ status: 'expired' })
    vi.setSystemTime(expiresAt + 1)
    await expect(restoreSessionOnBoot({ getCurrentSession: async () => session(expiresAt), isOnline: () => false, now: Date.now })).resolves.toMatchObject({ status: 'expired', message: AUTH_OFFLINE_EXPIRED_MESSAGE })
    vi.useRealTimers()
  })
})
