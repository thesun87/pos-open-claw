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
