import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PosDexie } from '../../db/dexie'
import { MENU_META_ID } from '../../db/schemas/menu'
import { installMenuOnlineRecovery, pullMenu, triggerMenuPull, writeMenuSnapshot } from './sync'
import type { MenuSnapshotDto } from './types'

const snapshot: MenuSnapshotDto = {
  menuVersion: 3,
  categories: [{ id: 'cat-1', name: 'Cà phê', sortOrder: 1, isActive: true }],
  products: [
    { id: 'prod-1', name: 'Bạc Xỉu', categoryId: 'cat-1', priceVnd: 35000, isActive: true, sortOrder: 2, optionGroupIds: ['group-1'] },
  ],
  optionGroups: [
    {
      id: 'group-1',
      name: 'Size',
      isRequired: true,
      minSelect: 1,
      maxSelect: 1,
      sortOrder: 1,
      options: [{ id: 'opt-1', label: 'Size L', priceDeltaVnd: 5000, isDefault: false, sortOrder: 1 }],
    },
  ],
}

let databases: PosDexie[] = []
function createDb() {
  const database = new PosDexie(`menu-test-${crypto.randomUUID()}`)
  databases.push(database)
  return database
}

afterEach(async () => {
  await Promise.all(databases.map(async (database) => {
    await database.delete()
    database.close()
  }))
  databases = []
})

describe('menu sync', () => {
  it('writes a complete menu snapshot and metadata atomically', async () => {
    const database = createDb()
    await writeMenuSnapshot(snapshot, database, () => new Date('2026-05-11T09:00:00.000Z'))

    await expect(database.categories.toArray()).resolves.toHaveLength(1)
    await expect(database.products.get('prod-1')).resolves.toMatchObject({ priceVnd: 35000, optionGroupIds: ['group-1'] })
    await expect(database.optionGroups.get('group-1')).resolves.toMatchObject({ optionIds: ['opt-1'] })
    await expect(database.options.get('opt-1')).resolves.toMatchObject({ optionGroupId: 'group-1', label: 'Size L' })
    await expect(database.menuMeta.get(MENU_META_ID)).resolves.toEqual({
      id: MENU_META_ID,
      menuVersion: 3,
      lastPulledAt: '2026-05-11T09:00:00.000Z',
    })
  })

  it('pulls from API before writing the cache', async () => {
    const database = createDb()
    const fetchMenu = vi.fn().mockResolvedValue(snapshot)

    await expect(pullMenu({ database, fetchMenu })).resolves.toEqual(snapshot)
    expect(fetchMenu).toHaveBeenCalledTimes(1)
    await expect(database.products.count()).resolves.toBe(1)
  })

  it('preserves session data across Dexie version upgrade', async () => {
    const database = createDb()
    await database.session.put({
      id: 'current',
      accessToken: 'token',
      expiresAt: Date.now() + 1000,
      lastLoginAt: Date.now(),
      userInfo: { id: 'user-1', email: 'cashier@example.com', role: 'cashier', tenantId: 'tenant-1', storeId: 'store-1' },
    })
    await writeMenuSnapshot(snapshot, database)

    await expect(database.session.get('current')).resolves.toMatchObject({ accessToken: 'token' })
  })

  it('does not trigger when offline and propagates pull failures to callers', async () => {
    const pull = vi.fn().mockRejectedValue(new Error('network'))

    expect(triggerMenuPull({ isOnline: () => false, pull })).toBeNull()
    expect(pull).not.toHaveBeenCalled()
    await expect(triggerMenuPull({ isOnline: () => true, pull })).rejects.toThrow('network')
  })

  it('cleans up the online recovery listener', () => {
    const pull = vi.fn().mockResolvedValue(undefined)
    const cleanup = installMenuOnlineRecovery({ isOnline: () => true, pull })

    window.dispatchEvent(new Event('online'))
    cleanup()
    window.dispatchEvent(new Event('online'))

    expect(pull).toHaveBeenCalledTimes(1)
  })

  it('does not create unhandled rejections when online recovery pull fails', async () => {
    const onUnhandled = vi.fn()
    window.addEventListener('unhandledrejection', onUnhandled)
    const pull = vi.fn().mockRejectedValue(new Error('network'))
    const cleanup = installMenuOnlineRecovery({ isOnline: () => true, pull })

    window.dispatchEvent(new Event('online'))
    await new Promise((resolve) => setTimeout(resolve, 0))

    cleanup()
    window.removeEventListener('unhandledrejection', onUnhandled)
    expect(pull).toHaveBeenCalledTimes(1)
    expect(onUnhandled).not.toHaveBeenCalled()
  })

})
