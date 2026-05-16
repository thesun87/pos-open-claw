import '@testing-library/jest-dom/vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { TopProductsTable } from './top-products-table'

const products = [
  { productName: 'Bạc Xỉu', totalQuantity: 8, totalRevenue: 800000 },
  { productName: 'Cà Phê Sữa', totalQuantity: 8, totalRevenue: 900000 },
  { productName: 'Trà Đào', totalQuantity: 2, totalRevenue: 200000 },
  { productName: '<script>alert(1)</script>', totalQuantity: 1, totalRevenue: 100000 },
]

describe('TopProductsTable', () => {
  it('renders rows sorted by quantity desc with product name tie-breaker', () => {
    render(<TopProductsTable data={products} />)

    const rows = screen.getAllByRole('row')
    expect(within(rows.at(1)!).getByText('Bạc Xỉu')).toBeInTheDocument()
    expect(within(rows.at(2)!).getByText('Cà Phê Sữa')).toBeInTheDocument()
    expect(screen.getByText('<script>alert(1)</script>')).toBeInTheDocument()
  })

  it('toggles to revenue sort and back without mutating source array', async () => {
    const user = userEvent.setup()
    const source = structuredClone(products)
    render(<TopProductsTable data={source} />)

    await user.click(screen.getByRole('button', { name: 'Sắp xếp theo doanh thu' }))
    let rows = screen.getAllByRole('row')
    expect(within(rows.at(1)!).getByText('Cà Phê Sữa')).toBeInTheDocument()
    expect(within(rows.at(2)!).getByText('Bạc Xỉu')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Sắp xếp theo số lượng' }))
    rows = screen.getAllByRole('row')
    expect(within(rows.at(1)!).getByText('Bạc Xỉu')).toBeInTheDocument()
    expect(source.at(0)!.productName).toBe('Bạc Xỉu')
  })

  it('shows accessible Top 1-3 badges and keeps interactive controls labeled', () => {
    render(<TopProductsTable data={products} isUpdating />)
    expect(screen.getByLabelText('Top 1')).toBeInTheDocument()
    expect(screen.getByLabelText('Top 2')).toBeInTheDocument()
    expect(screen.getByLabelText('Top 3')).toBeInTheDocument()
    expect(screen.getByText('Đang cập nhật')).toHaveAttribute('aria-live', 'polite')
    expect(screen.getByRole('button', { name: 'Sắp xếp theo doanh thu' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('clamps to 10 rows max', () => {
    const many = Array.from({ length: 12 }, (_, index) => ({
      productName: `SP ${index + 1}`,
      totalQuantity: 12 - index,
      totalRevenue: 1000 * (12 - index),
    }))
    render(<TopProductsTable data={many} />)
    expect(screen.getAllByRole('row')).toHaveLength(11)
  })
})
