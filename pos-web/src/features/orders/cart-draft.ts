/**
 * Story 6.13: Per-table draft cart — single-device local persistence via Dexie.
 *
 * Design decisions (see story Dev Notes):
 * - draft keyed by tableId (PK) → 1 draft per table, upsert semantics.
 * - empty cart + saveTableDraft → clears draft (AC12: no meaningless empty drafts).
 * - tableId key is a plain string — KHÔNG import types from features/tables (boundary §8).
 * - Component KHÔNG gọi db.tableDrafts trực tiếp; qua các hàm này.
 * - Orchestration (khi nào save/load/clear) nằm ở route-level pos-shell.tsx.
 */

import { db } from '../../db/dexie'
import type { CartDiscount, CartItem } from './types'

export type DraftPayload = {
  items: CartItem[]
  discount: CartDiscount | null
}

/**
 * Save (upsert) the current cart as a draft for the given table.
 * If items is empty, clears the draft instead (AC12: no empty drafts).
 */
export async function saveTableDraft(tableId: string, payload: DraftPayload): Promise<void> {
  if (payload.items.length === 0) {
    await clearTableDraft(tableId)
    return
  }
  await db.tableDrafts.put({
    tableId,
    items: payload.items,
    discount: payload.discount,
    updatedAt: new Date().toISOString(),
  })
}

/**
 * Load draft for the given table.
 * Returns { items, discount } if a draft exists, null otherwise (AC5: no crash if missing).
 * Lazy cleanup: if table no longer exists in cache, caller should handle gracefully.
 */
export async function loadTableDraft(tableId: string): Promise<DraftPayload | null> {
  const record = await db.tableDrafts.get(tableId)
  if (!record) return null
  return { items: record.items, discount: record.discount }
}

/**
 * Clear draft for the given table (called on finalize, reset cart, cancel table).
 */
export async function clearTableDraft(tableId: string): Promise<void> {
  await db.tableDrafts.delete(tableId)
}
