import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ModeTransitionConfirmDialog } from './mode-transition-confirm-dialog'

function renderDialog(props: Partial<React.ComponentProps<typeof ModeTransitionConfirmDialog>> = {}) {
  const defaults = {
    open: true,
    onOpenChange: vi.fn(),
    tableName: 'Bàn 3',
    itemCount: 3,
    mode: 'change-table' as const,
    onKeepCart: vi.fn(),
    onResetCart: vi.fn(),
  }
  render(<ModeTransitionConfirmDialog {...defaults} {...props} />)
  return { ...defaults, ...props }
}

describe('ModeTransitionConfirmDialog', () => {
  it('renders title with item count (AC12)', () => {
    renderDialog({ itemCount: 5 })
    expect(screen.getByRole('heading', { name: 'Cart hiện có 5 món' })).toBeInTheDocument()
  })

  it('renders body for change-table mode (AC9, AC12)', () => {
    renderDialog({ mode: 'change-table', tableName: 'Bàn 3' })
    expect(screen.getByText(/đang chuyển từ Bàn Bàn 3 sang chọn bàn khác/)).toBeInTheDocument()
  })

  it('renders body for cancel-table mode (AC10, AC12)', () => {
    renderDialog({ mode: 'cancel-table', tableName: 'Bàn 5' })
    expect(screen.getByText(/đang hủy phục vụ Bàn Bàn 5/)).toBeInTheDocument()
  })

  it('renders 3 buttons: Hủy, Tạo cart mới, Giữ cart (AC12)', () => {
    renderDialog()
    expect(screen.getByRole('button', { name: 'Hủy' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tạo cart mới' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Giữ cart' })).toBeInTheDocument()
  })

  it('calls onKeepCart then closes when "Giữ cart" is clicked (AC9, AC12)', async () => {
    const onKeepCart = vi.fn()
    const onOpenChange = vi.fn()
    const user = userEvent.setup()
    renderDialog({ onKeepCart, onOpenChange })
    await user.click(screen.getByRole('button', { name: 'Giữ cart' }))
    expect(onKeepCart).toHaveBeenCalledTimes(1)
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('calls onResetCart then closes when "Tạo cart mới" is clicked (AC9, AC12)', async () => {
    const onResetCart = vi.fn()
    const onOpenChange = vi.fn()
    const user = userEvent.setup()
    renderDialog({ onResetCart, onOpenChange })
    await user.click(screen.getByRole('button', { name: 'Tạo cart mới' }))
    expect(onResetCart).toHaveBeenCalledTimes(1)
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('calls onOpenChange(false) when "Hủy" is clicked (AC12)', async () => {
    const onOpenChange = vi.fn()
    const user = userEvent.setup()
    renderDialog({ onOpenChange })
    await user.click(screen.getByRole('button', { name: 'Hủy' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('does not render when open=false', () => {
    renderDialog({ open: false })
    expect(screen.queryByRole('heading', { name: /Cart hiện có/ })).not.toBeInTheDocument()
  })

  it('mode change-table body text is different from cancel-table (AC12)', () => {
    const { rerender } = render(
      <ModeTransitionConfirmDialog
        open={true}
        onOpenChange={vi.fn()}
        tableName="Bàn 3"
        itemCount={2}
        mode="change-table"
        onKeepCart={vi.fn()}
        onResetCart={vi.fn()}
      />,
    )
    const changeText = screen.getByRole('dialog').textContent
    rerender(
      <ModeTransitionConfirmDialog
        open={true}
        onOpenChange={vi.fn()}
        tableName="Bàn 3"
        itemCount={2}
        mode="cancel-table"
        onKeepCart={vi.fn()}
        onResetCart={vi.fn()}
      />,
    )
    const cancelText = screen.getByRole('dialog').textContent
    expect(changeText).not.toBe(cancelText)
  })
})
