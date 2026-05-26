import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { TableDto } from '../api'
import { TableCard } from './table-card'

const baseTable: TableDto = {
  id: 'tbl-1',
  areaId: 'area-1',
  name: 'Bàn 1',
  capacity: 4,
  sortOrder: 10,
  isActive: true,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

describe('TableCard', () => {
  it('renders empty table enabled with correct aria-label', () => {
    render(<TableCard table={baseTable} status="empty" onSelect={vi.fn()} />)
    const btn = screen.getByRole('button', { name: 'Bàn Bàn 1, 4 chỗ, Trống' })
    expect(btn).toBeInTheDocument()
    expect(btn).not.toBeDisabled()
    expect(btn).not.toHaveAttribute('aria-disabled')
  })

  it('renders occupied table disabled', () => {
    render(<TableCard table={baseTable} status="occupied" onSelect={vi.fn()} />)
    const btn = screen.getByRole('button', { name: 'Bàn Bàn 1, 4 chỗ, Đang phục vụ' })
    expect(btn).toBeDisabled()
    expect(btn).toHaveAttribute('aria-disabled', 'true')
  })

  it('renders pending_sync table disabled', () => {
    render(<TableCard table={baseTable} status="pending_sync" onSelect={vi.fn()} />)
    const btn = screen.getByRole('button', { name: 'Bàn Bàn 1, 4 chỗ, Chờ đồng bộ' })
    expect(btn).toBeDisabled()
    expect(btn).toHaveAttribute('aria-disabled', 'true')
  })

  it('renders inactive table disabled', () => {
    render(<TableCard table={baseTable} status="inactive" onSelect={vi.fn()} />)
    const btn = screen.getByRole('button', { name: 'Bàn Bàn 1, 4 chỗ, Tạm tắt' })
    expect(btn).toBeDisabled()
    expect(btn).toHaveAttribute('aria-disabled', 'true')
  })

  it('calls onSelect when empty table is clicked', async () => {
    const onSelect = vi.fn()
    const user = userEvent.setup()
    render(<TableCard table={baseTable} status="empty" onSelect={onSelect} />)
    await user.click(screen.getByRole('button', { name: 'Bàn Bàn 1, 4 chỗ, Trống' }))
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect).toHaveBeenCalledWith(baseTable)
  })

  it('does NOT call onSelect when occupied table is clicked', async () => {
    const onSelect = vi.fn()
    const user = userEvent.setup()
    render(<TableCard table={baseTable} status="occupied" onSelect={onSelect} />)
    // Disabled button won't fire click
    await user.click(screen.getByRole('button', { name: 'Bàn Bàn 1, 4 chỗ, Đang phục vụ' }))
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('has minimum height class for touch target ≥56px', () => {
    render(<TableCard table={baseTable} status="empty" onSelect={vi.fn()} />)
    const btn = screen.getByRole('button', { name: 'Bàn Bàn 1, 4 chỗ, Trống' })
    // Verify the button has min-h-[88px] class which guarantees ≥56px touch target
    expect(btn.className).toContain('min-h-[88px]')
  })

  it('displays table name and capacity', () => {
    render(<TableCard table={baseTable} status="empty" onSelect={vi.fn()} />)
    expect(screen.getByText('Bàn 1')).toBeInTheDocument()
    expect(screen.getByText('4 chỗ')).toBeInTheDocument()
  })

  it('shows StatusBadge text for each status', () => {
    const { rerender } = render(<TableCard table={baseTable} status="empty" onSelect={vi.fn()} />)
    expect(screen.getByText('Trống')).toBeInTheDocument()

    rerender(<TableCard table={baseTable} status="occupied" onSelect={vi.fn()} />)
    expect(screen.getByText('Đang phục vụ')).toBeInTheDocument()

    rerender(<TableCard table={baseTable} status="pending_sync" onSelect={vi.fn()} />)
    expect(screen.getByText('Chờ đồng bộ')).toBeInTheDocument()

    rerender(<TableCard table={baseTable} status="inactive" onSelect={vi.fn()} />)
    expect(screen.getByText('Tạm tắt')).toBeInTheDocument()
  })
})
