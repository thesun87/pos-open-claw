import '@testing-library/jest-dom/vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DiscountModal } from './discount-modal'

describe('DiscountModal', () => {
  it('renders closed when open=false', () => {
    render(
      <DiscountModal
        open={false}
        onOpenChange={vi.fn()}
        subtotal={35000}
        discount={null}
        onApply={vi.fn()}
      />
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders open with discount=null', () => {
    render(
      <DiscountModal
        open={true}
        onOpenChange={vi.fn()}
        subtotal={35000}
        discount={null}
        onApply={vi.fn()}
      />
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Giảm giá đơn hàng' })).toBeInTheDocument()
    expect(screen.getByLabelText('Giảm tiền cố định')).toBeChecked()
    expect(screen.getByLabelText('Giá trị giảm')).toHaveValue('')
  })

  it('renders open with discount fixed', () => {
    render(
      <DiscountModal
        open={true}
        onOpenChange={vi.fn()}
        subtotal={35000}
        discount={{ type: 'fixed', value: 10000 }}
        onApply={vi.fn()}
      />
    )
    expect(screen.getByLabelText('Giảm tiền cố định')).toBeChecked()
    expect(screen.getByLabelText('Giá trị giảm')).toHaveValue('10000')
  })

  it('renders open with discount percentage', () => {
    render(
      <DiscountModal
        open={true}
        onOpenChange={vi.fn()}
        subtotal={35000}
        discount={{ type: 'percentage', value: 10 }}
        onApply={vi.fn()}
      />
    )
    expect(screen.getByLabelText('Giảm theo %')).toBeChecked()
    expect(screen.getByLabelText('Giá trị giảm')).toHaveValue('10')
  })

  it('switches radio fixed to percentage and resets input', async () => {
    const user = userEvent.setup()
    render(
      <DiscountModal
        open={true}
        onOpenChange={vi.fn()}
        subtotal={35000}
        discount={{ type: 'fixed', value: 5000 }}
        onApply={vi.fn()}
      />
    )
    expect(screen.getByLabelText('Giá trị giảm')).toHaveValue('5000')

    await user.click(screen.getByLabelText('Giảm theo %'))

    expect(screen.getByLabelText('Giảm theo %')).toBeChecked()
    expect(screen.getByLabelText('Giá trị giảm')).toHaveValue('')
    expect(screen.getByText('Nhập số nguyên 0-100.')).toBeInTheDocument()
  })

  it('filters non-integer input', async () => {
    const user = userEvent.setup()
    render(
      <DiscountModal
        open={true}
        onOpenChange={vi.fn()}
        subtotal={35000}
        discount={null}
        onApply={vi.fn()}
      />
    )
    const input = screen.getByLabelText('Giá trị giảm')
    await user.type(input, 'abc123def456')
    expect(input).toHaveValue('123456')
  })

  it('shows error when fixed value exceeds subtotal', async () => {
    const user = userEvent.setup()
    render(
      <DiscountModal
        open={true}
        onOpenChange={vi.fn()}
        subtotal={35000}
        discount={null}
        onApply={vi.fn()}
      />
    )
    const input = screen.getByLabelText('Giá trị giảm')
    await user.type(input, '50000')

    expect(screen.getByRole('button', { name: 'Áp dụng' })).toBeDisabled()
    expect(screen.getByText('Giảm tiền phải từ 0 đến 35.000 ₫.')).toBeInTheDocument()
  })

  it('shows error when percentage value exceeds 100', async () => {
    const user = userEvent.setup()
    render(
      <DiscountModal
        open={true}
        onOpenChange={vi.fn()}
        subtotal={35000}
        discount={{ type: 'percentage', value: 10 }}
        onApply={vi.fn()}
      />
    )
    const input = screen.getByLabelText('Giá trị giảm')
    await user.clear(input)
    await user.type(input, '150')

    expect(screen.getByRole('button', { name: 'Áp dụng' })).toBeDisabled()
    expect(screen.getByText('Giảm phần trăm phải từ 0 đến 100%.')).toBeInTheDocument()
  })

  it('calls onApply with valid fixed discount', async () => {
    const user = userEvent.setup()
    const onApply = vi.fn()
    const onOpenChange = vi.fn()
    render(
      <DiscountModal
        open={true}
        onOpenChange={onOpenChange}
        subtotal={35000}
        discount={null}
        onApply={onApply}
      />
    )
    await user.type(screen.getByLabelText('Giá trị giảm'), '10000')
    await user.click(screen.getByRole('button', { name: 'Áp dụng' }))

    expect(onApply).toHaveBeenCalledWith({ type: 'fixed', value: 10000 })
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('calls onApply with valid percentage discount', async () => {
    const user = userEvent.setup()
    const onApply = vi.fn()
    const onOpenChange = vi.fn()
    render(
      <DiscountModal
        open={true}
        onOpenChange={onOpenChange}
        subtotal={35000}
        discount={null}
        onApply={onApply}
      />
    )
    await user.click(screen.getByLabelText('Giảm theo %'))
    await user.type(screen.getByLabelText('Giá trị giảm'), '15')
    await user.click(screen.getByRole('button', { name: 'Áp dụng' }))

    expect(onApply).toHaveBeenCalledWith({ type: 'percentage', value: 15 })
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('calls onApply with null when value is empty', async () => {
    const user = userEvent.setup()
    const onApply = vi.fn()
    const onOpenChange = vi.fn()
    render(
      <DiscountModal
        open={true}
        onOpenChange={onOpenChange}
        subtotal={35000}
        discount={{ type: 'fixed', value: 5000 }}
        onApply={onApply}
      />
    )
    const input = screen.getByLabelText('Giá trị giảm')
    await user.clear(input)
    await user.click(screen.getByRole('button', { name: 'Áp dụng' }))

    expect(onApply).toHaveBeenCalledWith(null)
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('calls onApply with null when value is 0', async () => {
    const user = userEvent.setup()
    const onApply = vi.fn()
    const onOpenChange = vi.fn()
    render(
      <DiscountModal
        open={true}
        onOpenChange={onOpenChange}
        subtotal={35000}
        discount={null}
        onApply={onApply}
      />
    )
    await user.type(screen.getByLabelText('Giá trị giảm'), '0')
    await user.click(screen.getByRole('button', { name: 'Áp dụng' }))

    expect(onApply).toHaveBeenCalledWith(null)
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('calls onOpenChange(false) on Quay lại without calling onApply', async () => {
    const user = userEvent.setup()
    const onApply = vi.fn()
    const onOpenChange = vi.fn()
    render(
      <DiscountModal
        open={true}
        onOpenChange={onOpenChange}
        subtotal={35000}
        discount={{ type: 'fixed', value: 5000 }}
        onApply={onApply}
      />
    )
    await user.type(screen.getByLabelText('Giá trị giảm'), '9000')
    await user.click(screen.getByRole('button', { name: 'Quay lại' }))

    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(onApply).not.toHaveBeenCalled()
  })

  it('calls onApply(null) and onOpenChange(false) on Bỏ giảm giá', async () => {
    const user = userEvent.setup()
    const onApply = vi.fn()
    const onOpenChange = vi.fn()
    render(
      <DiscountModal
        open={true}
        onOpenChange={onOpenChange}
        subtotal={35000}
        discount={{ type: 'fixed', value: 5000 }}
        onApply={onApply}
      />
    )
    await user.click(screen.getByRole('button', { name: 'Bỏ giảm giá' }))

    expect(onApply).toHaveBeenCalledWith(null)
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('does not show Bỏ giảm giá button when discount is null', () => {
    render(
      <DiscountModal
        open={true}
        onOpenChange={vi.fn()}
        subtotal={35000}
        discount={null}
        onApply={vi.fn()}
      />
    )
    expect(screen.queryByRole('button', { name: 'Bỏ giảm giá' })).not.toBeInTheDocument()
  })

  it('resets form state when re-opened with different discount', async () => {
    const { rerender } = render(
      <DiscountModal
        open={true}
        onOpenChange={vi.fn()}
        subtotal={35000}
        discount={{ type: 'fixed', value: 5000 }}
        onApply={vi.fn()}
      />
    )
    expect(screen.getByLabelText('Giá trị giảm')).toHaveValue('5000')

    rerender(
      <DiscountModal
        open={false}
        onOpenChange={vi.fn()}
        subtotal={35000}
        discount={{ type: 'fixed', value: 5000 }}
        onApply={vi.fn()}
      />
    )

    rerender(
      <DiscountModal
        open={true}
        onOpenChange={vi.fn()}
        subtotal={35000}
        discount={{ type: 'percentage', value: 10 }}
        onApply={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(screen.getByLabelText('Giảm theo %')).toBeChecked()
      expect(screen.getByLabelText('Giá trị giảm')).toHaveValue('10')
    })
  })
})
