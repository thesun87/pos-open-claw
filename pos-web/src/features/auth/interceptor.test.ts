import axios from 'axios'
import { describe, expect, it, vi } from 'vitest'
import { installAuthInterceptor } from './interceptor'
import type { SessionRecord } from './token-store-types'

function makeClient(status = 200, data: unknown = { ok: true }) {
  const calls: string[] = []
  const client = axios.create()
  client.defaults.adapter = async (config) => {
    calls.push(`${config.method}:${config.url}:${config.headers.Authorization ?? ''}:${config.headers['X-CSRF-Token'] ?? ''}`)
    if (status >= 400) throw new axios.AxiosError('fail', undefined, config, undefined, { status, statusText: 'fail', headers: {}, config, data })
    return { status, statusText: 'ok', headers: {}, config, data }
  }
  return { client, calls }
}

const validSession: SessionRecord = { id: 'current', accessToken: 'old-token', expiresAt: 2000, userInfo: { id: 'u', email: 'e@x.com', role: 'cashier', tenantId: 't', storeId: 's' }, lastLoginAt: 1 }

describe('auth interceptor', () => {
  it('attaches bearer for valid session', async () => {
    const { client, calls } = makeClient()
    installAuthInterceptor(client, { getCurrentSession: async () => validSession, clearSession: vi.fn(), saveRefreshedAccessToken: vi.fn(), now: () => 1000, locationAssign: vi.fn() })
    await client.get('/orders')
    expect(calls[0]).toContain('Bearer old-token')
  })

  it('expires before sending protected request', async () => {
    const { client, calls } = makeClient()
    const clearSession = vi.fn().mockResolvedValue(undefined)
    const assign = vi.fn()
    installAuthInterceptor(client, { getCurrentSession: async () => validSession, clearSession, saveRefreshedAccessToken: vi.fn(), now: () => 3000, locationAssign: assign })
    await expect(client.get('/orders')).rejects.toThrow()
    expect(calls).toHaveLength(0)
    expect(clearSession).toHaveBeenCalled()
    expect(assign).toHaveBeenCalledWith('/login')
  })

  it('refreshes once on 401 and retries original request', async () => {
    let firstOrders = true
    const client = axios.create()
    const calls: string[] = []
    client.defaults.adapter = async (config) => {
      calls.push(`${config.method}:${config.url}:${config.headers.Authorization ?? ''}:${config.headers['X-CSRF-Token'] ?? ''}`)
      if (config.url === '/orders' && firstOrders) {
        firstOrders = false
        throw new axios.AxiosError('unauthorized', undefined, config, undefined, { status: 401, statusText: 'no', headers: {}, config, data: {} })
      }
      if (config.url === '/auth/refresh') return { status: 200, statusText: 'ok', headers: {}, config, data: { accessToken: 'new-token' } }
      return { status: 200, statusText: 'ok', headers: {}, config, data: { ok: true } }
    }
    Object.defineProperty(document, 'cookie', { value: 'csrf_token=csrf123', configurable: true })
    installAuthInterceptor(client, { getCurrentSession: async () => validSession, clearSession: vi.fn(), saveRefreshedAccessToken: vi.fn().mockResolvedValue({ ...validSession, accessToken: 'new-token' }), now: () => 1000, locationAssign: vi.fn() })
    await client.get('/orders')
    expect(calls).toEqual(['get:/orders:Bearer old-token:', 'post:/auth/refresh::csrf123', 'get:/orders:Bearer new-token:'])
  })

  it('preserves valid session on network error', async () => {
    const client = axios.create()
    client.defaults.adapter = async (config) => { throw new axios.AxiosError('network', undefined, config) }
    const clearSession = vi.fn()
    installAuthInterceptor(client, { getCurrentSession: async () => validSession, clearSession, saveRefreshedAccessToken: vi.fn(), now: () => 1000, locationAssign: vi.fn() })
    await expect(client.get('/orders')).rejects.toThrow('network')
    expect(clearSession).not.toHaveBeenCalled()
  })
})
