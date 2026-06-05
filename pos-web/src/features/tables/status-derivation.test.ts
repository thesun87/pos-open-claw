import { describe, expect, it } from 'vitest'
import type { LocalOrderRecord } from '../../db/schemas/orders'
import type { TableRecord, TableSessionRecord } from '../../db/schemas/tables'
import type { TableStatusRow } from './api'
import { deriveTableStatus, getStartOfTodayVietnamMs } from './status-derivation'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTable(id: string): TableRecord {
  return { id, areaId: 'area-1', name: `Bàn ${id}`, capacity: 4, sortOrder: 1, isActive: true }
}

function makeOrder(
  overrides: Partial<LocalOrderRecord> & { tableId?: string } = {},
): LocalOrderRecord & { tableId?: string } {
  return {
    clientOrderId: `order-${Math.random()}`,
    orderCode: 'ORD001',
    deviceId: 'device-1',
    soldAt: new Date().toISOString(),
    menuVersionAtSale: 1,
    items: [],
    discountAmount: 0,
    total: 0,
    paymentMethod: 'cash',
    status: 'synced',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

function makeSession(tableId: string, status: TableSessionRecord['status'] = 'open'): TableSessionRecord {
  return {
    id: `session-${Math.random()}`,
    tableId,
    status,
    clientSessionId: `csid-${Math.random()}`,
    syncStatus: 'synced',
  }
}

// Today in Vietnam TZ (2026-06-05 per context → start of day VN = 2026-06-04T17:00:00Z)
// We pin a reference "now" for deterministic tests
const NOW_VN = new Date('2026-06-05T10:00:00+07:00') // 2026-06-05 10:00 VN → 03:00 UTC
const TODAY_VN_SOLDATAT = '2026-06-05T08:00:00+07:00' // 2026-06-05 08:00 VN → within today
const YESTERDAY_VN_SOLDATAT = '2026-06-04T08:00:00+07:00' // 2026-06-04 VN → yesterday

// ---------------------------------------------------------------------------
// getStartOfTodayVietnamMs
// ---------------------------------------------------------------------------

describe('getStartOfTodayVietnamMs', () => {
  it('returns the correct UTC millisecond for start of day in Vietnam TZ', () => {
    const startMs = getStartOfTodayVietnamMs(NOW_VN)
    const expected = new Date('2026-06-05T00:00:00+07:00').getTime()
    expect(startMs).toBe(expected)
  })
})

// ---------------------------------------------------------------------------
// deriveTableStatus — AC5 cases
// ---------------------------------------------------------------------------

describe('deriveTableStatus', () => {
  const tables = [makeTable('tbl-1'), makeTable('tbl-2')]

  it('returns empty for a table with no activity', () => {
    const result = deriveTableStatus({ tables, orders: [], sessions: [] })
    expect(result.get('tbl-1')?.status).toBe('empty')
    expect(result.get('tbl-1')?.openSessionCount).toBe(0)
    expect(result.get('tbl-1')?.activeOrderCount).toBe(0)
    expect(result.get('tbl-1')?.conflict).toBe(false)
    expect(result.get('tbl-1')?.pendingSync).toBe(false)
  })

  it('returns occupied when a local open session exists', () => {
    const sessions = [makeSession('tbl-1', 'open')]
    const result = deriveTableStatus({ tables, orders: [], sessions, now: NOW_VN })
    expect(result.get('tbl-1')?.status).toBe('occupied')
    expect(result.get('tbl-1')?.openSessionCount).toBe(1)
  })

  it('returns occupied from a non-void order today', () => {
    const orders = [makeOrder({ tableId: 'tbl-1', soldAt: TODAY_VN_SOLDATAT, status: 'synced' })]
    const result = deriveTableStatus({ tables, orders, sessions: [], now: NOW_VN })
    expect(result.get('tbl-1')?.status).toBe('occupied')
    expect(result.get('tbl-1')?.activeOrderCount).toBe(1)
  })

  it('does NOT count a yesterday order as occupied (today-boundary)', () => {
    const orders = [makeOrder({ tableId: 'tbl-1', soldAt: YESTERDAY_VN_SOLDATAT, status: 'synced' })]
    const result = deriveTableStatus({ tables, orders, sessions: [], now: NOW_VN })
    expect(result.get('tbl-1')?.status).toBe('empty')
    expect(result.get('tbl-1')?.activeOrderCount).toBe(0)
  })

  it('returns conflict when >= 2 open sessions exist for the same table', () => {
    const sessions = [makeSession('tbl-1', 'open'), makeSession('tbl-1', 'open')]
    const result = deriveTableStatus({ tables, orders: [], sessions, now: NOW_VN })
    expect(result.get('tbl-1')?.status).toBe('conflict')
    expect(result.get('tbl-1')?.conflict).toBe(true)
    expect(result.get('tbl-1')?.openSessionCount).toBe(2)
  })

  it('returns pending_sync when any order has status=pendingSync', () => {
    const orders = [makeOrder({ tableId: 'tbl-1', soldAt: TODAY_VN_SOLDATAT, status: 'pendingSync' })]
    const result = deriveTableStatus({ tables, orders, sessions: [], now: NOW_VN })
    expect(result.get('tbl-1')?.status).toBe('pending_sync')
    expect(result.get('tbl-1')?.pendingSync).toBe(true)
  })

  it('conflict beats pending_sync — highest priority wins', () => {
    const sessions = [makeSession('tbl-1', 'open'), makeSession('tbl-1', 'open')]
    const orders = [makeOrder({ tableId: 'tbl-1', soldAt: TODAY_VN_SOLDATAT, status: 'pendingSync' })]
    const result = deriveTableStatus({ tables, orders, sessions, now: NOW_VN })
    expect(result.get('tbl-1')?.status).toBe('conflict')
  })

  it('pending_sync beats occupied', () => {
    const sessions = [makeSession('tbl-1', 'open')]
    const orders = [makeOrder({ tableId: 'tbl-1', soldAt: TODAY_VN_SOLDATAT, status: 'pendingSync' })]
    const result = deriveTableStatus({ tables, orders, sessions, now: NOW_VN })
    expect(result.get('tbl-1')?.status).toBe('pending_sync')
  })

  it('does not count voided orders as active', () => {
    const orders = [makeOrder({ tableId: 'tbl-1', soldAt: TODAY_VN_SOLDATAT, status: 'synced', voidedAt: new Date().toISOString() })]
    const result = deriveTableStatus({ tables, orders, sessions: [], now: NOW_VN })
    expect(result.get('tbl-1')?.status).toBe('empty')
    expect(result.get('tbl-1')?.activeOrderCount).toBe(0)
  })

  it('orders without tableId are ignored', () => {
    const orders = [makeOrder({ soldAt: TODAY_VN_SOLDATAT, status: 'synced' })] // no tableId
    const result = deriveTableStatus({ tables, orders, sessions: [], now: NOW_VN })
    expect(result.get('tbl-1')?.status).toBe('empty')
  })

  it('settled sessions do not count as open', () => {
    const sessions = [makeSession('tbl-1', 'settled')]
    const result = deriveTableStatus({ tables, orders: [], sessions, now: NOW_VN })
    expect(result.get('tbl-1')?.status).toBe('empty')
    expect(result.get('tbl-1')?.openSessionCount).toBe(0)
  })

  // ---------------------------------------------------------------------------
  // AC6 — Online merge cases
  // ---------------------------------------------------------------------------

  describe('online-merge (AC6)', () => {
    it('unions server occupied with local — table is occupied when server says occupied', () => {
      const serverStatus: TableStatusRow[] = [
        { tableId: 'tbl-2', status: 'occupied', activeOrderCount: 1, openSessionCount: 1, conflict: false },
      ]
      const result = deriveTableStatus({ tables, orders: [], sessions: [], serverStatus, now: NOW_VN })
      // tbl-2 is locally empty but server says occupied → union = occupied
      expect(result.get('tbl-2')?.status).toBe('occupied')
      expect(result.get('tbl-2')?.openSessionCount).toBe(1)
      expect(result.get('tbl-2')?.activeOrderCount).toBe(1)
    })

    it('server conflict flag is honoured in online-merge', () => {
      const serverStatus: TableStatusRow[] = [
        { tableId: 'tbl-1', status: 'occupied', activeOrderCount: 0, openSessionCount: 2, conflict: true },
      ]
      const result = deriveTableStatus({ tables, orders: [], sessions: [], serverStatus, now: NOW_VN })
      expect(result.get('tbl-1')?.status).toBe('conflict')
      expect(result.get('tbl-1')?.conflict).toBe(true)
    })

    it('does NOT overwrite local pendingSync with server empty status (AC6)', () => {
      // Local has pendingSync; server says empty — local pending must win
      const orders = [makeOrder({ tableId: 'tbl-1', soldAt: TODAY_VN_SOLDATAT, status: 'pendingSync' })]
      const serverStatus: TableStatusRow[] = [
        { tableId: 'tbl-1', status: 'empty', activeOrderCount: 0, openSessionCount: 0, conflict: false },
      ]
      const result = deriveTableStatus({ tables, orders, sessions: [], serverStatus, now: NOW_VN })
      expect(result.get('tbl-1')?.status).toBe('pending_sync')
      expect(result.get('tbl-1')?.pendingSync).toBe(true)
    })

    it('does NOT overwrite local open session with server empty (AC6)', () => {
      const sessions = [makeSession('tbl-1', 'open')]
      const serverStatus: TableStatusRow[] = [
        { tableId: 'tbl-1', status: 'empty', activeOrderCount: 0, openSessionCount: 0, conflict: false },
      ]
      const result = deriveTableStatus({ tables, orders: [], sessions, serverStatus, now: NOW_VN })
      expect(result.get('tbl-1')?.status).toBe('occupied')
      expect(result.get('tbl-1')?.openSessionCount).toBe(1)
    })

    it('when serverStatus is undefined (offline), only uses local data', () => {
      const sessions = [makeSession('tbl-1', 'open')]
      const result = deriveTableStatus({ tables, orders: [], sessions, now: NOW_VN })
      expect(result.get('tbl-1')?.status).toBe('occupied')
    })

    it('returns all tables in map, even with no server data', () => {
      const result = deriveTableStatus({ tables, orders: [], sessions: [] })
      expect(result.size).toBe(2)
      expect(result.has('tbl-1')).toBe(true)
      expect(result.has('tbl-2')).toBe(true)
    })
  })
})
