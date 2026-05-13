import Dexie, { type Table } from 'dexie'
import type { SessionRecord } from '../features/auth/token-store-types'
import type {
  MenuCategoryRecord,
  MenuMetaRecord,
  MenuOptionGroupRecord,
  MenuOptionRecord,
  MenuProductRecord,
} from './schemas/menu'

export type PendingOrderPlaceholder = { id: string; createdAt: number; deviceId?: string; soldAt?: string }

export class PosDexie extends Dexie {
  session!: Table<SessionRecord, string>
  orders!: Table<PendingOrderPlaceholder, string>
  categories!: Table<MenuCategoryRecord, string>
  products!: Table<MenuProductRecord, string>
  optionGroups!: Table<MenuOptionGroupRecord, string>
  options!: Table<MenuOptionRecord, string>
  menuMeta!: Table<MenuMetaRecord, string>

  constructor(name = 'pos-bmad') {
    super(name)
    this.version(1).stores({
      session: 'id, expiresAt, lastLoginAt',
      orders: 'id, createdAt',
      menu: 'id, updatedAt',
    })
    this.version(2).stores({
      session: 'id, expiresAt, lastLoginAt',
      orders: 'id, createdAt',
      menu: null,
      categories: 'id, isActive, sortOrder',
      products: 'id, categoryId, isActive, sortOrder',
      optionGroups: 'id, sortOrder',
      options: 'id, optionGroupId, sortOrder',
      menuMeta: 'id, menuVersion, lastPulledAt',
    })
  }
}

export const db = new PosDexie()
