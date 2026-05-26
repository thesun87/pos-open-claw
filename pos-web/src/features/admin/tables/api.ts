import { apiClient } from '../../../shared/lib/api-client'

export type AreaDto = {
  id: string
  name: string
  sortOrder: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type AreaMutationDto = {
  name?: string
  sortOrder?: number
  isActive?: boolean
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

export type TableMutationDto = {
  name?: string
  areaId?: string
  capacity?: number
  sortOrder?: number
  isActive?: boolean
}

export type StoreMeDto = {
  id: string
  name: string
  code: string
  tableMode: boolean
  createdAt: string
  updatedAt: string
}

export type TableFilters = {
  areaId?: string
  active?: boolean
}

export type UpdateStoreTableModeDto = {
  tableMode: boolean
}

export type TableStatusRow = {
  tableId: string
  status: 'empty' | 'occupied' | 'pending_sync'
  activeOrderCount: number
}

export const areasQueryKey = ['admin', 'areas'] as const
export const tablesQueryKey = ['admin', 'tables'] as const
export const storeMeQueryKey = ['admin', 'stores', 'me'] as const
export const tableStatusQueryKey = ['admin', 'table-status'] as const

export async function fetchAreas(): Promise<AreaDto[]> {
  const response = await apiClient.get<AreaDto[]>('/areas')
  return response.data
}

export async function createArea(payload: Required<Pick<AreaMutationDto, 'name' | 'sortOrder'>> & Pick<AreaMutationDto, 'isActive'>): Promise<AreaDto> {
  const response = await apiClient.post<AreaDto>('/areas', payload)
  return response.data
}

export async function updateArea(id: string, payload: AreaMutationDto): Promise<AreaDto> {
  const response = await apiClient.patch<AreaDto>(`/areas/${id}`, payload)
  return response.data
}

export async function deleteArea(id: string): Promise<void> {
  await apiClient.delete(`/areas/${id}`)
}

export async function fetchTables(query: TableFilters = {}): Promise<TableDto[]> {
  const params: Record<string, string> = {}
  if (query.areaId) params.areaId = query.areaId
  if (typeof query.active === 'boolean') params.active = String(query.active)
  const response = await apiClient.get<TableDto[]>('/tables', { params })
  return response.data
}

export async function createTable(payload: Required<Pick<TableMutationDto, 'name' | 'areaId' | 'capacity' | 'sortOrder'>> & Pick<TableMutationDto, 'isActive'>): Promise<TableDto> {
  const response = await apiClient.post<TableDto>('/tables', payload)
  return response.data
}

export async function updateTable(id: string, payload: TableMutationDto): Promise<TableDto> {
  const response = await apiClient.patch<TableDto>(`/tables/${id}`, payload)
  return response.data
}

export async function deleteTable(id: string): Promise<void> {
  await apiClient.delete(`/tables/${id}`)
}

export async function fetchStoreMe(): Promise<StoreMeDto> {
  const response = await apiClient.get<StoreMeDto>('/stores/me')
  return response.data
}

export async function updateStoreTableMode(payload: UpdateStoreTableModeDto): Promise<StoreMeDto> {
  const response = await apiClient.patch<StoreMeDto>('/stores/me', payload)
  return response.data
}

export async function fetchTableStatus(): Promise<TableStatusRow[]> {
  const response = await apiClient.get<TableStatusRow[]>('/tables/status')
  return response.data
}
