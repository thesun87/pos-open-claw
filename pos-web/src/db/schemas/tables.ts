// Dexie record types for offline table config cache — Story 6.10
// These are the PARTIAL field shapes needed for offline floor-plan rendering.
// Full DTO types live in features/tables/api.ts; these are the Dexie mirror shapes.

export const STORE_CONFIG_ID = 'current' as const

export interface AreaRecord {
  id: string
  name: string
  sortOrder: number
  isActive: boolean
}

export interface TableRecord {
  id: string
  areaId: string
  name: string
  capacity: number
  sortOrder: number
  isActive: boolean
}

export interface StoreConfigRecord {
  id: typeof STORE_CONFIG_ID
  storeId: string
  name: string
  code: string
  tableMode: boolean
}

export type LocalTableSessionStatus = 'open' | 'settled' | 'voided' | 'superseded'

/**
 * TableSessionRecord mirrors the BE table_sessions entity for offline derivation.
 * Story 6.10 defines the READ shape + empty store; Story 6.8 writes open/settle entries.
 */
export interface TableSessionRecord {
  /** Server id (UUIDv7) when synced; local clientSessionId before sync (6.8 decides). */
  id: string
  tableId: string
  status: LocalTableSessionStatus
  /** UUIDv7 idempotency key — derivation counts distinct open sessions per tableId. */
  clientSessionId: string
  openedByDevice?: string
  openedAt?: string // ISO 8601 UTC
  /** 6.8 writes; 6.10 derivation reads for pendingSync detection. */
  syncStatus?: 'pendingSync' | 'synced'
}
