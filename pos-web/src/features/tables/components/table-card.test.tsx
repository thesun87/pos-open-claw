/**
 * table-card.test.tsx — Updated for Story 6.12 to cover new status types.
 *
 * TableCard now accepts TableDisplayStatus (extended) instead of TableOccupancyStatus.
 * Key changes from 6.7:
 *  - 'occupied' label changed from "Đang phục vụ" → "Đã có đơn"
 *  - New 'serving' status → "Đang phục vụ" (disabled)
 *  - New 'conflict' status → "Xung đột phiên" (disabled + danger icon)
 */
import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TableCard } from './table-card'

/** Minimal table shape used by TableCard (Story 6.12: accepts TableRecord too) */
const baseTable = {
  id: 'tbl-1',
  name: 'Bàn 1',
  capacity: 4,
}

describe('TableCard', () => {
  // --- Core states ---

  it('renders empty table enabled with correct aria-label', () => {
    render(<TableCard table={baseTable} status="empty" onSelect={vi.fn()} />)
    const btn = screen.getByRole('button', { name: 'Bàn Bàn 1, 4 chỗ, Trống' })
    expect(btn).toBeInTheDocument()
    expect(btn).not.toBeDisabled()
    expect(btn).not.toHaveAttribute('aria-disabled')
  })

  it('renders serving table disabled with label "Đang phục vụ" (AC5)', () => {
    render(<TableCard table={baseTable} status="serving" onSelect={vi.fn()} />)
    const btn = screen.getByRole('button', { name: 'Bàn Bàn 1, 4 chỗ, Đang phục vụ' })
    expect(btn).toBeInTheDocument()
    expect(btn).toBeDisabled()
    expect(btn).toHaveAttribute('aria-disabled', 'true')
  })

  it('renders occupied table disabled with label "Đã có đơn" (AC5 — order-only, no open session)', () => {
    render(<TableCard table={baseTable} status="occupied" onSelect={vi.fn()} />)
    const btn = screen.getByRole('button', { name: 'Bàn Bàn 1, 4 chỗ, Đã có đơn' })
    expect(btn).toBeInTheDocument()
    expect(btn).toBeDisabled()
    expect(btn).toHaveAttribute('aria-disabled', 'true')
  })

  it('renders conflict table disabled with label "Xung đột phiên" (AC4)', () => {
    render(<TableCard table={baseTable} status="conflict" onSelect={vi.fn()} />)
    const btn = screen.getByRole('button', { name: 'Bàn Bàn 1, 4 chỗ, Xung đột phiên' })
    expect(btn).toBeInTheDocument()
    expect(btn).toBeDisabled()
    expect(btn).toHaveAttribute('aria-disabled', 'true')
  })

  it('renders pending_sync table disabled', () => {
    render(<TableCard table={baseTable} status="pending_sync" onSelect={vi.fn()} />)
    const btn = screen.getByRole('button', { name: 'Bàn Bàn 1, 4 chỗ, Chờ đồng bộ' })
    expect(btn).toBeInTheDocument()
    expect(btn).toBeDisabled()
    expect(btn).toHaveAttribute('aria-disabled', 'true')
  })

  it('renders inactive table disabled', () => {
    render(<TableCard table={baseTable} status="inactive" onSelect={vi.fn()} />)
    const btn = screen.getByRole('button', { name: 'Bàn Bàn 1, 4 chỗ, Tạm tắt' })
    expect(btn).toBeInTheDocument()
    expect(btn).toBeDisabled()
    expect(btn).toHaveAttribute('aria-disabled', 'true')
  })

  // --- Interaction ---

  it('calls onSelect when empty table is clicked', async () => {
    const onSelect = vi.fn()
    const user = userEvent.setup()
    render(<TableCard table={baseTable} status="empty" onSelect={onSelect} />)
    await user.click(screen.getByRole('button', { name: 'Bàn Bàn 1, 4 chỗ, Trống' }))
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect).toHaveBeenCalledWith(baseTable)
  })

  it('does NOT call onSelect when serving table is clicked (disabled)', async () => {
    const onSelect = vi.fn()
    const user = userEvent.setup()
    render(<TableCard table={baseTable} status="serving" onSelect={onSelect} />)
    await user.click(screen.getByRole('button', { name: 'Bàn Bàn 1, 4 chỗ, Đang phục vụ' }))
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('does NOT call onSelect when occupied table is clicked (disabled)', async () => {
    const onSelect = vi.fn()
    const user = userEvent.setup()
    render(<TableCard table={baseTable} status="occupied" onSelect={onSelect} />)
    await user.click(screen.getByRole('button', { name: 'Bàn Bàn 1, 4 chỗ, Đã có đơn' }))
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('does NOT call onSelect when conflict table is clicked (disabled)', async () => {
    const onSelect = vi.fn()
    const user = userEvent.setup()
    render(<TableCard table={baseTable} status="conflict" onSelect={onSelect} />)
    await user.click(screen.getByRole('button', { name: 'Bàn Bàn 1, 4 chỗ, Xung đột phiên' }))
    expect(onSelect).not.toHaveBeenCalled()
  })

  // --- Accessibility / WCAG ---

  it('has minimum height class for touch target ≥56px', () => {
    render(<TableCard table={baseTable} status="empty" onSelect={vi.fn()} />)
    const btn = screen.getByRole('button', { name: 'Bàn Bàn 1, 4 chỗ, Trống' })
    expect(btn.className).toContain('min-h-[88px]')
  })

  it('displays table name and capacity', () => {
    render(<TableCard table={baseTable} status="empty" onSelect={vi.fn()} />)
    expect(screen.getByText('Bàn 1')).toBeInTheDocument()
    expect(screen.getByText('4 chỗ')).toBeInTheDocument()
  })

  // --- StatusBadge text for all statuses (WCAG: text + icon + color, not just color) ---
  it('shows StatusBadge text for all statuses', () => {
    const { rerender } = render(<TableCard table={baseTable} status="empty" onSelect={vi.fn()} />)
    expect(screen.getByText('Trống')).toBeInTheDocument()

    rerender(<TableCard table={baseTable} status="serving" onSelect={vi.fn()} />)
    expect(screen.getByText('Đang phục vụ')).toBeInTheDocument()

    rerender(<TableCard table={baseTable} status="occupied" onSelect={vi.fn()} />)
    expect(screen.getByText('Đã có đơn')).toBeInTheDocument()

    rerender(<TableCard table={baseTable} status="conflict" onSelect={vi.fn()} />)
    expect(screen.getByText('Xung đột phiên')).toBeInTheDocument()

    rerender(<TableCard table={baseTable} status="pending_sync" onSelect={vi.fn()} />)
    expect(screen.getByText('Chờ đồng bộ')).toBeInTheDocument()

    rerender(<TableCard table={baseTable} status="inactive" onSelect={vi.fn()} />)
    expect(screen.getByText('Tạm tắt')).toBeInTheDocument()
  })
})
