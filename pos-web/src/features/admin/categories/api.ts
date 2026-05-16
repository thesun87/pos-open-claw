import { apiClient } from '../../../shared/lib/api-client'
import type { MenuSnapshotDto } from '../../menu/types'

export type CategoryDto = {
  id: string
  name: string
  sortOrder: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type CategoryMutationDto = {
  name?: string
  sortOrder?: number
  isActive?: boolean
}

export const categoriesQueryKey = ['admin', 'categories'] as const
export const adminMenuQueryKey = ['admin', 'menu'] as const

export async function fetchCategories(): Promise<CategoryDto[]> {
  const response = await apiClient.get<CategoryDto[]>('/categories')
  return response.data
}

export async function createCategory(payload: Required<Pick<CategoryMutationDto, 'name' | 'sortOrder'>> & Pick<CategoryMutationDto, 'isActive'>): Promise<CategoryDto> {
  const response = await apiClient.post<CategoryDto>('/categories', payload)
  return response.data
}

export async function updateCategory(id: string, payload: CategoryMutationDto): Promise<CategoryDto> {
  const response = await apiClient.patch<CategoryDto>(`/categories/${id}`, payload)
  return response.data
}

export async function deleteCategory(id: string): Promise<void> {
  await apiClient.delete(`/categories/${id}`)
}

type VersionedMenuSyncDto =
  | { menuVersion: number; hasChanges: false; snapshot: null }
  | { menuVersion: number; hasChanges: true; snapshot: Omit<MenuSnapshotDto, 'menuVersion'> }

function isVersionedMenuSyncDto(value: MenuSnapshotDto | VersionedMenuSyncDto): value is VersionedMenuSyncDto {
  return 'hasChanges' in value
}

export async function fetchAdminMenu(): Promise<MenuSnapshotDto | null> {
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
