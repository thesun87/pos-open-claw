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
 * Priority order (highest first): inactive > conflict > serving > opening > empty
 *
 * Phiên mở (openSessionCount > 0) được tách làm 2 trạng thái theo việc có đơn hàng (draft) gắn
 * với bàn hay chưa:
 *  - 'serving' ("Đang có đơn"): phiên mở + có draft (đơn chưa thanh toán) giữ ở bàn.
 *  - 'opening' ("Đang mở"): phiên mở nhưng chưa có draft — cashier vừa chọn bàn trống mà chưa
 *    order xong (chưa bấm "Giữ bàn"), hoặc phiên mở từ máy khác (cross-device).
 *
 * Lưu ý: 'pending_sync' ("Chờ đồng bộ") đã bị BỎ khỏi display — bàn đã thanh toán xong (không còn
 * phiên mở) trả về 'empty' NGAY để cashier lên đơn mới, BẤT KỂ đơn đã sync hay chưa. Một đơn
 * pendingSync luôn là đơn ĐÃ thanh toán (orders chỉ tạo lúc finalize) → không giữ bàn bận. Tình
 * trạng đồng bộ được báo toàn cục (FR24), không per-table. Bàn bị chặn khi 'serving', 'opening',
 * xung đột phiên ('conflict') hoặc tạm tắt ('inactive').
 */
export type TableDisplayStatus =
  | 'empty'        // trống — không phiên mở (kể cả khi đã có đơn đã thanh toán/đơn chờ sync trong ngày)
  | 'opening'      // "Đang mở" — phiên mở nhưng CHƯA có draft gắn với bàn (chưa order xong)
  | 'serving'      // "Đang có đơn" — phiên mở + có draft (đơn chưa thanh toán) gắn với bàn
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
