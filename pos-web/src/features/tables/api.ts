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
 * Priority order (highest first): inactive > conflict > serving > empty
 *
 * Lưu ý: 'occupied' ("Đã có đơn") VÀ 'pending_sync' ("Chờ đồng bộ") đã bị BỎ khỏi display —
 * bàn đã thanh toán xong (không còn phiên mở) trả về 'empty' NGAY để cashier lên đơn mới,
 * BẤT KỂ đơn đã sync hay chưa. Một đơn pendingSync luôn là đơn ĐÃ thanh toán (orders chỉ tạo
 * lúc finalize) → không giữ bàn bận. Tình trạng đồng bộ được báo toàn cục (FR24 — bộ đếm đơn
 * chờ đồng bộ), không per-table. Bàn chỉ bị chặn khi đang phục vụ (serving), xung đột phiên
 * (conflict) hoặc tạm tắt (inactive).
 */
export type TableDisplayStatus =
  | 'empty'        // trống — không phiên mở (kể cả khi đã có đơn/đơn chờ sync trong ngày)
  | 'serving'      // phiên mở chưa thanh toán (openSessionCount > 0)
  | 'conflict'     // openSessionCount > 1 (FR56)
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
