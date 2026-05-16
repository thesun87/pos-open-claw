import { apiClient } from '../../../shared/lib/api-client'
import { adminMenuQueryKey } from '../categories/api'

export type OptionDto = { id: string; label: string; priceDeltaVnd: number; isDefault: boolean; sortOrder: number }
export type OptionGroupDto = { id: string; name: string; isRequired: boolean; minSelect: number; maxSelect: number; sortOrder: number; options: OptionDto[] }
export type OptionMutationDto = { id?: string; label: string; priceDeltaVnd: number; isDefault: boolean; sortOrder: number }
export type OptionGroupMutationDto = { name: string; isRequired: boolean; minSelect: number; maxSelect: number; sortOrder: number; options: OptionMutationDto[] }

export const optionGroupsQueryKey = ['admin', 'option-groups'] as const
export { adminMenuQueryKey }

export async function fetchOptionGroups(): Promise<OptionGroupDto[]> { const response = await apiClient.get<OptionGroupDto[]>('/option-groups'); return response.data }
export async function createOptionGroup(payload: OptionGroupMutationDto): Promise<OptionGroupDto> { const response = await apiClient.post<OptionGroupDto>('/option-groups', payload); return response.data }
export async function updateOptionGroup(id: string, payload: OptionGroupMutationDto): Promise<OptionGroupDto> { const response = await apiClient.patch<OptionGroupDto>(`/option-groups/${id}`, payload); return response.data }
export async function deleteOptionGroup(id: string): Promise<void> { await apiClient.delete(`/option-groups/${id}`) }
