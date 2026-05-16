import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fetchReportsAll, reportsQueryKey } from './api'
import { apiClient } from '../../../shared/lib/api-client'

vi.mock('../../../shared/lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
  },
}))

const mockApiGet = vi.mocked(apiClient.get)

describe('reportsQueryKey', () => {
  it('returns tuple with from and to', () => {
    expect(reportsQueryKey('2026-05-01', '2026-05-07')).toEqual(['reports', '2026-05-01', '2026-05-07'])
  })
})

describe('fetchReportsAll', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls apiClient.get with correct URL and params', async () => {
    const mockResponse = {
      data: {
        revenueByDay: [],
        totals: { totalOrders: 0, totalRevenue: 0 },
        revenueByPaymentMethod: [],
        topProducts: [],
      },
    }
    mockApiGet.mockResolvedValueOnce(mockResponse)

    const result = await fetchReportsAll({ from: '2026-05-01', to: '2026-05-07' })

    expect(mockApiGet).toHaveBeenCalledWith('/reports', {
      params: { from: '2026-05-01', to: '2026-05-07', metric: 'all' },
    })
    expect(result).toEqual(mockResponse.data)
  })

  it('propagates errors from apiClient', async () => {
    const error = new Error('Network error')
    mockApiGet.mockRejectedValueOnce(error)

    await expect(fetchReportsAll({ from: '2026-05-01', to: '2026-05-07' })).rejects.toThrow('Network error')
  })
})
