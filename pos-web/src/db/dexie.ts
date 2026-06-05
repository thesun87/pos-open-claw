import Dexie, { type Table } from 'dexie'
import type { SessionRecord } from '../features/auth/token-store-types'
import type {
  MenuCategoryRecord,
  MenuMetaRecord,
  MenuOptionGroupRecord,
  MenuOptionRecord,
  MenuProductRecord,
} from './schemas/menu'
import { ORDERS_SCHEMA, type LocalOrderRecord } from './schemas/orders'
import type { AreaRecord, StoreConfigRecord, TableRecord, TableSessionRecord } from './schemas/tables'

export class PosDexie extends Dexie {
  session!: Table<SessionRecord, string>
  orders!: Table<LocalOrderRecord, string>
  categories!: Table<MenuCategoryRecord, string>
  products!: Table<MenuProductRecord, string>
  optionGroups!: Table<MenuOptionGroupRecord, string>
  options!: Table<MenuOptionRecord, string>
  menuMeta!: Table<MenuMetaRecord, string>
  // Story 6.10 stores (version 4)
  // Note: 'tables' is a reserved property name on Dexie.prototype (returns Table[]).
  // The Dexie store is named 'posTables' to avoid the collision; index schema mirrors AC2.
  areas!: Table<AreaRecord, string>
  posTables!: Table<TableRecord, string>
  storeConfig!: Table<StoreConfigRecord, string>
  tableSessions!: Table<TableSessionRecord, string>

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
    this.version(3).stores({
      session: 'id, expiresAt, lastLoginAt',
      orders: ORDERS_SCHEMA,
      categories: 'id, isActive, sortOrder',
      products: 'id, categoryId, isActive, sortOrder',
      optionGroups: 'id, sortOrder',
      options: 'id, optionGroupId, sortOrder',
      menuMeta: 'id, menuVersion, lastPulledAt',
    })
    // Story 6.10 — table config offline cache + tableSessions read-shape.
    // Version 4 adds 4 new stores for floor-plan offline rendering.
    // Story 6.8 must use version 5 for its orders.tableId/tableNameSnapshot fields.
    this.version(4).stores({
      session: 'id, expiresAt, lastLoginAt',
      orders: ORDERS_SCHEMA,
      categories: 'id, isActive, sortOrder',
      products: 'id, categoryId, isActive, sortOrder',
      optionGroups: 'id, sortOrder',
      options: 'id, optionGroupId, sortOrder',
      menuMeta: 'id, menuVersion, lastPulledAt',
      // New stores (6.10) — 'tables' is a Dexie built-in property so we use 'posTables'
      areas: 'id, sortOrder',
      posTables: 'id, areaId, sortOrder',
      storeConfig: 'id',
      tableSessions: 'id, tableId, status, clientSessionId',
    })
    // Story 6.8: version 5 — orders thêm field tableId/tableNameSnapshot (plain fields, no index).
    // Phải liệt kê lại TẤT CẢ store (Dexie semantics). 4 store table-config dưới đây do Story 6.10 thêm ở v4.
    // tableId/tableNameSnapshot là optional null fields → KHÔNG cần upgrade callback (Dexie behavior: undefined cho record cũ).
    // Code phải handle `order.tableId ?? null` và `order.tableNameSnapshot ?? null`.
    this.version(5).stores({
      session: 'id, expiresAt, lastLoginAt',
      orders: ORDERS_SCHEMA,
      categories: 'id, isActive, sortOrder',
      products: 'id, categoryId, isActive, sortOrder',
      optionGroups: 'id, sortOrder',
      options: 'id, optionGroupId, sortOrder',
      menuMeta: 'id, menuVersion, lastPulledAt',
      areas: 'id, sortOrder',
      posTables: 'id, areaId, sortOrder',
      storeConfig: 'id',
      tableSessions: 'id, tableId, status, clientSessionId',
    })
  }
}

export const db = new PosDexie()
