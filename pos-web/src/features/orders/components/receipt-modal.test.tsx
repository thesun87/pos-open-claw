import 'fake-indexeddb/auto'
import '@testing-library/jest-dom/vitest'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../../db/dexie'
import type { LocalOrderRecord } from '../../../db/schemas/orders'
import { ReceiptModal } from './receipt-modal'

const order: LocalOrderRecord = {
  clientOrderId: 'client-1',
  orderCode: '20260513-POS01-0001',
  deviceId: 'POS01',
  soldAt: '2026-05-13T14:05:00.000Z',
  menuVersionAtSale: 1,
  items: [{ productId: 'p1', productNameSnapshot: 'Bạc Xỉu', unitPriceSnapshot: 35000, options: [{ optionId: 'o1', labelSnapshot: 'Size L', priceDeltaSnapshot: 5000 }], note: 'ít đường', quantity: 2, lineTotal: 80000 }],
  discountAmount: 5000,
  total: 75000,
  paymentMethod: 'cash',
  status: 'pendingSync',
  createdAt: '2026-05-13T14:05:00.000Z',
  updatedAt: '2026-05-13T14:05:00.000Z',
}

function renderReceipt(props: Partial<React.ComponentProps<typeof ReceiptModal>> = {}) {
  const onOpenChange = vi.fn()
  render(<ReceiptModal order={order} open onOpenChange={onOpenChange} {...props} />)
  return { onOpenChange }
}

beforeEach(async () => {
  await db.open()
  await db.orders.clear()
  await db.orders.put(order)
})

afterEach(async () => {
  vi.restoreAllMocks()
  await db.orders.clear()
  db.close()
})

describe('ReceiptModal', () => {
  it('renders receipt content, accessible structure, and Vietnamese labels from immutable snapshot', async () => {
    renderReceipt()
    expect(screen.getByRole('heading', { level: 2, name: 'Hóa đơn' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'Chi tiết' })).toBeInTheDocument()
    expect(screen.getByText('20260513-POS01-0001')).toHaveClass('text-3xl')
    expect(screen.getByText('13/05/2026 21:05')).toBeInTheDocument()
    expect(screen.getByText('Thu ngân POS')).toBeInTheDocument()
    expect(screen.getByText('Tiền mặt')).toBeInTheDocument()
    const list = screen.getByRole('list', { name: 'Danh sách món trên hóa đơn' })
    expect(within(list).getByText('Bạc Xỉu')).toBeInTheDocument()
    expect(within(list).getByText('Size L')).toBeInTheDocument()
    expect(within(list).getByText('Ghi chú: ít đường')).toBeInTheDocument()
    expect(screen.getByText('75.000 ₫')).toHaveClass('text-3xl')
    expect(screen.getByRole('button', { name: 'In hóa đơn' })).toBeEnabled()
    expect(screen.getAllByRole('button', { name: 'Đóng' })[0]).toBeEnabled()
  })

  it('reacts to Dexie sync status updates without closing the dialog', async () => {
    const { onOpenChange } = renderReceipt()
    expect(await screen.findByText('Chờ đồng bộ')).toBeInTheDocument()
    await act(async () => { await db.orders.update(order.clientOrderId, { status: 'synced' }) })
    expect(await screen.findByText('Đã đồng bộ')).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(onOpenChange).not.toHaveBeenCalled()
  })

  it('calls browser print through the print action and works without network', async () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => undefined)
    const user = userEvent.setup()
    renderReceipt()
    await user.click(screen.getByRole('button', { name: 'In hóa đơn' }))
    expect(print).toHaveBeenCalledTimes(1)
  })

  it('closes via button and Escape without mutating the order', async () => {
    const user = userEvent.setup()
    const { onOpenChange } = renderReceipt()
    await user.click(screen.getAllByRole('button', { name: 'Đóng' })[0]!)
    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(await db.orders.get(order.clientOrderId)).toMatchObject({ total: 75000, status: 'pendingSync' })

    onOpenChange.mockClear()
    await user.keyboard('{Escape}')
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
  })
})
