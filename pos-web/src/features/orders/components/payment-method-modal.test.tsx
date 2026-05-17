import 'fake-indexeddb/auto'
import '@testing-library/jest-dom/vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../../db/dexie'
import type { LocalOrderRecord } from '../../../db/schemas/orders'
import { syncEngine } from '../../sync/engine'
import * as ordersApi from '../api'
import { useCartStore } from '../cart-store'
import { useCheckoutStore } from '../checkout-store'
import type { CartItem } from '../types'
import { PaymentMethodModal } from './payment-method-modal'

vi.mock('../../sync/engine', () => ({ syncEngine: { kick: vi.fn() } }))

const cartItem: CartItem = {
  tempId: 'tmp-1',
  productId: 'p-1',
  productNameSnapshot: 'Trà đào',
  unitPriceSnapshot: 45000,
  options: [],
  quantity: 1,
  lineTotal: 45000,
}

const orderFixture: LocalOrderRecord = {
  clientOrderId: '018f0000-0000-7000-8000-000000000001',
  orderCode: '20260517-POS01-0001',
  deviceId: 'POS01',
  soldAt: '2026-05-17T07:39:00.000Z',
  menuVersionAtSale: 1,
  items: [{ ...cartItem }],
  discountAmount: 0,
  total: 45000,
  paymentMethod: 'transfer',
  status: 'pendingSync',
  createdAt: '2026-05-17T07:39:00.000Z',
  updatedAt: '2026-05-17T07:39:00.000Z',
}

function renderOpenModal() {
  useCartStore.setState({ items: [cartItem], discount: null })
  useCheckoutStore.getState().openPaymentMethodModal()
  return render(<PaymentMethodModal items={useCartStore.getState().items} discount={useCartStore.getState().discount} />)
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

describe('PaymentMethodModal', () => {
  it('stays hidden by default and opens with title, description, radio options, and actions', async () => {
    const { rerender } = render(<PaymentMethodModal items={[cartItem]} discount={null} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    useCheckoutStore.getState().openPaymentMethodModal()
    rerender(<PaymentMethodModal items={[cartItem]} discount={null} />)

    expect(screen.getByRole('heading', { name: 'Chọn phương thức thanh toán' })).toBeInTheDocument()
    expect(screen.getByText('Chọn phương thức thanh toán cho đơn hiện tại.', { selector: 'p' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Tiền mặt/ })).toBeChecked()
    expect(screen.getByRole('radio', { name: /Chuyển khoản/ })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Thẻ/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Quay lại' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Hoàn tất' })).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('radio', { name: /Tiền mặt/ })).toHaveFocus())
  })

  it('updates payment method state when cashier selects transfer', async () => {
    const user = userEvent.setup()
    renderOpenModal()
    await user.click(screen.getByRole('radio', { name: /Chuyển khoản/ }))
    expect(useCheckoutStore.getState().paymentMethod).toBe('transfer')
    expect(screen.getByRole('radio', { name: /Chuyển khoản/ })).toBeChecked()
  })

  it('finalizes with selected payment method, resets cart, sets receipt state, dispatches event, and closes', async () => {
    const user = userEvent.setup()
    const finalized = vi.fn()
    window.addEventListener('order.finalized', finalized)
    const finalizeSpy = vi.spyOn(ordersApi, 'finalizeOrder').mockResolvedValue(orderFixture)
    renderOpenModal()

    await user.click(screen.getByRole('radio', { name: /Chuyển khoản/ }))
    await user.click(screen.getByRole('button', { name: 'Hoàn tất' }))

    await waitFor(() => expect(finalizeSpy).toHaveBeenCalledWith({ cart: { items: [cartItem], discount: null }, paymentMethod: 'transfer', deviceId: 'POS01' }))
    expect(useCartStore.getState().items).toEqual([])
    expect(useCheckoutStore.getState().lastFinalizedOrder?.clientOrderId).toBe(orderFixture.clientOrderId)
    expect(useCheckoutStore.getState().isPaymentMethodModalOpen).toBe(false)
    expect(finalized).toHaveBeenCalledTimes(1)
    window.removeEventListener('order.finalized', finalized)
  })

  it('closes with Quay lại without API, Dexie, sync, event, or cart/payment reset', async () => {
    const user = userEvent.setup()
    const finalized = vi.fn()
    window.addEventListener('order.finalized', finalized)
    const finalizeSpy = vi.spyOn(ordersApi, 'finalizeOrder')
    const addSpy = vi.spyOn(db.orders, 'add')
    renderOpenModal()
    await user.click(screen.getByRole('radio', { name: /Chuyển khoản/ }))

    await user.click(screen.getByRole('button', { name: 'Quay lại' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(useCartStore.getState().items).toEqual([cartItem])
    expect(useCheckoutStore.getState().paymentMethod).toBe('transfer')
    expect(useCheckoutStore.getState().errorMessage).toBeNull()
    expect(finalizeSpy).not.toHaveBeenCalled()
    expect(addSpy).not.toHaveBeenCalled()
    expect(syncEngine.kick).not.toHaveBeenCalled()
    expect(finalized).not.toHaveBeenCalled()
    window.removeEventListener('order.finalized', finalized)
  })

  it('closes on Escape and overlay when idle', async () => {
    const user = userEvent.setup()
    renderOpenModal()
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    useCheckoutStore.getState().openPaymentMethodModal()
    render(<PaymentMethodModal items={[cartItem]} discount={null} />)
    await user.click(document.querySelector('[data-radix-dialog-overlay]') as HTMLElement)
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('keeps modal open and cart intact when finalize fails', async () => {
    const user = userEvent.setup()
    vi.spyOn(ordersApi, 'finalizeOrder').mockRejectedValue(new Error('IndexedDB quota'))
    renderOpenModal()
    await user.click(screen.getByRole('button', { name: 'Hoàn tất' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('IndexedDB quota')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(useCartStore.getState().items).toEqual([cartItem])
    expect(useCheckoutStore.getState().lastFinalizedOrder).toBeNull()
  })

  it('disables buttons and blocks Escape/overlay close while checkout is running', async () => {
    const user = userEvent.setup()
    renderOpenModal()
    act(() => useCheckoutStore.getState().startCheckout())

    expect(screen.getByRole('button', { name: 'Quay lại' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Đang chuẩn bị đơn...' })).toBeDisabled()
    await user.keyboard('{Escape}')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await user.click(document.querySelector('[data-radix-dialog-overlay]') as HTMLElement)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})
