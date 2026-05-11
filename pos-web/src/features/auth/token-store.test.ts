import 'fake-indexeddb/auto'
import { describe, expect, it, beforeEach } from 'vitest'
import { db } from '../../db/dexie'
import { clearSession, decodeJwtExpiresAt, getCurrentSession, saveSession } from './token-store'

function token(exp: number) {
  return `x.${btoa(JSON.stringify({ exp })).replace(/=/g, '')}.y`
}

const user = { id: 'u1', email: 'admin@example.com', role: 'Admin', tenantId: 't1', storeId: 's1' }

beforeEach(async () => { await db.session.clear() })

describe('token store', () => {
  it('decodes JWT exp seconds to epoch milliseconds', () => {
    expect(decodeJwtExpiresAt(token(123))).toBe(123000)
  })

  it('saves, reads, and clears single current session without passwords', async () => {
    const saved = await saveSession(token(999), user, 100)
    expect(saved.id).toBe('current')
    expect(saved.userInfo.role).toBe('admin')
    expect(await getCurrentSession()).toMatchObject({ id: 'current', accessToken: token(999), expiresAt: 999000 })
    expect(JSON.stringify(await getCurrentSession())).not.toContain('password')
    await clearSession()
    expect(await getCurrentSession()).toBeUndefined()
  })
})
