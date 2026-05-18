import 'fake-indexeddb/auto'
import '@testing-library/jest-dom/vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../../db/dexie'
import { syncEngine } from '../../sync/engine'
import * as ordersApi from '../api'
import { useCartStore } from '../cart-store'
import { useCheckoutStore } from '../checkout-store'
import { CartPanel } from './cart-panel'

vi.mock('../../sync/engine', () => ({ syncEngine: { kick: vi.fn() } }))

const cartItem = {
  productId: 'p-1',
  productNameSnapshot: 'Bạc Xỉu',
  unitPriceSnapshot: 35000,
  options: [],
  quantity: 1,
  lineTotal: 35000,
}

beforeEach(async () => {
  await db.open()
  await db.orders.clear()
  useCartStore.getState().resetCart()
  useCheckoutStore.getState().resetCheckoutState()
  vi.mocked(syncEngine.kick).mockReset()
})

afterEach(async () => {
  vi.restoreAllMocks()
  await db.orders.clear()
  db.close()
})


describe('CartPanel Obsidian layout', () => {
  it('renders fixed cart panel header actions, option chips, summary actions, and checkout CTA', () => {
    useCartStore.getState().addItem({
      ...cartItem,
      options: [{ optionId: 'o-l', labelSnapshot: 'L', priceDeltaSnapshot: 5000 }],
      lineTotal: 40000,
    })

    render(<CartPanel />)

    const panel = screen.getByLabelText('Giỏ hàng và thanh toán')
    expect(panel).toHaveClass('fixed', 'right-0', 'top-16', 'w-[380px]')
    expect(within(panel).getByRole('heading', { name: 'Đơn hiện tại' })).toBeInTheDocument()
    expect(within(panel).getByRole('button', { name: 'Hủy đơn' })).toBeInTheDocument()
    expect(within(panel).getByText('L +5.000 ₫')).toHaveClass('rounded-full', 'bg-surface-container-high')

    const checkout = within(panel).getByLabelText('Tóm tắt thanh toán')
    expect(within(checkout).getByText('Tổng tiền')).toBeInTheDocument()
    expect(within(checkout).queryByRole('button', { name: 'Print' })).not.toBeInTheDocument()
    expect(within(checkout).queryByRole('button', { name: 'Apply' })).not.toBeInTheDocument()
    expect(within(checkout).getByRole('button', { name: /^Giảm giá/ })).toBeEnabled()
    expect(within(checkout).getByRole('button', { name: 'Hoàn tất đơn' })).toHaveClass('bg-primary', 'text-on-primary')
  })
})

describe('CartPanel checkout payment modal', () => {
  it('removes inline payment selector and opens modal without finalizing', async () => {
    const user = userEvent.setup()
    const finalizeSpy = vi.spyOn(ordersApi, 'finalizeOrder')
    const addSpy = vi.spyOn(db.orders, 'add')
    useCartStore.getState().addItem(cartItem)

    render(<CartPanel />)
    const checkout = screen.getByLabelText('Tóm tắt thanh toán')
    expect(within(checkout).queryByText('Phương thức thanh toán')).not.toBeInTheDocument()
    expect(within(checkout).queryByRole('radio', { name: /Tiền mặt/ })).not.toBeInTheDocument()

    const finalizeButton = within(checkout).getByRole('button', { name: 'Hoàn tất đơn' })
    await user.click(finalizeButton)

    expect(screen.getByRole('heading', { name: 'Chọn phương thức thanh toán' })).toBeInTheDocument()
    expect(finalizeSpy).not.toHaveBeenCalled()
    expect(addSpy).not.toHaveBeenCalled()
    expect(syncEngine.kick).not.toHaveBeenCalled()
  })

  it('closes payment modal with Quay lại and leaves checkout trigger enabled', async () => {
    const user = userEvent.setup()
    useCartStore.getState().addItem(cartItem)
    render(<CartPanel />)
    const finalizeButton = screen.getByRole('button', { name: 'Hoàn tất đơn' })
    await user.click(finalizeButton)
    await user.click(screen.getByRole('button', { name: 'Quay lại' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(finalizeButton).toBeEnabled()
  })
})

describe('CartPanel cart-level void', () => {
  it('shows cart cancel only with items and resets cart, discount, payment method with local feedback', async () => {
    const user = userEvent.setup()
    const finalizeSpy = vi.spyOn(ordersApi, 'finalizeOrder')
    const addSpy = vi.spyOn(db.orders, 'add')
    const item = useCartStore.getState().addItem(cartItem)
    useCartStore.getState().setDiscount({ type: 'fixed', value: 5000 })
    useCheckoutStore.getState().setPaymentMethod('transfer')

    render(<CartPanel />)
    const cancelButton = screen.getByRole('button', { name: 'Hủy đơn' })
    expect(cancelButton).toBeInTheDocument()
    await user.click(cancelButton)
    await waitFor(() => expect(screen.getByLabelText('Lý do hủy')).toHaveFocus())
    await user.type(screen.getByLabelText('Lý do hủy'), 'Khách đổi ý')
    await user.click(screen.getByRole('button', { name: 'Hủy đơn này' }))

    expect(useCartStore.getState().items).toHaveLength(0)
    expect(useCartStore.getState().discount).toBeNull()
    expect(useCheckoutStore.getState().paymentMethod).toBe('cash')
    expect(screen.getByText('Đã hủy đơn')).toHaveAttribute('role', 'status')
    expect(screen.queryByRole('button', { name: 'Hủy đơn' })).not.toBeInTheDocument()
    expect(await db.orders.count()).toBe(0)
    expect(addSpy).not.toHaveBeenCalled()
    expect(finalizeSpy).not.toHaveBeenCalled()
    expect(syncEngine.kick).not.toHaveBeenCalled()
    await waitFor(() => expect(screen.getByLabelText('Giỏ hàng và thanh toán')).toHaveFocus())
    expect(screen.queryByText(item.productNameSnapshot)).not.toBeInTheDocument()
  })

  it('keeps the dialog open on blank reason and returns focus to the trigger when cancelled', async () => {
    const user = userEvent.setup()
    useCartStore.getState().addItem(cartItem)
    render(<CartPanel />)
    const cancelButton = screen.getByRole('button', { name: 'Hủy đơn' })
    await user.click(cancelButton)
    await user.click(screen.getByRole('button', { name: 'Hủy đơn này' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Vui lòng nhập lý do hủy')
    expect(useCartStore.getState().items).toHaveLength(1)

    await user.click(screen.getByRole('button', { name: 'Quay lại' }))
    await waitFor(() => expect(cancelButton).toHaveFocus())
    expect(useCartStore.getState().items).toHaveLength(1)
  })
})

describe('CartPanel discount modal', () => {
  it('opens discount modal and applies fixed discount', async () => {
    const user = userEvent.setup()
    useCartStore.getState().addItem(cartItem)

    render(<CartPanel />)
    const discountButton = screen.getByRole('button', { name: /^Giảm giá/ })
    await user.click(discountButton)

    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument())
    expect(screen.getByRole('heading', { name: 'Giảm giá đơn hàng' })).toBeInTheDocument()

    const fixedRadio = screen.getByLabelText('Giảm tiền cố định')
    expect(fixedRadio).toBeChecked()

    const input = screen.getByLabelText('Giá trị giảm')
    await user.clear(input)
    await user.type(input, '10000')

    await user.click(screen.getByRole('button', { name: 'Áp dụng' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(useCartStore.getState().discount).toEqual({ type: 'fixed', value: 10000 })
    expect(screen.getByText('-10.000 ₫')).toBeInTheDocument()
  })

  it('opens discount modal with prefilled values when discount exists', async () => {
    const user = userEvent.setup()
    useCartStore.getState().addItem(cartItem)
    useCartStore.getState().setDiscount({ type: 'percentage', value: 10 })

    render(<CartPanel />)
    const discountButton = screen.getByRole('button', { name: 'Giảm giá (10%)' })
    await user.click(discountButton)

    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument())
    const percentRadio = screen.getByLabelText('Giảm theo %')
    expect(percentRadio).toBeChecked()
    expect(screen.getByLabelText('Giá trị giảm')).toHaveValue('10')
  })

  it('Quay lại does not commit discount changes', async () => {
    const user = userEvent.setup()
    useCartStore.getState().addItem(cartItem)
    useCartStore.getState().setDiscount({ type: 'fixed', value: 5000 })

    render(<CartPanel />)
    await user.click(screen.getByRole('button', { name: /Giảm giá/ }))
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument())

    const input = screen.getByLabelText('Giá trị giảm')
    await user.clear(input)
    await user.type(input, '9000')

    await user.click(screen.getByRole('button', { name: 'Quay lại' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(useCartStore.getState().discount).toEqual({ type: 'fixed', value: 5000 })
  })

  it('ESC closes discount modal without commit', async () => {
    const user = userEvent.setup()
    useCartStore.getState().addItem(cartItem)
    useCartStore.getState().setDiscount({ type: 'fixed', value: 5000 })

    render(<CartPanel />)
    await user.click(screen.getByRole('button', { name: /Giảm giá/ }))
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument())

    const input = screen.getByLabelText('Giá trị giảm')
    await user.clear(input)
    await user.type(input, '9000')

    await user.keyboard('{Escape}')

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(useCartStore.getState().discount).toEqual({ type: 'fixed', value: 5000 })
  })

  it('Bỏ giảm giá button clears discount and closes modal', async () => {
    const user = userEvent.setup()
    useCartStore.getState().addItem(cartItem)
    useCartStore.getState().setDiscount({ type: 'fixed', value: 5000 })

    render(<CartPanel />)
    await user.click(screen.getByRole('button', { name: /Giảm giá/ }))
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: 'Bỏ giảm giá' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(useCartStore.getState().discount).toBeNull()
    expect(screen.getByRole('button', { name: 'Giảm giá' })).toBeInTheDocument()
  })

  it('Bỏ giảm giá button not visible when no discount yet', async () => {
    const user = userEvent.setup()
    useCartStore.getState().addItem(cartItem)

    render(<CartPanel />)
    await user.click(screen.getByRole('button', { name: 'Giảm giá' }))
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument())

    expect(screen.queryByRole('button', { name: 'Bỏ giảm giá' })).not.toBeInTheDocument()
  })

  it('Áp dụng disabled when value invalid', async () => {
    const user = userEvent.setup()
    useCartStore.getState().addItem(cartItem)

    render(<CartPanel />)
    await user.click(screen.getByRole('button', { name: 'Giảm giá' }))
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument())

    const input = screen.getByLabelText('Giá trị giảm')
    await user.clear(input)
    await user.type(input, '999999')

    const applyButton = screen.getByRole('button', { name: 'Áp dụng' })
    expect(applyButton).toBeDisabled()
    expect(screen.getByText(/Giảm tiền phải từ 0 đến/)).toBeInTheDocument()
  })

  it('focus returns to trigger after close', async () => {
    const user = userEvent.setup()
    useCartStore.getState().addItem(cartItem)

    render(<CartPanel />)
    const discountButton = screen.getByRole('button', { name: 'Giảm giá' })
    await user.click(discountButton)
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument())

    expect(screen.getByRole('button', { name: 'Áp dụng' })).toBeInTheDocument()
    await user.keyboard('{Escape}')

    await waitFor(() => expect(discountButton).toHaveFocus())
  })
})
