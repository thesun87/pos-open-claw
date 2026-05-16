import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { RevenueByDayChart } from './revenue-by-day-chart'
import { buildRevenueChartAriaLabel, formatCompactVndAxis } from './revenue-by-day-chart.utils'

const rows = [
  { date: '2026-05-01', revenue: 100000, orderCount: 5 },
  { date: '2026-05-02', revenue: 0, orderCount: 0 },
]

describe('RevenueByDayChart', () => {
  it('renders accessible chart wrapper with range aria-label', () => {
    render(<RevenueByDayChart data={rows} from="2026-05-01" to="2026-05-02" />)
    expect(screen.getByRole('img', { name: 'Biểu đồ doanh thu 2 ngày từ 01/05 đến 02/05' })).toBeInTheDocument()
  })

  it('formats compact axis and aria label helpers', () => {
    expect(formatCompactVndAxis(100000)).toBe('100K')
    expect(formatCompactVndAxis(1500000)).toBe('1,5M')
    expect(buildRevenueChartAriaLabel('2026-05-01', '2026-05-07', 7)).toBe('Biểu đồ doanh thu 7 ngày từ 01/05 đến 07/05')
  })

  it('shows fallback table including zero revenue days', async () => {
    render(<RevenueByDayChart data={rows} from="2026-05-01" to="2026-05-02" />)
    await userEvent.click(screen.getByRole('button', { name: 'Xem dạng bảng' }))

    expect(screen.getByText('01/05/2026')).toBeInTheDocument()
    expect(screen.getByText('100.000 ₫')).toBeInTheDocument()
    expect(screen.getByText('5 đơn')).toBeInTheDocument()
    expect(screen.getByText('02/05/2026')).toBeInTheDocument()
    expect(screen.getByText('0 ₫')).toBeInTheDocument()
    expect(screen.getByText('0 đơn')).toBeInTheDocument()
  })

  it('renders a single-day range without crashing', () => {
    render(<RevenueByDayChart data={[rows[0]!]} from="2026-05-01" to="2026-05-01" />)
    expect(screen.getByRole('img', { name: 'Biểu đồ doanh thu 1 ngày từ 01/05 đến 01/05' })).toBeInTheDocument()
  })

  it('shows background updating indicator without hiding data', () => {
    render(<RevenueByDayChart data={rows} from="2026-05-01" to="2026-05-02" isUpdating />)
    expect(screen.getByText('Đang cập nhật')).toBeInTheDocument()
    expect(screen.getByRole('img')).toBeInTheDocument()
  })
})
