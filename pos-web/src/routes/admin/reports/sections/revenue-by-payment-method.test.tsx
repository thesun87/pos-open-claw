import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { RevenueByPaymentMethod } from './revenue-by-payment-method'

const paymentData = [
  { paymentMethod: 'transfer' as const, revenue: 100000, orderCount: 2 },
  { paymentMethod: 'cash' as const, revenue: 200000, orderCount: 4 },
  { paymentMethod: 'card' as const, revenue: 0, orderCount: 0 },
]

describe('RevenueByPaymentMethod', () => {
  it('renders Vietnamese labels in required method order', () => {
    render(<RevenueByPaymentMethod data={paymentData} />)
    const labels = screen.getAllByRole('heading', { level: 3 }).map((node) => node.textContent)
    expect(labels).toEqual(['Tiền mặt', 'Chuyển khoản', 'Thẻ'])
  })

  it('renders revenue, order count, percentages, and zero-order hint', () => {
    render(<RevenueByPaymentMethod data={paymentData} />)
    expect(screen.getByText('200.000 ₫')).toBeInTheDocument()
    expect(screen.getByText('4 đơn')).toBeInTheDocument()
    expect(screen.getByText('66,7%')).toBeInTheDocument()
    expect(screen.getByText('33,3%')).toBeInTheDocument()
    expect(screen.getByText('0 đơn · Chưa có đơn')).toBeInTheDocument()
    expect(screen.getByText('0%')).toBeInTheDocument()
  })

  it('shows 0% for all rows when total revenue is zero', () => {
    render(<RevenueByPaymentMethod data={paymentData.map((row) => ({ ...row, revenue: 0, orderCount: 0 }))} />)
    expect(screen.getAllByText('0%')).toHaveLength(3)
    expect(screen.getAllByText(/Chưa có đơn/)).toHaveLength(3)
  })

  it('fills missing payment methods with zero rows', () => {
    render(<RevenueByPaymentMethod data={[{ paymentMethod: 'cash', revenue: 50000, orderCount: 1 }]} />)
    expect(screen.getByText('Tiền mặt')).toBeInTheDocument()
    expect(screen.getByText('Chuyển khoản')).toBeInTheDocument()
    expect(screen.getByText('Thẻ')).toBeInTheDocument()
  })

  it('has an accessible section summary and updating indicator', () => {
    render(<RevenueByPaymentMethod data={paymentData} isUpdating />)
    expect(screen.getByLabelText('Doanh thu theo phương thức thanh toán')).toBeInTheDocument()
    const live = screen.getByText('Đang cập nhật')
    expect(live).toHaveAttribute('aria-live', 'polite')
  })
})
