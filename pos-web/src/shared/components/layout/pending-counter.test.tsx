import 'fake-indexeddb/auto'
import '@testing-library/jest-dom/vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../../db/dexie'
import type { LocalOrderRecord } from '../../../db/schemas/orders'
import { PendingCounter } from './pending-counter'

function order(id: string, status: LocalOrderRecord['status']): LocalOrderRecord {
  return { clientOrderId: id, orderCode: id, deviceId: 'POS01', soldAt: '2026-05-14T00:00:00.000Z', menuVersionAtSale: 1, items: [], discountAmount: 0, total: 0, paymentMethod: 'cash', tableId: null, tableNameSnapshot: null, status, createdAt: '2026-05-14T00:00:00.000Z', updatedAt: '2026-05-14T00:00:00.000Z' }
}

beforeEach(async () => { await db.open(); await db.orders.clear() })
afterEach(async () => { await db.orders.clear(); db.close() })

describe('PendingCounter', () => {
  it('renders zero muted state with polite live region', async () => {
    render(<PendingCounter />)
    const button = await screen.findByRole('button', { name: 'Đơn chờ đồng bộ: 0 đơn chờ' })
    expect(button).toHaveAttribute('aria-live', 'polite')
    expect(button).toBeDisabled()
  })

  it('counts pending rows realtime and exposes click seam callback', async () => {
    const onOpenSyncPanel = vi.fn()
    render(<PendingCounter onOpenSyncPanel={onOpenSyncPanel} />)
    await act(async () => { await db.orders.put(order('p1', 'pendingSync')) })
    const button = await screen.findByRole('button', { name: 'Đơn chờ đồng bộ: 1 đơn chờ đồng bộ' })
    await userEvent.click(button)
    expect(onOpenSyncPanel).toHaveBeenCalledTimes(1)
  })

  it('prioritizes failed count and dispatches placeholder event', async () => {
    const listener = vi.fn()
    window.addEventListener('sync.panel.open-requested', listener)
    render(<PendingCounter />)
    await act(async () => { await db.orders.bulkPut([order('p1', 'pendingSync'), order('f1', 'syncFailed')]) })
    const button = await screen.findByRole('button', { name: 'Đơn chờ đồng bộ: 1 đơn lỗi' })
    await userEvent.click(button)
    expect(listener).toHaveBeenCalledTimes(1)
    window.removeEventListener('sync.panel.open-requested', listener)
  })

  it('reacts when pending order becomes synced', async () => {
    render(<PendingCounter />)
    await act(async () => { await db.orders.put(order('p1', 'pendingSync')) })
    expect(await screen.findByText('1 đơn chờ đồng bộ')).toBeInTheDocument()
    await act(async () => { await db.orders.update('p1', { status: 'synced' }) })
    await waitFor(() => expect(screen.getByText('0 đơn chờ')).toBeInTheDocument())
  })
})
