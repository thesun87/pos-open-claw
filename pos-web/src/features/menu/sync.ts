import type { PosDexie } from '../../db/dexie'
import { db as defaultDb } from '../../db/dexie'
import { MENU_META_ID } from '../../db/schemas/menu'
import { fetchMenu as defaultFetchMenu } from './api'
import type { MenuSnapshotDto } from './types'

export async function writeMenuSnapshot(
  snapshot: MenuSnapshotDto,
  database: PosDexie = defaultDb,
  now: () => Date = () => new Date(),
): Promise<void> {
  const options = snapshot.optionGroups.flatMap((group) =>
    group.options.map((option) => ({ ...option, optionGroupId: group.id })),
  )
  const optionGroups = snapshot.optionGroups.map((group) => ({
    id: group.id,
    name: group.name,
    isRequired: group.isRequired,
    minSelect: group.minSelect,
    maxSelect: group.maxSelect,
    sortOrder: group.sortOrder,
    optionIds: group.options.map((option) => option.id),
  }))

  await database.transaction(
    'rw',
    [
      database.categories,
      database.products,
      database.optionGroups,
      database.options,
      database.menuMeta,
    ],
    async () => {
      await Promise.all([
        database.categories.clear(),
        database.products.clear(),
        database.optionGroups.clear(),
        database.options.clear(),
      ])
      await Promise.all([
        database.categories.bulkPut(snapshot.categories),
        database.products.bulkPut(snapshot.products),
        database.optionGroups.bulkPut(optionGroups),
        database.options.bulkPut(options),
        database.menuMeta.put({
          id: MENU_META_ID,
          menuVersion: snapshot.menuVersion,
          lastPulledAt: now().toISOString(),
        }),
      ])
    },
  )
}

export async function pullMenu({
  database = defaultDb,
  fetchMenu = defaultFetchMenu,
  now,
}: {
  database?: PosDexie
  fetchMenu?: () => Promise<MenuSnapshotDto>
  now?: () => Date
} = {}): Promise<MenuSnapshotDto> {
  const snapshot = await fetchMenu()
  await writeMenuSnapshot(snapshot, database, now)
  return snapshot
}

let pullInFlight: Promise<void> | null = null

export function triggerMenuPull(options: {
  isOnline?: () => boolean
  isAuthenticated?: () => boolean
  pull?: () => Promise<unknown>
} = {}): Promise<void> | null {
  const isOnline = options.isOnline ?? (() => navigator.onLine)
  const isAuthenticated = options.isAuthenticated ?? (() => true)
  const pull = options.pull ?? (() => pullMenu())
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

export function installMenuOnlineRecovery(options: {
  isOnline?: () => boolean
  isAuthenticated?: () => boolean
  pull?: () => Promise<unknown>
} = {}): () => void {
  const onOnline = () => {
    void triggerMenuPull(options)?.catch(() => {
      // Best-effort recovery: failed refresh should not crash the app shell.
    })
  }
  window.addEventListener('online', onOnline)
  return () => window.removeEventListener('online', onOnline)
}
