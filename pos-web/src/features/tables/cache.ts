/**
 * Table config offline cache — Story 6.10
 *
 * Mirrors the menu cache pattern (features/menu/sync.ts):
 *   writeTableConfigSnapshot → pullTableConfig → triggerTableConfigPull → installTableConfigOnlineRecovery
 *
 * Best-effort: all network errors are swallowed; NEVER block boot.
 * Boundary §8: only accessed from features/tables/* and the session-boot-provider (composition layer).
 */
import type { PosDexie } from '../../db/dexie'
import { db as defaultDb } from '../../db/dexie'
import { STORE_CONFIG_ID } from '../../db/schemas/tables'
import {
  fetchAreas as defaultFetchAreas,
  fetchStoreMe as defaultFetchStoreMe,
  fetchTables as defaultFetchTables,
  type AreaDto,
  type StoreMeDto,
  type TableDto,
} from './api'

export interface TableConfigSnapshot {
  areas: AreaDto[]
  tables: TableDto[]
  store: StoreMeDto
}

/**
 * Atomically clear and replace the areas/tables/storeConfig caches.
 * Mirror of writeMenuSnapshot — clear then bulkPut inside a read-write transaction.
 */
export async function writeTableConfigSnapshot(
  snapshot: TableConfigSnapshot,
  database: PosDexie = defaultDb,
): Promise<void> {
  await database.transaction('rw', [database.areas, database.posTables, database.storeConfig], async () => {
    await Promise.all([database.areas.clear(), database.posTables.clear()])
    const areaRecords = snapshot.areas.map(({ id, name, sortOrder, isActive }) => ({ id, name, sortOrder, isActive }))
    const tableRecords = snapshot.tables.map(({ id, areaId, name, capacity, sortOrder, isActive }) => ({
      id,
      areaId,
      name,
      capacity,
      sortOrder,
      isActive,
    }))
    await Promise.all([
      database.areas.bulkPut(areaRecords),
      database.posTables.bulkPut(tableRecords),
      database.storeConfig.put({
        id: STORE_CONFIG_ID,
        storeId: snapshot.store.id,
        name: snapshot.store.name,
        code: snapshot.store.code,
        tableMode: snapshot.store.tableMode,
      }),
    ])
  })
}

/**
 * Pull table config from server and write to cache.
 * Optional: skip areas/tables if store.tableMode === false (AC7) — configurable via skipNonTableMode.
 */
export async function pullTableConfig({
  database = defaultDb,
  fetchAreas = defaultFetchAreas,
  fetchTables = defaultFetchTables,
  fetchStoreMe = defaultFetchStoreMe,
  skipNonTableMode = false,
}: {
  database?: PosDexie
  fetchAreas?: () => Promise<AreaDto[]>
  fetchTables?: () => Promise<TableDto[]>
  fetchStoreMe?: () => Promise<StoreMeDto>
  skipNonTableMode?: boolean
} = {}): Promise<void> {
  const store = await fetchStoreMe()

  // AC7: optionally skip areas/tables for non-table-mode stores
  if (skipNonTableMode && !store.tableMode) {
    // Still persist storeConfig so tableMode is readable offline
    await database.storeConfig.put({
      id: STORE_CONFIG_ID,
      storeId: store.id,
      name: store.name,
      code: store.code,
      tableMode: store.tableMode,
    })
    return
  }

  const [areas, tables] = await Promise.all([fetchAreas(), fetchTables()])
  await writeTableConfigSnapshot({ areas, tables, store }, database)
}

let pullInFlight: Promise<void> | null = null

/**
 * Guard-and-dedupe trigger, mirroring triggerMenuPull.
 * Returns null when offline or unauthenticated (safe to ignore).
 * Best-effort: caller must .catch(() => {}) the returned promise if needed.
 */
export function triggerTableConfigPull(
  options: {
    isOnline?: () => boolean
    isAuthenticated?: () => boolean
    pull?: () => Promise<unknown>
  } = {},
): Promise<void> | null {
  const isOnline = options.isOnline ?? (() => navigator.onLine)
  const isAuthenticated = options.isAuthenticated ?? (() => true)
  const pull = options.pull ?? (() => pullTableConfig())
  if (!isOnline() || !isAuthenticated()) return null
  if (pullInFlight) return pullInFlight
  pullInFlight = (async () => {
    try {
      await pull()
    } finally {
      pullInFlight = null
    }
  })()
  return pullInFlight
}

/**
 * Register an 'online' event listener to re-pull table config on connectivity restore.
 * Mirror of installMenuOnlineRecovery. Returns a cleanup function (call on unmount).
 */
export function installTableConfigOnlineRecovery(
  options: {
    isOnline?: () => boolean
    isAuthenticated?: () => boolean
    pull?: () => Promise<unknown>
  } = {},
): () => void {
  const onOnline = () => {
    void triggerTableConfigPull(options)?.catch(() => undefined)
  }
  window.addEventListener('online', onOnline)
  return () => window.removeEventListener('online', onOnline)
}
