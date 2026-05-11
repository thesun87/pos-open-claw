import { apiClient } from '../../shared/lib/api-client'
import type { MenuSnapshotDto } from './types'

export async function fetchMenu(): Promise<MenuSnapshotDto> {
  const response = await apiClient.get<MenuSnapshotDto>('/menu')
  return response.data
}
