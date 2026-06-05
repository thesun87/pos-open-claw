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
 * @param now          Injectable clock (default: new Date()) for today-boundary testing
 * @returns Map<tableId, DerivedTableStatus>
 */
export function deriveTableStatus({
  tables,
  orders,
  sessions,
  serverStatus,
  now = new Date(),
}: {
  tables: TableRecord[]
  orders: LocalOrderRecord[]
  sessions: TableSessionRecord[]
  serverStatus?: TableStatusRow[]
  now?: Date
}): Map<string, DerivedTableStatus> {
  const startOfTodayMs = getStartOfTodayVietnamMs(now)

  // Index local open sessions by tableId
  const openSessionsByTable = new Map<string, number>()
  for (const session of sessions) {
    if (session.status === 'open') {
      openSessionsByTable.set(session.tableId, (openSessionsByTable.get(session.tableId) ?? 0) + 1)
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

    // tableId field — only present when Story 6.8 has been implemented; skip orders without it
    const tableId = (order as LocalOrderRecord & { tableId?: string }).tableId
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
    const localActiveOrders = activeOrdersByTable.get(tableId) ?? 0
    const hasPendingSync = pendingSyncByTable.has(tableId)

    // Online-merge: union server occupancy with local (AC6)
    // Server data enhances local — does NOT overwrite local pendingSync or open sessions
    const serverRow = serverByTable.get(tableId)
    const serverOpenSessions = serverRow?.openSessionCount ?? 0
    const serverActiveOrders = serverRow?.activeOrderCount ?? 0
    const serverConflict = serverRow?.conflict ?? false

    // Union: take the max of local and server counts
    const mergedOpenSessions = Math.max(localOpenSessions, serverOpenSessions)
    const mergedActiveOrders = Math.max(localActiveOrders, serverActiveOrders)
    const mergedConflict = serverConflict || localOpenSessions >= 2

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
    const [tables, orders, sessions] = await Promise.all([
      db.posTables.toArray(),
      db.orders.toArray(),
      db.tableSessions.toArray(),
    ])
    return deriveTableStatus({ tables, orders, sessions, ...(serverStatus !== undefined ? { serverStatus } : {}) })
  }, [serverStatus])
}

/**
 * Convert a TableRecord + DerivedTableStatus into a richer TableDisplayStatus for UI floor-plan.
 *
 * Priority order (highest first):
 *   inactive > conflict > pending_sync > serving > occupied > empty
 *
 * Note: deriveTableStatus doesn't distinguish serving vs occupied (both are 'occupied' internally).
 * This helper uses openSessionCount/activeOrderCount to make that distinction for the floor-plan UI.
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
  // 3. pending_sync (any order waiting to sync)
  if (derived.pendingSync) return 'pending_sync'
  // 4. serving (an open session exists — cashier currently at the table)
  if (derived.openSessionCount > 0) return 'serving'
  // 5. occupied (order today, no open session — synced/closed session remains)
  if (derived.activeOrderCount > 0) return 'occupied'
  // 6. empty
  return 'empty'
}
