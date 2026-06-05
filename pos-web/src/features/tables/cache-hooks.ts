/**
 * Offline-first cache read hooks — Story 6.10
 *
 * These hooks read from Dexie via useLiveQuery and are the OFFLINE-FIRST counterparts
 * to the online TanStack Query hooks in hooks.ts.
 *
 * When useLiveQuery returns undefined → still loading (render skeleton per project-context §5.F).
 * Component re-renders reactively whenever the Dexie store changes.
 *
 * Story 6.12 will wire these into floor-plan-view.tsx to replace the online-only hooks.
 * These hooks are ADDITIVE: online hooks in hooks.ts remain until 6.12 replaces them.
 *
 * Boundary §8: only Dexie access via features/tables; component reads via these hooks.
 */
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/dexie'
import type { AreaRecord, StoreConfigRecord, TableRecord } from '../../db/schemas/tables'

/**
 * Read all areas from cache, ordered by sortOrder.
 * Returns undefined while loading, empty array if no cache yet.
 */
export function useCachedAreas(): AreaRecord[] | undefined {
  return useLiveQuery(() => db.areas.orderBy('sortOrder').toArray())
}

/**
 * Read all tables from cache, ordered by sortOrder.
 * Returns undefined while loading, empty array if no cache yet.
 */
export function useCachedTables(): TableRecord[] | undefined {
  return useLiveQuery(() => db.posTables.orderBy('sortOrder').toArray())
}

/**
 * Read the singleton store config from cache (id = 'current').
 * Returns undefined while loading, null if no cache yet.
 */
export function useCachedStoreConfig(): StoreConfigRecord | null | undefined {
  return useLiveQuery(() => db.storeConfig.get('current').then((r) => r ?? null))
}

/**
 * Derive tableMode flag from cached storeConfig.
 * Returns false when loading or no cache (safe default for non-table-mode stores).
 */
export function useCachedTableMode(): boolean {
  const config = useCachedStoreConfig()
  return config?.tableMode ?? false
}
