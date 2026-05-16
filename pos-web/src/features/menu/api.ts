import { apiClient } from '../../shared/lib/api-client'
import type { MenuSnapshotDto } from './types'

export type VersionedMenuSyncDto =
  | { menuVersion: number; hasChanges: false; snapshot: null }
  | { menuVersion: number; hasChanges: true; snapshot: Omit<MenuSnapshotDto, 'menuVersion'> }

function isVersionedMenuSyncDto(value: MenuSnapshotDto | VersionedMenuSyncDto): value is VersionedMenuSyncDto {
  return 'hasChanges' in value
}

export async function fetchVersionedMenu(sinceVersion?: number): Promise<VersionedMenuSyncDto> {
  const response = await apiClient.get<VersionedMenuSyncDto>('/menu', {
    params: sinceVersion === undefined ? undefined : { since_version: sinceVersion },
  })
  return response.data
}

export async function fetchMenu(): Promise<MenuSnapshotDto | null> {
  const response = await apiClient.get<MenuSnapshotDto | VersionedMenuSyncDto>('/menu')
  const data = response.data
  if (!isVersionedMenuSyncDto(data)) return data
  if (!data.snapshot) return null

  return {
    menuVersion: data.menuVersion,
    categories: data.snapshot.categories,
    products: data.snapshot.products,
    optionGroups: data.snapshot.optionGroups,
  }
}
