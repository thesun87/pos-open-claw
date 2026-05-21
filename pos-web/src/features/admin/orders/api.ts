import { apiClient } from '../../../shared/lib/api-client'

export type AdminPaymentMethod = 'cash' | 'transfer' | 'card'

export type AdminOrdersFilters = {
  orderCode?: string
  from?: string
  to?: string
}

export type AdminOrderListItem = {
  id: string
  orderCode: string
  soldAt: string
  syncedAt: string
  cashierName?: string | null
  paymentMethod: AdminPaymentMethod
  discountAmount: number
  total: number
  itemLineCount: number
  itemQuantity: number
  isVoided: boolean
  voidedAt?: string | null
}

export type AdminOrderDetail = AdminOrderListItem & {
  clientOrderId: string
  deviceId: string
  menuVersionAtSale: number
  voids: Array<{ id: string; reason: string; voidedAt: string; voidedByName?: string | null }>
  items: Array<{
    id: string
    productNameSnapshot: string
    unitPriceSnapshot: number
    quantity: number
    note?: string | null
    lineTotal: number
    options: Array<{ id: string; labelSnapshot: string; priceDeltaSnapshot: number }>
  }>
}

export const adminOrdersQueryKey = (filters: AdminOrdersFilters = {}) => ['admin-orders', filters] as const
export const adminOrderDetailQueryKey = (id: string | null) => ['admin-order-detail', id] as const

export async function fetchAdminOrders(filters: AdminOrdersFilters = {}): Promise<AdminOrderListItem[]> {
  const params: Record<string, string> = {}
  if (filters.orderCode?.trim()) params.order_code = filters.orderCode.trim()
  if (filters.from) params.from = filters.from
  if (filters.to) params.to = filters.to
  const response = await apiClient.get<AdminOrderListItem[]>('/orders', { params })
  return response.data
}

export async function fetchAdminOrderDetail(id: string): Promise<AdminOrderDetail> {
  const response = await apiClient.get<AdminOrderDetail>(`/orders/${id}`)
  return response.data
}
