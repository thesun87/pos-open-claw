import { useMemo, useState } from 'react'
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { RevenueByDayRow } from '../../../../features/admin/reports/api'
import { formatDmyDisplay } from '../../../../shared/lib/date'
import { formatVnd } from '../../../../shared/lib/format-vnd'
import { buildRevenueChartAriaLabel, formatChartDate, formatCompactVndAxis } from './revenue-by-day-chart.utils'

const orderFormatter = new Intl.NumberFormat('vi-VN')

type RevenueByDayChartProps = {
  data: RevenueByDayRow[]
  from: string
  to: string
  isUpdating?: boolean
}

type RevenueTooltipProps = {
  active?: boolean
  payload?: Array<{ payload?: RevenueByDayRow }>
  label?: string | number
}

function RevenueTooltip({ active, payload, label }: RevenueTooltipProps) {
  if (!active || !payload?.length) return null

  const row = payload[0]?.payload as RevenueByDayRow | undefined
  if (!row) return null

  return (
    <div className="rounded-md border border-border bg-surface p-3 text-sm shadow-sm">
      <p className="font-medium text-text-primary">{formatDmyDisplay(String(label ?? row.date))}</p>
      <p className="text-text-secondary">Doanh thu: {formatVnd(row.revenue)}</p>
      <p className="text-text-secondary">Số đơn: {orderFormatter.format(row.orderCount)} đơn</p>
    </div>
  )
}

export function RevenueByDayChart({ data, from, to, isUpdating = false }: RevenueByDayChartProps) {
  const [showTable, setShowTable] = useState(false)
  const chartData = useMemo(() => data ?? [], [data])
  const ariaLabel = buildRevenueChartAriaLabel(from, to, chartData.length || 1)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        {isUpdating ? (
          <span className="text-xs font-medium text-primary" aria-live="polite">
            Đang cập nhật
          </span>
        ) : (
          <span className="text-xs text-text-secondary">Cập nhật theo khoảng ngày đã chọn</span>
        )}
        <button
          type="button"
          className="rounded-md border border-border px-3 py-1 text-xs font-medium text-text-primary hover:bg-surface-muted"
          onClick={() => setShowTable((current) => !current)}
          aria-expanded={showTable}
        >
          {showTable ? 'Ẩn dạng bảng' : 'Xem dạng bảng'}
        </button>
      </div>

      <div className="h-56 w-full md:h-64" role="img" aria-label={ariaLabel}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <XAxis dataKey="date" tickFormatter={formatChartDate} tickLine={false} axisLine={false} minTickGap={16} />
            <YAxis tickFormatter={formatCompactVndAxis} tickLine={false} axisLine={false} width={48} />
            <Tooltip content={<RevenueTooltip />} />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="var(--color-primary)"
              strokeWidth={2}
              dot={{ r: 3, fill: 'var(--color-primary)' }}
              activeDot={{ r: 5, fill: 'var(--color-primary)' }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {showTable ? (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Dữ liệu doanh thu theo ngày</caption>
            <thead className="bg-surface-muted text-text-secondary">
              <tr>
                <th className="px-3 py-2 font-medium">Ngày</th>
                <th className="px-3 py-2 font-medium">Doanh thu</th>
                <th className="px-3 py-2 font-medium">Số đơn</th>
              </tr>
            </thead>
            <tbody>
              {chartData.map((row) => (
                <tr key={row.date} className="border-t border-border">
                  <td className="px-3 py-2">{formatDmyDisplay(row.date)}</td>
                  <td className="px-3 py-2">{formatVnd(row.revenue)}</td>
                  <td className="px-3 py-2">{orderFormatter.format(row.orderCount)} đơn</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  )
}
