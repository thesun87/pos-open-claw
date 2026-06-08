/**
 * Local table status derivation — Story 6.10
 *
 * Derives occupancy status for each table from local Dexie data (orders + tableSessions).
 * Online server data (/tables/status from BE 6.11) is an ENHANCEMENT — unioned with local,
 * never overwriting local pendingSync or open sessions.
 *
 * Priority order (highest first):
 *   conflict > pending_sync > occupied > empty
 *
 * Boundary §8: pure function accepts plain arrays — no Dexie dependency in this module.
 * The hook useLocalTableStatus wires useLiveQuery and calls deriveTableStatus.
 */
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/dexie'
import type { LocalOrderRecord } from '../../db/schemas/orders'
import type { TableRecord, TableSessionRecord } from '../../db/schemas/tables'
import { formatYmdInVietnam } from '../../shared/lib/date'
import type { TableDisplayStatus, TableStatusRow } from './api'

export type DerivedOccupancyStatus = 'empty' | 'occupied' | 'conflict' | 'pending_sync'

export interface DerivedTableStatus {
  tableId: string
  /** Derived status — priority: conflict > pending_sync > occupied > empty */
  status: DerivedOccupancyStatus
  /** Count of local open sessions for this table */
  openSessionCount: number
  /** Count of non-void orders today (local) */
  activeOrderCount: number
  /** True when openSessionCount >= 2 (offline double-open — FR56) */
  conflict: boolean
  /** True when any order for this table has status=pendingSync */
  pendingSync: boolean
  /**
   * True when this device holds an unpaid order tied to the table — i.e. a per-table draft
   * cart with items (Story 6.13 tableDrafts). In this POS, finalized orders are always PAID
   * (created only at checkout), so the only "đơn hàng chưa thanh toán gắn với bàn" is the held
   * draft. Used to split an open session into "Đang có đơn" (hasDraft) vs "Đang mở" (no draft).
   * Drafts are single-device/local (not synced) → false for cross-device opens (Epic 7).
   */
  hasDraft: boolean
}

/**
 * Start of today in Vietnam timezone, as UTC timestamp ms.
 * Orders with soldAt >= this timestamp (in ISO 8601 UTC string) count as "today".
 */
export function getStartOfTodayVietnamMs(now: Date = new Date()): number {
  const todayYmd = formatYmdInVietnam(now)
  // Parse as UTC midnight of the VN date — consistent with BE which uses Asia/Ho_Chi_Minh boundary
  return new Date(`${todayYmd}T00:00:00+07:00`).getTime()
}

/**
 * Pure function — derive occupancy status for all tables.
 *
 * @param tables       All table records (needed to return empty status for tables with no activity)
 * @param orders       All local order records (for today boundary + pendingSync check)
 * @param sessions     All local table session records
 * @param serverStatus Optional array from /tables/status (BE 6.11) for cross-device online merge
 * @param draftTableIds Optional set of tableIds that have a local per-table draft (Story 6.13).
 *                      A draft means an unpaid order is held against the table → "Đang có đơn".
 * @param now          Injectable clock (default: new Date()) for today-boundary testing
 * @returns Map<tableId, DerivedTableStatus>
 */
export function deriveTableStatus({
  tables,
  orders,
  sessions,
  serverStatus,
  draftTableIds,
  now = new Date(),
}: {
  tables: TableRecord[]
  orders: LocalOrderRecord[]
  sessions: TableSessionRecord[]
  serverStatus?: TableStatusRow[]
  draftTableIds?: Set<string>
  now?: Date
}): Map<string, DerivedTableStatus> {
  const startOfTodayMs = getStartOfTodayVietnamMs(now)

  // Index local sessions by tableId — track both open and settled counts.
  // settledSessionsByTable lets us know which tables THIS device has explicitly released:
  // a settled session means the cashier finished/paid the table locally, so the table is free
  // here regardless of what the (possibly stale) server /tables/status still reports.
  const openSessionsByTable = new Map<string, number>()
  const settledSessionsByTable = new Map<string, number>()
  for (const session of sessions) {
    if (session.status === 'open') {
      openSessionsByTable.set(session.tableId, (openSessionsByTable.get(session.tableId) ?? 0) + 1)
    } else if (session.status === 'settled') {
      settledSessionsByTable.set(session.tableId, (settledSessionsByTable.get(session.tableId) ?? 0) + 1)
    }
  }

  // Index today's non-void orders by tableId
  const activeOrdersByTable = new Map<string, number>()
  const pendingSyncByTable = new Set<string>()

  for (const order of orders) {
    // Determine the relevant timestamp: synced orders use syncedAt, local pending use soldAt
    const timestampStr = order.status === 'synced' ? (order.syncedAt ?? order.soldAt) : order.soldAt
    const orderMs = timestampStr ? new Date(timestampStr).getTime() : 0
    const isToday = orderMs >= startOfTodayMs

    // tableId field — null for counter-mode orders; skip those
    const tableId = order.tableId
    if (!tableId) continue

    const isVoided = Boolean(order.voidedAt)

    if (isToday && !isVoided) {
      activeOrdersByTable.set(tableId, (activeOrdersByTable.get(tableId) ?? 0) + 1)
    }

    if (order.status === 'pendingSync' && !isVoided && tableId) {
      pendingSyncByTable.add(tableId)
    }
  }

  // Build server lookup for online-merge (union, not replace)
  const serverByTable = new Map<string, TableStatusRow>()
  if (serverStatus) {
    for (const row of serverStatus) {
      serverByTable.set(row.tableId, row)
    }
  }

  const result = new Map<string, DerivedTableStatus>()

  for (const table of tables) {
    const { id: tableId } = table
    const localOpenSessions = openSessionsByTable.get(tableId) ?? 0
    const localSettledSessions = settledSessionsByTable.get(tableId) ?? 0
    const localActiveOrders = activeOrdersByTable.get(tableId) ?? 0
    const hasPendingSync = pendingSyncByTable.has(tableId)

    // Online-merge with local authority (AC6 + bug-fix 2026-06-06):
    // The server /tables/status still counts a session as open until this device's "settle" syncs
    // (sessionSyncEngine pass 2) AND the next 30s poll refreshes. Taking max(local, server)
    // therefore kept a just-paid table stuck on "Đang phục vụ" until that round-trip completed.
    //
    // Local is authoritative for tables this device has touched:
    //   - localOpenSessions > 0  → this device has it open now → occupied (max with server).
    //   - localSettledSessions>0 → this device RELEASED it → free here immediately; ignore the
    //                              stale server open-count (no flicker: settled records persist).
    //   - no local session       → trust server (cross-device discovery — AC6 union preserved).
    const serverRow = serverByTable.get(tableId)
    const serverOpenSessions = serverRow?.openSessionCount ?? 0
    const serverActiveOrders = serverRow?.activeOrderCount ?? 0
    const serverConflict = serverRow?.conflict ?? false

    let mergedOpenSessions: number
    let mergedConflict: boolean
    if (localOpenSessions > 0) {
      mergedOpenSessions = Math.max(localOpenSessions, serverOpenSessions)
      mergedConflict = serverConflict || localOpenSessions >= 2
    } else if (localSettledSessions > 0) {
      // Released locally — do not let a stale server open-count resurrect "serving".
      mergedOpenSessions = 0
      mergedConflict = false
    } else {
      mergedOpenSessions = serverOpenSessions
      mergedConflict = serverConflict
    }
    const mergedActiveOrders = Math.max(localActiveOrders, serverActiveOrders)

    const isOccupied = mergedOpenSessions > 0 || mergedActiveOrders > 0

    // Priority order: conflict > pending_sync > occupied > empty
    let status: DerivedOccupancyStatus
    if (mergedConflict) {
      status = 'conflict'
    } else if (hasPendingSync) {
      status = 'pending_sync'
    } else if (isOccupied) {
      status = 'occupied'
    } else {
      status = 'empty'
    }

    result.set(tableId, {
      tableId,
      status,
      openSessionCount: mergedOpenSessions,
      activeOrderCount: mergedActiveOrders,
      conflict: mergedConflict,
      pendingSync: hasPendingSync,
      hasDraft: draftTableIds?.has(tableId) ?? false,
    })
  }

  return result
}

/**
 * Reactive hook — derives occupancy for all tables using local Dexie data.
 * Optionally accepts serverStatus for online-merge when connected.
 *
 * Returns undefined while Dexie is loading (render skeleton).
 * Re-renders reactively when db.orders, db.tableSessions, or db.tables change.
 *
 * Usage:
 *   const statusMap = useLocalTableStatus(serverStatus)
 *   const tableStatus = statusMap?.get(tableId)
 */
export function useLocalTableStatus(serverStatus?: TableStatusRow[]): Map<string, DerivedTableStatus> | undefined {
  return useLiveQuery(async () => {
    const [tables, orders, sessions, drafts] = await Promise.all([
      db.posTables.toArray(),
      db.orders.toArray(),
      db.tableSessions.toArray(),
      db.tableDrafts.toArray(),
    ])
    // A draft record always means held items (saveTableDraft clears empty carts — Story 6.13).
    const draftTableIds = new Set(drafts.map((d) => d.tableId))
    return deriveTableStatus({ tables, orders, sessions, draftTableIds, ...(serverStatus !== undefined ? { serverStatus } : {}) })
  }, [serverStatus])
}

/**
 * Convert a TableRecord + DerivedTableStatus into a richer TableDisplayStatus for UI floor-plan.
 *
 * Priority order (highest first):
 *   inactive > conflict > serving > opening > empty
 *
 * Hành vi:
 *  - Bàn chỉ "bận" khi đang có phiên mở (openSessionCount > 0) — cashier đang thao tác trên bàn.
 *    Phiên mở được tách làm 2 trạng thái theo việc có đơn hàng (draft) gắn với bàn hay chưa:
 *      • 'serving'  → "Đang có đơn": phiên mở + có draft (đơn chưa thanh toán) giữ ở bàn — cashier
 *                     đã bấm "Giữ bàn"/đang phục vụ đơn của bàn.
 *      • 'opening'  → "Đang mở": phiên mở nhưng CHƯA có draft nào — cashier vừa chọn bàn trống mà
 *                     chưa order xong (chưa bấm "Giữ bàn"), hoặc phiên mở từ máy khác (cross-device).
 *  - Khi thanh toán xong, phiên được settle (openSessionCount = 0) → bàn về 'empty' NGAY để lên đơn mới,
 *    BẤT KỂ trong ngày đã có bao nhiêu đơn (activeOrderCount) HAY đơn vừa tạo còn chờ đồng bộ (pendingSync).
 *  - Một đơn pendingSync luôn là đơn ĐÃ thanh toán (orders chỉ tạo lúc finalize) → KHÔNG giữ bàn bận.
 *    Tình trạng đồng bộ được báo toàn cục (FR24), không per-table — nên không có nhánh 'pending_sync' ở đây.
 *
 * @param table   The table record (needed for isActive check)
 * @param derived Optional DerivedTableStatus for this table. Undefined means no derivation data yet.
 * @returns       TableDisplayStatus for use in floor-plan rendering
 */
export function toDisplayStatus(
  table: TableRecord,
  derived: DerivedTableStatus | undefined,
): TableDisplayStatus {
  // 1. inactive beats everything
  if (!table.isActive) return 'inactive'
  // If no derived data yet, treat as empty
  if (!derived) return 'empty'
  // 2. conflict (openSessionCount > 1 — FR56)
  if (derived.conflict) return 'conflict'
  // 3. open session — split by whether an unpaid order (draft) is held against the table:
  //    has draft → 'serving' ("Đang có đơn"); no draft → 'opening' ("Đang mở").
  if (derived.openSessionCount > 0) return derived.hasDraft ? 'serving' : 'opening'
  // 4. empty — no open session. Neither an order today (activeOrderCount) nor an unsynced paid
  //    order (pendingSync) marks the table as occupied: a paid table is free immediately.
  return 'empty'
}
