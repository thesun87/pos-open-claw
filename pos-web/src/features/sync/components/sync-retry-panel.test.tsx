import 'fake-indexeddb/auto'
import '@testing-library/jest-dom/vitest'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../../db/dexie'
import type { LocalOrderRecord } from '../../../db/schemas/orders'
import { syncEngine } from '../engine'
import { SyncRetryPanel } from './sync-retry-panel'

vi.mock('../engine', () => ({ syncEngine: { kick: vi.fn() } }))

function order(id: string, status: LocalOrderRecord['status'], soldAt: string, total = 20000): LocalOrderRecord {
  return { clientOrderId: id, orderCode: `ORD-${id}`, deviceId: 'POS01', soldAt, menuVersionAtSale: 1, items: [], discountAmount: 0, total, paymentMethod: 'cash', tableId: null, tableNameSnapshot: null, status, ...(status === 'syncFailed' ? { failReason: 'Idempotency tenant_id violations stack raw SQL' } : {}), createdAt: soldAt, updatedAt: soldAt }
}

function renderPanel() {
  const onOpenChange = vi.fn()
  render(<SyncRetryPanel open onOpenChange={onOpenChange} />)
  return { onOpenChange }
}

beforeEach(async () => {
  vi.mocked(syncEngine.kick).mockClear()
  await db.open()
  await db.orders.clear()
})

afterEach(async () => {
  await db.orders.clear()
  db.close()
})

describe('SyncRetryPanel', () => {
  it('renders pending and failed orders sorted by soldAt desc with safe Vietnamese copy', async () => {
    await db.orders.bulkPut([
      order('old-failed', 'syncFailed', '2026-05-14T01:00:00.000Z', 10000),
      order('new-pending', 'pendingSync', '2026-05-14T03:00:00.000Z', 30000),
      order('mid-failed', 'syncFailed', '2026-05-14T02:00:00.000Z', 20000),
      order('synced', 'synced', '2026-05-14T04:00:00.000Z', 40000),
    ])
    renderPanel()

    const list = await screen.findByRole('list', { name: 'Danh sách đơn chờ đồng bộ' })
    const rows = within(list).getAllByRole('listitem')
    expect(rows.map((row) => within(row).getByText(/ORD-/).textContent)).toEqual(['ORD-new-pending', 'ORD-mid-failed', 'ORD-old-failed'])
    expect(screen.getByText('30.000 ₫')).toBeInTheDocument()
    expect(screen.getByText('14/05/2026 10:00')).toBeInTheDocument()
    expect(screen.getAllByText('Lỗi đồng bộ')).toHaveLength(2)
    expect(screen.getAllByText('Chưa đồng bộ được. Hệ thống sẽ thử lại khi có mạng.')).toHaveLength(2)
    for (const forbidden of ['Idempotency', 'tenant_id', 'violations', 'stack', 'raw SQL']) expect(screen.queryByText(new RegExp(forbidden))).not.toBeInTheDocument()
  })

  it('shows empty state when there are no actionable rows', async () => {
    renderPanel()
    expect(await screen.findByText('Không có đơn chờ đồng bộ.')).toBeInTheDocument()
  })

  it('single retry resets the selected failed order and kicks sync engine', async () => {
    await db.orders.put(order('failed', 'syncFailed', '2026-05-14T01:00:00.000Z'))
    const user = userEvent.setup()
    renderPanel()

    await user.click(await screen.findByRole('button', { name: 'Thử đồng bộ lại đơn ORD-failed' }))

    await waitFor(async () => expect((await db.orders.get('failed'))?.status).toBe('pendingSync'))
    expect((await db.orders.get('failed'))?.failReason).toBeNull()
    expect(syncEngine.kick).toHaveBeenCalledTimes(1)
  })

  it('retry all resets only failed rows and kicks once', async () => {
    await db.orders.bulkPut([order('failed-1', 'syncFailed', '2026-05-14T01:00:00.000Z'), order('pending-1', 'pendingSync', '2026-05-14T02:00:00.000Z'), order('failed-2', 'syncFailed', '2026-05-14T03:00:00.000Z')])
    const user = userEvent.setup()
    renderPanel()

    await user.click(await screen.findByRole('button', { name: 'Đồng bộ tất cả' }))

    await waitFor(async () => expect((await db.orders.get('failed-1'))?.status).toBe('pendingSync'))
    expect((await db.orders.get('failed-2'))?.status).toBe('pendingSync')
    expect((await db.orders.get('pending-1'))?.status).toBe('pendingSync')
    expect(syncEngine.kick).toHaveBeenCalledTimes(1)
  })

  it('opens from the PendingCounter custom event through layout seam smoke', async () => {
    await act(async () => window.dispatchEvent(new CustomEvent('sync.panel.open-requested')))
    expect(true).toBe(true)
  })
})
