/**
 * table-card.test.tsx — Updated for Story 6.12 to cover new status types.
 *
 * TableCard now accepts TableDisplayStatus (extended) instead of TableOccupancyStatus.
 * Key changes:
 *  - 'serving' status → "Đang có đơn" (phiên mở + có draft chưa thanh toán; disabled, reopen qua hasLocalDraft)
 *  - 'opening' status → "Đang mở" (phiên mở nhưng chưa có draft; disabled)
 *  - 'conflict' status → "Xung đột phiên" (disabled + danger icon)
 *  - 'occupied' ("Đã có đơn") BỎ — bàn đã thanh toán xong trả về 'empty' (chọn được).
 *  - 'pending_sync' ("Chờ đồng bộ") BỎ khỏi display — đơn đã thanh toán chờ sync không giữ bàn bận;
 *    bàn về 'empty' ngay, tình trạng sync báo toàn cục (FR24).
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

  it('renders serving table disabled with label "Đang có đơn" (phiên mở + có đơn chưa thanh toán)', () => {
    render(<TableCard table={baseTable} status="serving" onSelect={vi.fn()} />)
    const btn = screen.getByRole('button', { name: 'Bàn Bàn 1, 4 chỗ, Đang có đơn' })
    expect(btn).toBeInTheDocument()
    expect(btn).toBeDisabled()
    expect(btn).toHaveAttribute('aria-disabled', 'true')
  })

  it('renders opening table disabled with label "Đang mở" (phiên mở, chưa có đơn)', () => {
    render(<TableCard table={baseTable} status="opening" onSelect={vi.fn()} />)
    const btn = screen.getByRole('button', { name: 'Bàn Bàn 1, 4 chỗ, Đang mở' })
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
    await user.click(screen.getByRole('button', { name: 'Bàn Bàn 1, 4 chỗ, Đang có đơn' }))
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('does NOT call onSelect when conflict table is clicked (disabled)', async () => {
    const onSelect = vi.fn()
    const user = userEvent.setup()
    render(<TableCard table={baseTable} status="conflict" onSelect={onSelect} />)
    await user.click(screen.getByRole('button', { name: 'Bàn Bàn 1, 4 chỗ, Xung đột phiên' }))
    expect(onSelect).not.toHaveBeenCalled()
  })

  // --- Story 6.13 (AC9): hasLocalDraft override ---

  it('serving table WITH hasLocalDraft=true is enabled and clickable (AC9)', async () => {
    const onSelect = vi.fn()
    const user = userEvent.setup()
    render(<TableCard table={baseTable} status="serving" hasLocalDraft={true} onSelect={onSelect} />)
    // Button should NOT be disabled when the table has a local draft
    const btn = screen.getByRole('button')
    expect(btn).not.toBeDisabled()
    expect(btn).not.toHaveAttribute('aria-disabled')
    // Should be clickable
    await user.click(btn)
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect).toHaveBeenCalledWith(baseTable)
  })

  it('serving table WITH hasLocalDraft=true shows "Tiếp tục" label (AC9)', () => {
    render(<TableCard table={baseTable} status="serving" hasLocalDraft={true} onSelect={vi.fn()} />)
    expect(screen.getByText('Tiếp tục')).toBeInTheDocument()
    // Status label is still rendered
    expect(screen.getByText('Đang có đơn')).toBeInTheDocument()
  })

  it('serving table WITHOUT hasLocalDraft stays disabled (AC9 — cross-device table)', () => {
    render(<TableCard table={baseTable} status="serving" onSelect={vi.fn()} />)
    const btn = screen.getByRole('button')
    expect(btn).toBeDisabled()
    expect(btn).toHaveAttribute('aria-disabled', 'true')
    expect(screen.queryByText('Tiếp tục')).not.toBeInTheDocument()
  })

  // --- Order details on "Đang có đơn" cards (design tables.html) ---

  it('serving table shows total, item count and open time', () => {
    render(
      <TableCard
        table={baseTable}
        status="serving"
        hasLocalDraft={true}
        orderTotal={125000}
        itemCount={3}
        openedAt="2026-06-08T07:30:00.000Z" // 14:30 giờ VN
        onSelect={vi.fn()}
      />,
    )
    // Tổng tiền (định dạng VND)
    expect(screen.getByText(/125[.,\s]000/)).toBeInTheDocument()
    // Số món
    expect(screen.getByText('3 món')).toBeInTheDocument()
    // Giờ mở bàn (14:30 theo Asia/Ho_Chi_Minh)
    expect(screen.getByText('Mở 14:30')).toBeInTheDocument()
  })

  it('serving table without openedAt omits the open-time line', () => {
    render(
      <TableCard table={baseTable} status="serving" hasLocalDraft={true} orderTotal={50000} itemCount={1} onSelect={vi.fn()} />,
    )
    expect(screen.getByText('1 món')).toBeInTheDocument()
    expect(screen.queryByText(/^Mở /)).not.toBeInTheDocument()
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

    rerender(<TableCard table={baseTable} status="opening" onSelect={vi.fn()} />)
    expect(screen.getByText('Đang mở')).toBeInTheDocument()

    rerender(<TableCard table={baseTable} status="serving" onSelect={vi.fn()} />)
    expect(screen.getByText('Đang có đơn')).toBeInTheDocument()

    rerender(<TableCard table={baseTable} status="conflict" onSelect={vi.fn()} />)
    expect(screen.getByText('Xung đột phiên')).toBeInTheDocument()

    rerender(<TableCard table={baseTable} status="inactive" onSelect={vi.fn()} />)
    expect(screen.getByText('Tạm tắt')).toBeInTheDocument()
  })
})
