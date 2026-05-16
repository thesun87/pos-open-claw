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
        <p className="text-xs font-medium text-primary" aria-live="polite">
          Đang cập nhật
        </p>
      ) : null}
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <article className="rounded-lg border border-border bg-surface-muted p-4">
          <p className="text-sm font-medium text-text-secondary">Tổng số đơn</p>
          <p className="mt-2 text-3xl font-bold leading-tight text-text-primary">
            {orderFormatter.format(totals.totalOrders)}
          </p>
          <p className="mt-2 text-xs text-text-secondary">{rangeText}</p>
        </article>

        <article className="rounded-lg border border-border bg-surface-muted p-4">
          <p className="text-sm font-medium text-text-secondary">Tổng doanh thu</p>
          <p className="mt-2 text-3xl font-bold leading-tight text-text-primary">
            {formatVnd(totals.totalRevenue)}
          </p>
          <p className="mt-2 text-xs text-text-secondary">{rangeText}</p>
        </article>
      </div>
    </div>
  )
}
