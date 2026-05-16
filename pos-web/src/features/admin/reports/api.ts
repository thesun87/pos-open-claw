import { apiClient } from '../../../shared/lib/api-client'

// ─── Response Types ─────────────────────────────────────────────────────────
// These types match 100% with BE ReportsResponse interface in
// pos-api/src/reports/reports.service.ts

export type RevenueByDayRow = {
  date: string
  revenue: number
  orderCount: number
}

export type TotalsResult = {
  totalOrders: number
  totalRevenue: number
}

export type RevenueByPaymentMethodRow = {
  paymentMethod: 'cash' | 'transfer' | 'card'
  revenue: number
  orderCount: number
}

export type TopProductRow = {
  productName: string
  totalQuantity: number
  totalRevenue: number
}

export type ReportsAllResponse = {
  revenueByDay: RevenueByDayRow[]
  totals: TotalsResult
  revenueByPaymentMethod: RevenueByPaymentMethodRow[]
  topProducts: TopProductRow[]
}

// ─── Query Key ───────────────────────────────────────────────────────────────
export const reportsQueryKey = (from: string, to: string) =>
  ['reports', from, to] as const

// ─── Fetch Function ──────────────────────────────────────────────────────────
export async function fetchReportsAll({
  from,
  to,
}: {
  from: string
  to: string
}): Promise<ReportsAllResponse> {
  const response = await apiClient.get<ReportsAllResponse>('/reports', {
    params: { from, to, metric: 'all' },
  })
  return response.data
}
