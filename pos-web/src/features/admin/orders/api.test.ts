import { describe, expect, it, vi, beforeEach } from 'vitest'
import { apiClient } from '../../../shared/lib/api-client'
import { fetchAdminOrderDetail, fetchAdminOrders } from './api'

vi.mock('../../../shared/lib/api-client', () => ({ apiClient: { get: vi.fn() } }))
const mockGet = vi.mocked(apiClient.get)

describe('admin orders api', () => {
  beforeEach(() => mockGet.mockReset())

  it('builds list params with snake_case order_code and date range', async () => {
    mockGet.mockResolvedValue({ data: [] })
    await fetchAdminOrders({ orderCode: ' POS01 ', from: '2026-05-01', to: '2026-05-21' })
    expect(mockGet).toHaveBeenCalledWith('/orders', { params: { order_code: 'POS01', from: '2026-05-01', to: '2026-05-21' } })
  })

  it('fetches detail on demand by id', async () => {
    mockGet.mockResolvedValue({ data: { id: 'order-1' } })
    await expect(fetchAdminOrderDetail('order-1')).resolves.toEqual({ id: 'order-1' })
    expect(mockGet).toHaveBeenCalledWith('/orders/order-1')
  })
})
