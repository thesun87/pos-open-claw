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

/**
 * Display status for floor-plan UI (Story 6.12) — richer than TableOccupancyStatus from BE.
 * Priority order (highest first): inactive > conflict > pending_sync > serving > occupied > empty
 */
export type TableDisplayStatus =
  | 'empty'        // trống
  | 'serving'      // phiên mở chưa thanh toán (openSessionCount > 0)
  | 'occupied'     // đã có đơn trong ngày, không phiên mở (activeOrderCount > 0)
  | 'conflict'     // openSessionCount > 1 (FR56)
  | 'pending_sync' // có order pendingSync
  | 'inactive'     // table.isActive === false

export type TableStatusRow = {
  tableId: string
  status: TableOccupancyStatus
  activeOrderCount: number
  /** Story 6.10 — additive fields from BE 6.11 upgrade. */
  openSessionCount: number
  conflict: boolean
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
