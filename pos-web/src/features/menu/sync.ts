import type { PosDexie } from '../../db/dexie'
import { db as defaultDb } from '../../db/dexie'
import { MENU_META_ID } from '../../db/schemas/menu'
import { fetchMenu as defaultFetchMenu, fetchVersionedMenu as defaultFetchVersionedMenu, type VersionedMenuSyncDto } from './api'
import type { MenuSnapshotDto } from './types'

type DispatchEvent = (event: Event) => boolean

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
  const timestamp = now().toISOString()

  await database.transaction('rw', [database.categories, database.products, database.optionGroups, database.options, database.menuMeta], async () => {
    await Promise.all([database.categories.clear(), database.products.clear(), database.optionGroups.clear(), database.options.clear()])
    await Promise.all([
      database.categories.bulkPut(snapshot.categories),
      database.products.bulkPut(snapshot.products),
      database.optionGroups.bulkPut(optionGroups),
      database.options.bulkPut(options),
      database.menuMeta.put({ id: MENU_META_ID, menuVersion: snapshot.menuVersion, lastPulledAt: timestamp, lastCheckedAt: timestamp }),
    ])
  })
}

export async function pullMenu({ database = defaultDb, fetchMenu = defaultFetchMenu, now }: { database?: PosDexie; fetchMenu?: () => Promise<MenuSnapshotDto | null>; now?: () => Date } = {}): Promise<MenuSnapshotDto | null> {
  const snapshot = await fetchMenu()
  if (!snapshot) return null
  await writeMenuSnapshot(snapshot, database, now)
  return snapshot
}

let versionedInFlight: Promise<VersionedMenuSyncDto> | null = null

export async function checkAndPullIfNewer({
  database = defaultDb,
  fetchVersionedMenu = defaultFetchVersionedMenu,
  now = () => new Date(),
  dispatchEvent = (event: Event) => window.dispatchEvent(event),
}: {
  database?: PosDexie
  fetchVersionedMenu?: (sinceVersion?: number) => Promise<VersionedMenuSyncDto>
  now?: () => Date
  dispatchEvent?: DispatchEvent
} = {}): Promise<VersionedMenuSyncDto> {
  if (versionedInFlight) return versionedInFlight
  versionedInFlight = (async () => {
    const meta = await database.menuMeta.get(MENU_META_ID).catch(() => undefined)
    const sinceVersion = typeof meta?.menuVersion === 'number' ? meta.menuVersion : undefined
    const response = await fetchVersionedMenu(sinceVersion)
    const checkedAt = now().toISOString()

    if (!response.hasChanges) {
      await database.menuMeta.put({
        id: MENU_META_ID,
        menuVersion: response.menuVersion,
        lastPulledAt: meta?.lastPulledAt ?? checkedAt,
        lastCheckedAt: checkedAt,
      })
      return response
    }

    await writeMenuSnapshot({ menuVersion: response.menuVersion, ...response.snapshot }, database, () => new Date(checkedAt))
    dispatchEvent(new CustomEvent('menu.updated', { detail: { menuVersion: response.menuVersion } }))
    return response
  })()
  try { return await versionedInFlight } finally { versionedInFlight = null }
}

let pullInFlight: Promise<void> | null = null

export function triggerMenuPull(options: { isOnline?: () => boolean; isAuthenticated?: () => boolean; pull?: () => Promise<unknown> } = {}): Promise<void> | null {
  const isOnline = options.isOnline ?? (() => navigator.onLine)
  const isAuthenticated = options.isAuthenticated ?? (() => true)
  const pull = options.pull ?? (() => checkAndPullIfNewer())
  if (!isOnline() || !isAuthenticated()) return null
  if (pullInFlight) return pullInFlight
  pullInFlight = (async () => { try { await pull() } finally { pullInFlight = null } })()
  return pullInFlight
}

export function installMenuOnlineRecovery(options: { isOnline?: () => boolean; isAuthenticated?: () => boolean; pull?: () => Promise<unknown> } = {}): () => void {
  const onOnline = () => { void triggerMenuPull(options)?.catch(() => undefined) }
  window.addEventListener('online', onOnline)
  return () => window.removeEventListener('online', onOnline)
}
