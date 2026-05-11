import { jwtDecode } from 'jwt-decode'
import { db } from '../../db/dexie'
import type { AuthUser, BackendUser, SessionRecord, UserRole } from './token-store-types'

const SESSION_ID: SessionRecord['id'] = 'current'

type JwtPayload = { exp?: number }

export function normalizeRole(role: string): UserRole {
  const normalized = role.toLowerCase()
  if (normalized === 'admin' || normalized === 'cashier') return normalized
  throw new Error('Vai trò người dùng không được hỗ trợ.')
}

export function normalizeUser(user: BackendUser): AuthUser {
  return { ...user, role: normalizeRole(user.role) }
}

export function decodeJwtExpiresAt(accessToken: string): number {
  const payload = jwtDecode<JwtPayload>(accessToken)
  if (!payload.exp || !Number.isFinite(payload.exp)) throw new Error('Access token không có thời hạn hợp lệ.')
  return payload.exp * 1000
}

export async function saveSession(accessToken: string, user: BackendUser | AuthUser, now = Date.now()): Promise<SessionRecord> {
  const record: SessionRecord = {
    id: SESSION_ID,
    accessToken,
    expiresAt: decodeJwtExpiresAt(accessToken),
    userInfo: normalizeUser(user),
    lastLoginAt: now,
  }
  await db.session.put(record)
  return record
}

export async function saveRefreshedAccessToken(accessToken: string): Promise<SessionRecord | undefined> {
  const current = await getCurrentSession()
  if (!current) return undefined
  const updated: SessionRecord = { ...current, accessToken, expiresAt: decodeJwtExpiresAt(accessToken) }
  await db.session.put(updated)
  return updated
}

export function getCurrentSession(): Promise<SessionRecord | undefined> {
  return db.session.get(SESSION_ID)
}

export function clearSession(): Promise<void> {
  return db.session.delete(SESSION_ID)
}

export function isSessionValid(session: Pick<SessionRecord, 'expiresAt'> | undefined, now = Date.now()): boolean {
  return Boolean(session && session.expiresAt > now)
}
