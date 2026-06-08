import { describe, expect, it } from 'vitest'
import type { LocalOrderRecord } from '../../db/schemas/orders'
import type { TableRecord, TableSessionRecord } from '../../db/schemas/tables'
import type { TableStatusRow } from './api'
import { deriveTableStatus, getStartOfTodayVietnamMs, toDisplayStatus } from './status-derivation'
import type { DerivedTableStatus } from './status-derivation'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTable(id: string): TableRecord {
  return { id, areaId: 'area-1', name: `Bàn ${id}`, capacity: 4, sortOrder: 1, isActive: true }
}

function makeOrder(
  overrides: Partial<LocalOrderRecord> = {},
): LocalOrderRecord {
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
    tableId: null,
    tableNameSnapshot: null,
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

    it('local SETTLED session wins over stale server open-count — bàn đã thanh toán về "empty" NGAY (bug-fix 2026-06-06)', () => {
      // Bug: server /tables/status còn báo openSessionCount=1 (settle chưa sync / cache 30s),
      // max(local=0, server=1)=1 → bàn kẹt "Đang phục vụ". Local đã settle → phải về empty ngay.
      const sessions = [makeSession('tbl-1', 'settled')]
      const serverStatus: TableStatusRow[] = [
        { tableId: 'tbl-1', status: 'occupied', activeOrderCount: 0, openSessionCount: 1, conflict: false },
      ]
      const result = deriveTableStatus({ tables, orders: [], sessions, serverStatus, now: NOW_VN })
      // openSessionCount=0 là điều quyết định display (toDisplayStatus → 'empty', không 'serving')
      expect(result.get('tbl-1')?.openSessionCount).toBe(0)
      expect(result.get('tbl-1')?.status).toBe('empty')
      expect(toDisplayStatus(makeTable('tbl-1'), result.get('tbl-1'))).toBe('empty')
    })

    it('local OPEN session still occupied even when server also reports open (no regression)', () => {
      const sessions = [makeSession('tbl-1', 'open')]
      const serverStatus: TableStatusRow[] = [
        { tableId: 'tbl-1', status: 'occupied', activeOrderCount: 0, openSessionCount: 1, conflict: false },
      ]
      const result = deriveTableStatus({ tables, orders: [], sessions, serverStatus, now: NOW_VN })
      expect(result.get('tbl-1')?.status).toBe('occupied')
      expect(result.get('tbl-1')?.openSessionCount).toBe(1)
    })

    it('re-opening a table after settle is occupied again (open record takes priority over settled)', () => {
      const sessions = [makeSession('tbl-1', 'settled'), makeSession('tbl-1', 'open')]
      const result = deriveTableStatus({ tables, orders: [], sessions, now: NOW_VN })
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

  describe('hasDraft (Story: split serving/opening by held draft)', () => {
    it('hasDraft=true only for tables in draftTableIds', () => {
      const sessions = [makeSession('tbl-1', 'open'), makeSession('tbl-2', 'open')]
      const result = deriveTableStatus({
        tables,
        orders: [],
        sessions,
        draftTableIds: new Set(['tbl-1']),
        now: NOW_VN,
      })
      expect(result.get('tbl-1')?.hasDraft).toBe(true)
      expect(result.get('tbl-2')?.hasDraft).toBe(false)
    })

    it('hasDraft defaults to false when draftTableIds not provided', () => {
      const result = deriveTableStatus({ tables, orders: [], sessions: [makeSession('tbl-1', 'open')], now: NOW_VN })
      expect(result.get('tbl-1')?.hasDraft).toBe(false)
    })
  })

  describe('order summary (orderTotal, itemCount, openedAt) for "Đang có đơn" card', () => {
    it('computes orderTotal (after discount) and itemCount from drafts', () => {
      const drafts = [
        {
          tableId: 'tbl-1',
          items: [
            { tempId: 'a', productId: 'p1', productNameSnapshot: 'Cà phê', unitPriceSnapshot: 30000, options: [], quantity: 2, lineTotal: 60000 },
            { tempId: 'b', productId: 'p2', productNameSnapshot: 'Trà', unitPriceSnapshot: 25000, options: [], quantity: 1, lineTotal: 25000 },
          ],
          discount: { type: 'fixed' as const, value: 5000 },
          updatedAt: NOW_VN.toISOString(),
        },
      ]
      const result = deriveTableStatus({ tables, orders: [], sessions: [makeSession('tbl-1', 'open')], drafts, now: NOW_VN })
      expect(result.get('tbl-1')?.orderTotal).toBe(80000) // 85000 - 5000
      expect(result.get('tbl-1')?.itemCount).toBe(3) // 2 + 1
      // hasDraft suy ra từ drafts khi draftTableIds không truyền
      expect(result.get('tbl-1')?.hasDraft).toBe(true)
      // bàn không có draft → 0
      expect(result.get('tbl-2')?.orderTotal).toBe(0)
      expect(result.get('tbl-2')?.itemCount).toBe(0)
    })

    it('applies percentage discount when computing orderTotal', () => {
      const drafts = [
        {
          tableId: 'tbl-1',
          items: [{ tempId: 'a', productId: 'p1', productNameSnapshot: 'X', unitPriceSnapshot: 100000, options: [], quantity: 1, lineTotal: 100000 }],
          discount: { type: 'percentage' as const, value: 10 },
          updatedAt: NOW_VN.toISOString(),
        },
      ]
      const result = deriveTableStatus({ tables, orders: [], sessions: [makeSession('tbl-1', 'open')], drafts, now: NOW_VN })
      expect(result.get('tbl-1')?.orderTotal).toBe(90000)
    })

    it('exposes earliest open-session openedAt', () => {
      const later = { ...makeSession('tbl-1', 'open'), openedAt: '2026-06-05T03:30:00.000Z' }
      const earlier = { ...makeSession('tbl-1', 'open'), openedAt: '2026-06-05T03:00:00.000Z' }
      const result = deriveTableStatus({ tables, orders: [], sessions: [later, earlier], now: NOW_VN })
      expect(result.get('tbl-1')?.openedAt).toBe('2026-06-05T03:00:00.000Z')
    })

    it('leaves openedAt undefined when no open session', () => {
      const result = deriveTableStatus({ tables, orders: [], sessions: [], now: NOW_VN })
      expect(result.get('tbl-1')?.openedAt).toBeUndefined()
    })
  })
})

// ---------------------------------------------------------------------------
// toDisplayStatus — Story 6.12 (AC4, AC5, AC9)
// ---------------------------------------------------------------------------

function makeDerived(overrides: Partial<DerivedTableStatus> = {}): DerivedTableStatus {
  return {
    tableId: 'tbl-1',
    status: 'empty',
    openSessionCount: 0,
    activeOrderCount: 0,
    conflict: false,
    pendingSync: false,
    hasDraft: false,
    orderTotal: 0,
    itemCount: 0,
    ...overrides,
  }
}

const activeTable: TableRecord = makeTable('tbl-1')
const inactiveTable: TableRecord = { ...makeTable('tbl-2'), isActive: false }

describe('toDisplayStatus — Story 6.12 (AC4, AC5, AC9)', () => {
  it('returns "inactive" when table.isActive=false, regardless of derived status', () => {
    expect(toDisplayStatus(inactiveTable, undefined)).toBe('inactive')
    expect(toDisplayStatus(inactiveTable, makeDerived({ conflict: true }))).toBe('inactive')
    expect(toDisplayStatus(inactiveTable, makeDerived({ openSessionCount: 1 }))).toBe('inactive')
  })

  it('returns "empty" when no derived data (table active, no Dexie derivation yet)', () => {
    expect(toDisplayStatus(activeTable, undefined)).toBe('empty')
  })

  it('returns "conflict" when derived.conflict=true (openSessionCount>1 — FR56)', () => {
    expect(toDisplayStatus(activeTable, makeDerived({ conflict: true, openSessionCount: 2 }))).toBe('conflict')
  })

  it('returns "empty" when only pendingSync=true (no open session) — đơn đã thanh toán chờ sync KHÔNG giữ bàn bận', () => {
    expect(toDisplayStatus(activeTable, makeDerived({ pendingSync: true }))).toBe('empty')
  })

  it('returns "serving" (Đang có đơn) when openSessionCount>0 AND hasDraft=true (phiên mở + đơn chưa thanh toán)', () => {
    expect(toDisplayStatus(activeTable, makeDerived({ openSessionCount: 1, hasDraft: true }))).toBe('serving')
  })

  it('returns "opening" (Đang mở) when openSessionCount>0 but hasDraft=false (phiên mở, chưa order/giữ bàn)', () => {
    expect(toDisplayStatus(activeTable, makeDerived({ openSessionCount: 1, hasDraft: false }))).toBe('opening')
  })

  it('returns "empty" when activeOrderCount>0 but openSessionCount=0 (đã thanh toán, bàn trả về trống — "Đã có đơn" đã bỏ)', () => {
    expect(toDisplayStatus(activeTable, makeDerived({ activeOrderCount: 1 }))).toBe('empty')
  })

  it('returns "empty" when all counts are 0', () => {
    expect(toDisplayStatus(activeTable, makeDerived())).toBe('empty')
  })

  // Priority tests — new order: inactive > conflict > serving > opening > empty
  // 'pending_sync' KHÔNG còn là display status: đơn đã thanh toán chờ sync không giữ bàn bận;
  // tình trạng sync được báo toàn cục (FR24), không per-table.
  it('conflict beats serving/opening (inactive > conflict > serving > opening > empty)', () => {
    expect(toDisplayStatus(activeTable, makeDerived({ conflict: true, openSessionCount: 2, hasDraft: true }))).toBe('conflict')
  })

  it('conflict beats pendingSync indicator', () => {
    expect(toDisplayStatus(activeTable, makeDerived({ conflict: true, pendingSync: true, openSessionCount: 2 }))).toBe('conflict')
  })

  it('serving (có draft) wins over pendingSync indicator (bàn có đơn vẫn chặn dù có đơn chờ sync)', () => {
    expect(toDisplayStatus(activeTable, makeDerived({ pendingSync: true, openSessionCount: 1, hasDraft: true }))).toBe('serving')
  })

  it('opening (chưa draft) vẫn hiển thị khi có pendingSync indicator (phiên mở chưa order)', () => {
    expect(toDisplayStatus(activeTable, makeDerived({ pendingSync: true, openSessionCount: 1, hasDraft: false }))).toBe('opening')
  })

  it('returns "empty" when pendingSync + activeOrderCount but NO open session — bàn đã thanh toán trả về trống ngay', () => {
    expect(toDisplayStatus(activeTable, makeDerived({ pendingSync: true, activeOrderCount: 1 }))).toBe('empty')
  })
})
