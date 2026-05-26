import { apiClient } from '../../shared/lib/api-client'

// POS-side types — DO NOT import from features/admin/tables (boundary rule §8)
export type AreaDto = {
  id: string
  name: string
  sortOrder: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type TableDto = {
  id: string
  areaId: string
  name: string
  capacity: number
  sortOrder: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type StoreMeDto = {
  id: string
  name: string
  code: string
  tableMode: boolean
  createdAt: string
  updatedAt: string
}

export type TableOccupancyStatus = 'empty' | 'occupied' | 'pending_sync'

export type TableStatusRow = {
  tableId: string
  status: TableOccupancyStatus
  activeOrderCount: number
}

// POS-namespaced query keys — MUST NOT collide with admin keys
export const storeMeQueryKey = ['pos', 'stores', 'me'] as const
export const areasQueryKey = ['pos', 'areas'] as const
export const tablesQueryKey = ['pos', 'tables'] as const
export const tableStatusQueryKey = ['pos', 'table-status'] as const

export async function fetchStoreMe(): Promise<StoreMeDto> {
  const response = await apiClient.get<StoreMeDto>('/stores/me')
  return response.data
}

export async function fetchAreas(): Promise<AreaDto[]> {
  const response = await apiClient.get<AreaDto[]>('/areas')
  return response.data
}

export async function fetchTables(): Promise<TableDto[]> {
  const response = await apiClient.get<TableDto[]>('/tables')
  return response.data
}

export async function fetchTableStatus(): Promise<TableStatusRow[]> {
  const response = await apiClient.get<TableStatusRow[]>('/tables/status')
  return response.data
}
