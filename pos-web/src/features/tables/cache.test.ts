import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PosDexie } from '../../db/dexie'
import { STORE_CONFIG_ID } from '../../db/schemas/tables'
import {
  installTableConfigOnlineRecovery,
  pullTableConfig,
  triggerTableConfigPull,
  writeTableConfigSnapshot,
  type TableConfigSnapshot,
} from './cache'

const snapshot: TableConfigSnapshot = {
  store: { id: 'store-1', name: 'Quán Cà Phê', code: 'CF01', tableMode: true, createdAt: '', updatedAt: '' },
  areas: [
    { id: 'area-1', name: 'Tầng 1', sortOrder: 1, isActive: true, createdAt: '', updatedAt: '' },
    { id: 'area-2', name: 'Tầng 2', sortOrder: 2, isActive: true, createdAt: '', updatedAt: '' },
  ],
  tables: [
    { id: 'tbl-1', areaId: 'area-1', name: 'Bàn 1', capacity: 4, sortOrder: 1, isActive: true, createdAt: '', updatedAt: '' },
    { id: 'tbl-2', areaId: 'area-1', name: 'Bàn 2', capacity: 2, sortOrder: 2, isActive: true, createdAt: '', updatedAt: '' },
  ],
}

let databases: PosDexie[] = []
function createDb() {
  const database = new PosDexie(`table-cache-test-${crypto.randomUUID()}`)
  databases.push(database)
  return database
}

afterEach(async () => {
  vi.restoreAllMocks()
  await Promise.all(
    databases.map(async (database) => {
      await database.delete()
      database.close()
    }),
  )
  databases = []
})

describe('writeTableConfigSnapshot', () => {
  it('writes areas, tables, and storeConfig correctly', async () => {
    const database = createDb()
    await writeTableConfigSnapshot(snapshot, database)

    const areas = await database.areas.toArray()
    expect(areas).toHaveLength(2)
    expect(areas[0]).toMatchObject({ id: 'area-1', name: 'Tầng 1', sortOrder: 1, isActive: true })
    // Ensure DTO-only fields (createdAt/updatedAt) are NOT stored
    expect(areas[0]).not.toHaveProperty('createdAt')
    expect(areas[0]).not.toHaveProperty('updatedAt')

    const tables = await database.posTables.toArray()
    expect(tables).toHaveLength(2)
    expect(tables[0]).toMatchObject({ id: 'tbl-1', areaId: 'area-1', name: 'Bàn 1', capacity: 4 })

    const config = await database.storeConfig.get(STORE_CONFIG_ID)
    expect(config).toMatchObject({
      id: STORE_CONFIG_ID,
      storeId: 'store-1',
      name: 'Quán Cà Phê',
      code: 'CF01',
      tableMode: true,
    })
  })

  it('clears old data before writing new snapshot', async () => {
    const database = createDb()
    await writeTableConfigSnapshot(snapshot, database)

    // Write a new snapshot with fewer areas
    const updatedSnapshot: TableConfigSnapshot = {
      ...snapshot,
      areas: [{ id: 'area-new', name: 'Khu Ngoài Trời', sortOrder: 1, isActive: true, createdAt: '', updatedAt: '' }],
    }
    await writeTableConfigSnapshot(updatedSnapshot, database)

    const areas = await database.areas.toArray()
    expect(areas).toHaveLength(1)
    expect(areas[0]?.id).toBe('area-new')
  })
})

describe('pullTableConfig', () => {
  it('fetches from all 3 endpoints and writes to cache', async () => {
    const database = createDb()
    const fetchAreas = vi.fn().mockResolvedValue(snapshot.areas)
    const fetchTables = vi.fn().mockResolvedValue(snapshot.tables)
    const fetchStoreMe = vi.fn().mockResolvedValue(snapshot.store)

    await pullTableConfig({ database, fetchAreas, fetchTables, fetchStoreMe })

    expect(fetchAreas).toHaveBeenCalledTimes(1)
    expect(fetchTables).toHaveBeenCalledTimes(1)
    expect(fetchStoreMe).toHaveBeenCalledTimes(1)

    await expect(database.areas.count()).resolves.toBe(2)
    await expect(database.posTables.count()).resolves.toBe(2)
    await expect(database.storeConfig.get(STORE_CONFIG_ID)).resolves.toMatchObject({ tableMode: true })
  })

  it('still writes storeConfig when skipNonTableMode=true and tableMode=false', async () => {
    const database = createDb()
    const nonTableStore = { ...snapshot.store, tableMode: false }
    const fetchStoreMe = vi.fn().mockResolvedValue(nonTableStore)
    const fetchAreas = vi.fn()
    const fetchTables = vi.fn()

    await pullTableConfig({ database, fetchAreas, fetchTables, fetchStoreMe, skipNonTableMode: true })

    expect(fetchAreas).not.toHaveBeenCalled()
    expect(fetchTables).not.toHaveBeenCalled()

    const config = await database.storeConfig.get(STORE_CONFIG_ID)
    expect(config).toMatchObject({ tableMode: false })
  })

  it('still pulls areas/tables when skipNonTableMode=true but tableMode=true', async () => {
    const database = createDb()
    const fetchAreas = vi.fn().mockResolvedValue(snapshot.areas)
    const fetchTables = vi.fn().mockResolvedValue(snapshot.tables)
    const fetchStoreMe = vi.fn().mockResolvedValue(snapshot.store)

    await pullTableConfig({ database, fetchAreas, fetchTables, fetchStoreMe, skipNonTableMode: true })

    expect(fetchAreas).toHaveBeenCalledTimes(1)
    expect(fetchTables).toHaveBeenCalledTimes(1)
  })
})

describe('triggerTableConfigPull', () => {
  it('returns null when offline', () => {
    const pull = vi.fn().mockResolvedValue(undefined)
    const result = triggerTableConfigPull({ isOnline: () => false, pull })
    expect(result).toBeNull()
    expect(pull).not.toHaveBeenCalled()
  })

  it('returns null when unauthenticated', () => {
    const pull = vi.fn().mockResolvedValue(undefined)
    const result = triggerTableConfigPull({ isOnline: () => true, isAuthenticated: () => false, pull })
    expect(result).toBeNull()
    expect(pull).not.toHaveBeenCalled()
  })

  it('calls pull when online and authenticated', async () => {
    const pull = vi.fn().mockResolvedValue(undefined)
    await triggerTableConfigPull({ isOnline: () => true, isAuthenticated: () => true, pull })
    expect(pull).toHaveBeenCalledTimes(1)
  })

  it('deduplicates in-flight pulls', async () => {
    let resolve!: () => void
    const pull = vi.fn(() => new Promise<void>((r) => { resolve = r }))

    const first = triggerTableConfigPull({ isOnline: () => true, pull })
    const second = triggerTableConfigPull({ isOnline: () => true, pull })
    expect(first).toBe(second)
    expect(pull).toHaveBeenCalledTimes(1)
    resolve()
    await first
  })

  it('does not swallow errors — propagates to caller', async () => {
    const pull = vi.fn().mockRejectedValue(new Error('network'))
    await expect(triggerTableConfigPull({ isOnline: () => true, pull })).rejects.toThrow('network')
  })
})

describe('installTableConfigOnlineRecovery', () => {
  it('calls pull when online event fires', () => {
    const pull = vi.fn().mockResolvedValue(undefined)
    const cleanup = installTableConfigOnlineRecovery({ isOnline: () => true, pull })

    window.dispatchEvent(new Event('online'))
    cleanup()

    expect(pull).toHaveBeenCalledTimes(1)
  })

  it('removes listener after cleanup — no further calls', () => {
    const pull = vi.fn().mockResolvedValue(undefined)
    const cleanup = installTableConfigOnlineRecovery({ isOnline: () => true, pull })

    window.dispatchEvent(new Event('online'))
    cleanup()
    window.dispatchEvent(new Event('online'))

    expect(pull).toHaveBeenCalledTimes(1)
  })

  it('does not create unhandled rejections when pull fails during online recovery', async () => {
    const onUnhandled = vi.fn()
    window.addEventListener('unhandledrejection', onUnhandled)
    const pull = vi.fn().mockRejectedValue(new Error('network'))
    const cleanup = installTableConfigOnlineRecovery({ isOnline: () => true, pull })

    window.dispatchEvent(new Event('online'))
    await new Promise((resolve) => setTimeout(resolve, 0))

    cleanup()
    window.removeEventListener('unhandledrejection', onUnhandled)
    expect(pull).toHaveBeenCalledTimes(1)
    expect(onUnhandled).not.toHaveBeenCalled()
  })
})
