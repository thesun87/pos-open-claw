import { formatDmyDisplay } from '../../../../shared/lib/date'

export function formatChartDate(ymd: string): string {
  return formatDmyDisplay(ymd).slice(0, 5)
}

export function formatCompactVndAxis(value: number): string {
  if (Math.abs(value) >= 1_000_000) {
    return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(value / 1_000_000)}M`
  }
  if (Math.abs(value) >= 1_000) {
    return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(value / 1_000)}K`
  }
  return new Intl.NumberFormat('vi-VN').format(value)
}

export function buildRevenueChartAriaLabel(from: string, to: string, dayCount: number): string {
  return `Biểu đồ doanh thu ${dayCount} ngày từ ${formatChartDate(from)} đến ${formatChartDate(to)}`
}
