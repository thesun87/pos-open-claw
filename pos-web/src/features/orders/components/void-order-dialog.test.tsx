import '@testing-library/jest-dom/vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { VoidOrderDialog } from './void-order-dialog'

function renderDialog(props: Partial<React.ComponentProps<typeof VoidOrderDialog>> = {}) {
  const onOpenChange = vi.fn()
  const onConfirm = vi.fn()
  render(<VoidOrderDialog open onOpenChange={onOpenChange} onConfirm={onConfirm} {...props} />)
  return { onOpenChange, onConfirm }
}

describe('VoidOrderDialog', () => {
  it('renders Vietnamese destructive copy and focuses the required reason input', async () => {
    renderDialog()
    expect(screen.getByRole('heading', { name: 'Hủy đơn đang trong giỏ?' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Hủy đơn này' })).toHaveClass('bg-danger')
    expect(screen.getByRole('button', { name: 'Quay lại' })).toBeInTheDocument()
    await waitFor(() => expect(screen.getByLabelText('Lý do hủy')).toHaveFocus())
  })

  it('blocks blank submit and shows inline validation', async () => {
    const user = userEvent.setup()
    const { onConfirm } = renderDialog()
    await user.click(screen.getByRole('button', { name: 'Hủy đơn này' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Vui lòng nhập lý do hủy')
    expect(onConfirm).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Lý do hủy')).toHaveFocus()
  })

  it('submits trimmed reason and closes through secondary or Escape via Radix', async () => {
    const user = userEvent.setup()
    const { onOpenChange, onConfirm } = renderDialog()
    await user.type(screen.getByLabelText('Lý do hủy'), '  Khách đổi ý  ')
    await user.click(screen.getByRole('button', { name: 'Hủy đơn này' }))
    expect(onConfirm).toHaveBeenCalledWith('Khách đổi ý')

    await user.click(screen.getByRole('button', { name: 'Quay lại' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
    onOpenChange.mockClear()
    await user.keyboard('{Escape}')
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
  })
})
