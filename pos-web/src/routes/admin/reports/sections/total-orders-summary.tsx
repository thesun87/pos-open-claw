import { ShoppingBag, WalletCards } from 'lucide-react'
import type { TotalsResult } from '../../../../features/admin/reports/api'
import { formatDmyDisplay } from '../../../../shared/lib/date'
import { formatVnd } from '../../../../shared/lib/format-vnd'

const orderFormatter = new Intl.NumberFormat('vi-VN')

type TotalOrdersSummaryProps = {
  totals: TotalsResult
  from: string
  to: string
  isUpdating?: boolean
}

export function TotalOrdersSummary({ totals, from, to, isUpdating = false }: TotalOrdersSummaryProps) {
  const rangeText = `Trong khoảng ${formatDmyDisplay(from)} - ${formatDmyDisplay(to)}`

  return (
    <div className="space-y-3">
      {isUpdating ? (
        <p className="text-xs font-medium text-admin-brand-600" aria-live="polite">
          Đang cập nhật
        </p>
      ) : null}
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <article className="rounded-2xl border border-admin-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3"><span className="flex h-12 w-12 items-center justify-center rounded-xl bg-admin-brand-50 text-admin-brand-500"><ShoppingBag size={22} /></span><p className="text-sm font-medium text-admin-gray-500">Tổng số đơn</p></div>
          <p className="mt-3 text-title-sm font-bold text-admin-gray-800">
            {orderFormatter.format(totals.totalOrders)}
          </p>
          <p className="mt-2 text-xs text-admin-gray-500">{rangeText}</p>
        </article>

        <article className="rounded-2xl border border-admin-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3"><span className="flex h-12 w-12 items-center justify-center rounded-xl bg-admin-brand-50 text-admin-brand-500"><WalletCards size={22} /></span><p className="text-sm font-medium text-admin-gray-500">Tổng doanh thu</p></div>
          <p className="mt-3 text-title-sm font-bold text-admin-gray-800">
            {formatVnd(totals.totalRevenue)}
          </p>
          <p className="mt-2 text-xs text-admin-gray-500">{rangeText}</p>
        </article>
      </div>
    </div>
  )
}
