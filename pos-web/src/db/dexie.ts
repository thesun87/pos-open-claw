import Dexie, { type Table } from 'dexie'
import type { SessionRecord } from '../features/auth/token-store-types'

export type PendingOrderPlaceholder = { id: string; createdAt: number }
export type MenuCachePlaceholder = { id: string; updatedAt: number }

export class PosDexie extends Dexie {
  session!: Table<SessionRecord, string>
  orders!: Table<PendingOrderPlaceholder, string>
  menu!: Table<MenuCachePlaceholder, string>

  constructor(name = 'pos-bmad') {
    super(name)
    this.version(1).stores({
      session: 'id, expiresAt, lastLoginAt',
      orders: 'id, createdAt',
      menu: 'id, updatedAt',
    })
  }
}

export const db = new PosDexie()
