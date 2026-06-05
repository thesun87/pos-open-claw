import 'fake-indexeddb/auto'
import '@testing-library/jest-dom/vitest'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../../db/dexie'
import { useConnectivityStore } from '../../../shared/stores/connectivity.store'
import { voidSyncedOrder } from '../api'
import type { LocalOrderRecord } from '../../../db/schemas/orders'
import { ReceiptModal } from './receipt-modal'

vi.mock('../api', () => ({ voidSyncedOrder: vi.fn() }))

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
  tableId: null,
  tableNameSnapshot: null,
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
  useConnectivityStore.getState().setConnectivityState({ isOnline: true, lastCheckedAt: new Date('2026-05-13T10:00:00.000Z') })
  vi.mocked(voidSyncedOrder).mockReset()
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


  it('voids a synced order through the backend and stores local void metadata', async () => {
    vi.mocked(voidSyncedOrder).mockResolvedValue({ voidId: 'void-1', voidedAt: '2026-05-14T15:03:00.000Z' })
    await db.orders.update(order.clientOrderId, { status: 'synced', serverOrderId: '018f0000-0000-7000-8000-000000009999' })
    const user = userEvent.setup()
    renderReceipt({ order: { ...order, status: 'synced', serverOrderId: '018f0000-0000-7000-8000-000000009999' } })

    await waitFor(() => expect(screen.getByRole('button', { name: 'Void đơn này' })).toBeEnabled())
    await user.click(screen.getByRole('button', { name: 'Void đơn này' }))
    await user.type(await screen.findByPlaceholderText('Ví dụ: Khách đổi ý, Hết món'), 'Khách đổi ý')
    await user.click(screen.getAllByRole('button', { name: 'Void đơn này' }).at(-1)!)

    await waitFor(() => expect(voidSyncedOrder).toHaveBeenCalledWith({ serverOrderId: '018f0000-0000-7000-8000-000000009999', reason: 'Khách đổi ý' }))
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Đã void đơn 20260513-POS01-0001'))
    expect(await db.orders.get(order.clientOrderId)).toMatchObject({ voidedAt: '2026-05-14T15:03:00.000Z', voidReason: 'Khách đổi ý' })
    expect(await screen.findByText('Đã void')).toBeInTheDocument()
    expect(await screen.findByText('ĐÃ HỦY')).toBeInTheDocument()
    expect(await screen.findByText('Lý do: Khách đổi ý')).toBeInTheDocument()
    expect(screen.getByText('75.000 ₫')).toBeInTheDocument()
  })

  it('blocks synced order void while offline without changing Dexie', async () => {
    useConnectivityStore.getState().setConnectivityState({ isOnline: false, lastCheckedAt: new Date('2026-05-13T10:00:00.000Z') })
    await db.orders.update(order.clientOrderId, { status: 'synced', serverOrderId: '018f0000-0000-7000-8000-000000009999' })
    renderReceipt({ order: { ...order, status: 'synced', serverOrderId: '018f0000-0000-7000-8000-000000009999' } })

    expect(await screen.findByText('Cần kết nối để void đơn đã đồng bộ')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Void đơn này' })).toBeDisabled()
    expect(voidSyncedOrder).not.toHaveBeenCalled()
    expect(await db.orders.get(order.clientOrderId)).not.toMatchObject({ voidedAt: expect.any(String) })
  })

  it('does not show void action for pending, failed, missing-server, or already voided orders', async () => {
    const { rerender } = render(<ReceiptModal order={order} open onOpenChange={vi.fn()} />)
    expect(screen.queryByRole('button', { name: 'Void đơn này' })).not.toBeInTheDocument()

    rerender(<ReceiptModal order={{ ...order, status: 'syncFailed' }} open onOpenChange={vi.fn()} />)
    expect(screen.queryByRole('button', { name: 'Void đơn này' })).not.toBeInTheDocument()

    rerender(<ReceiptModal order={{ ...order, status: 'synced' }} open onOpenChange={vi.fn()} />)
    expect(screen.queryByRole('button', { name: 'Void đơn này' })).not.toBeInTheDocument()

    rerender(<ReceiptModal order={{ ...order, status: 'synced', serverOrderId: 's1', voidedAt: '2026-05-14T15:03:00.000Z', voidReason: 'Nhầm đơn' }} open onOpenChange={vi.fn()} />)
    expect(screen.queryByRole('button', { name: 'Void đơn này' })).not.toBeInTheDocument()
    expect(screen.getByText('Đã void')).toBeInTheDocument()
    expect(screen.getByText('ĐÃ HỦY')).toBeInTheDocument()
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

  // Story 6.8: table name display tests (AC7, AC8, AC16)
  it('renders "Bàn" row when tableNameSnapshot is non-null (AC7)', async () => {
    const orderWithTable: LocalOrderRecord = {
      ...order,
      tableId: '018f0000-0000-7000-8000-000000000001',
      tableNameSnapshot: 'Bàn 3',
    }
    await db.orders.put(orderWithTable)
    render(<ReceiptModal order={orderWithTable} open onOpenChange={vi.fn()} />)
    // label "Bàn" must appear as a term in the details section
    await waitFor(() => {
      expect(screen.getByText('Bàn')).toBeInTheDocument()
      expect(screen.getByText('Bàn 3')).toBeInTheDocument()
    })
  })

  it('hides "Bàn" row completely when tableNameSnapshot is null (AC8)', async () => {
    renderReceipt()
    // The base order fixture has no tableNameSnapshot — verify "Bàn" label is absent
    // Note: avoid matching "Bạc Xỉu" which starts with "Bạ" not "Bàn"
    await waitFor(() => {
      // Only check for the dt label "Bàn" — not the product name
      const termElements = screen.queryAllByText('Bàn')
      expect(termElements).toHaveLength(0)
    })
  })

  it('hides "Bàn" row when tableNameSnapshot is explicitly null (AC8)', async () => {
    const orderWithNullTable: LocalOrderRecord = {
      ...order,
      tableId: null,
      tableNameSnapshot: null,
    }
    await db.orders.put(orderWithNullTable)
    render(<ReceiptModal order={orderWithNullTable} open onOpenChange={vi.fn()} />)
    await waitFor(() => {
      expect(screen.queryByText('Bàn')).not.toBeInTheDocument()
    })
  })
})
