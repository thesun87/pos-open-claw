import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '../../shared/lib/api-client'
import { openTableSession, settleTableSession } from './session-api'

vi.mock('../../shared/lib/api-client', () => ({ apiClient: { post: vi.fn() } }))

const serverSession = {
  id: 'server-session-1',
  tableId: 'table-1',
  status: 'open' as const,
  openedByDevice: 'POS01',
  openedAt: '2026-06-04T08:00:00.000Z',
  clientSessionId: 'client-session-1',
  createdAt: '2026-06-04T08:00:00.000Z',
  updatedAt: '2026-06-04T08:00:00.000Z',
}

beforeEach(() => {
  vi.mocked(apiClient.post).mockReset()
})

describe('openTableSession', () => {
  it('POSTs to /tables/:tableId/sessions mapping openedByDevice → deviceId (BE OpenSessionDto)', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: serverSession })

    await openTableSession({
      tableId: 'table-1',
      clientSessionId: 'client-session-1',
      openedByDevice: 'POS01',
      openedAt: '2026-06-04T08:00:00.000Z',
    })

    const [url, body] = vi.mocked(apiClient.post).mock.calls[0] as [string, Record<string, unknown>]
    expect(url).toBe('/tables/table-1/sessions')
    expect(body).toEqual({
      clientSessionId: 'client-session-1',
      deviceId: 'POS01',
      openedAt: '2026-06-04T08:00:00.000Z',
    })
    // Regression guard: the legacy `openedByDevice` request field is whitelisted-out by BE
    // (ValidationPipe forbidNonWhitelisted) and must never reappear in the body.
    expect(body).not.toHaveProperty('openedByDevice')
  })

  it('returns the server session DTO', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: serverSession })

    const result = await openTableSession({
      tableId: 'table-1',
      clientSessionId: 'client-session-1',
      openedByDevice: 'POS01',
      openedAt: '2026-06-04T08:00:00.000Z',
    })

    expect(result).toEqual(serverSession)
  })
})

describe('settleTableSession', () => {
  it('POSTs to /tables/sessions/:serverSessionId/settle with no body', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { ...serverSession, status: 'settled' } })

    await settleTableSession('server-session-1')

    expect(apiClient.post).toHaveBeenCalledWith('/tables/sessions/server-session-1/settle')
    // No second arg → no request body sent.
    expect(vi.mocked(apiClient.post).mock.calls[0]).toHaveLength(1)
  })
})
