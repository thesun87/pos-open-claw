import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TotalOrdersSummary } from './total-orders-summary'

describe('TotalOrdersSummary', () => {
  it('renders order and revenue stat cards with formatted values and range', () => {
    render(
      <TotalOrdersSummary
        totals={{ totalOrders: 1234, totalRevenue: 100000 }}
        from="2026-05-01"
        to="2026-05-07"
      />,
    )

    expect(screen.getByText('Tổng số đơn')).toBeInTheDocument()
    expect(screen.getByText('1.234')).toBeInTheDocument()
    expect(screen.getByText('Tổng doanh thu')).toBeInTheDocument()
    expect(screen.getByText('100.000 ₫')).toBeInTheDocument()
    expect(screen.getAllByText('Trong khoảng 01/05/2026 - 07/05/2026')).toHaveLength(2)
  })

  it('shows background updating indicator while keeping stat cards visible', () => {
    render(
      <TotalOrdersSummary
        totals={{ totalOrders: 1, totalRevenue: 50000 }}
        from="2026-05-01"
        to="2026-05-01"
        isUpdating
      />,
    )

    expect(screen.getByText('Đang cập nhật')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('50.000 ₫')).toBeInTheDocument()
  })
})
