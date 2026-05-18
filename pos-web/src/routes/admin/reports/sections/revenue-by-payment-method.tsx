import { useMemo } from 'react'
import type { RevenueByPaymentMethodRow } from '../../../../features/admin/reports/api'
import { formatVnd } from '../../../../shared/lib/format-vnd'

const orderFormatter = new Intl.NumberFormat('vi-VN')
const percentFormatter = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 })

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Tiền mặt', barClassName: 'bg-admin-brand-500' },
  { value: 'transfer', label: 'Chuyển khoản', barClassName: 'bg-admin-success-500' },
  { value: 'card', label: 'Thẻ', barClassName: 'bg-admin-warning-500' },
] as const

type RevenueByPaymentMethodProps = {
  data: RevenueByPaymentMethodRow[]
  isUpdating?: boolean
}

function normalizeRows(data: RevenueByPaymentMethodRow[]) {
  return PAYMENT_METHODS.map((method) => {
    const row = data.find((item) => item.paymentMethod === method.value)
    return {
      ...method,
      revenue: row?.revenue ?? 0,
      orderCount: row?.orderCount ?? 0,
    }
  })
}

export function RevenueByPaymentMethod({ data, isUpdating = false }: RevenueByPaymentMethodProps) {
  const rows = useMemo(() => normalizeRows(data), [data])
  const totalRevenue = rows.reduce((sum, row) => sum + row.revenue, 0)

  return (
    <div className="space-y-3" aria-label="Doanh thu theo phương thức thanh toán">
      {isUpdating ? (
        <p className="text-xs font-medium text-admin-brand-600" aria-live="polite">
          Đang cập nhật
        </p>
      ) : null}

      <div className="space-y-3">
        {rows.map((row) => {
          const percentage = totalRevenue > 0 ? (row.revenue / totalRevenue) * 100 : 0
          const percentageText = `${percentFormatter.format(percentage)}%`

          return (
            <article key={row.value} className="rounded-xl border border-admin-gray-200 bg-admin-gray-25 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-admin-gray-800">{row.label}</h3>
                  <p className="text-xs text-admin-gray-500">
                    {orderFormatter.format(row.orderCount)} đơn
                    {row.orderCount === 0 ? ' · Chưa có đơn' : ''}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-admin-gray-800">{formatVnd(row.revenue)}</p>
                  <p className="text-xs text-admin-gray-500">{percentageText}</p>
                </div>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-admin-gray-100" aria-hidden="true">
                <div
                  className={`h-full rounded-full ${row.barClassName}`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}
