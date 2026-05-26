import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchStoreMe, storeMeQueryKey, updateStoreTableMode, type StoreMeDto, type UpdateStoreTableModeDto } from './api'

export function useStoreMe() {
  return useQuery({ queryKey: storeMeQueryKey, queryFn: fetchStoreMe, staleTime: 5 * 60 * 1000, retry: false })
}

export function useTableMode() {
  const query = useStoreMe()
  return { tableMode: query.data?.tableMode ?? false, isLoading: query.isLoading, error: query.error }
}

export function useUpdateTableMode() {
  const queryClient = useQueryClient()
  return useMutation<StoreMeDto, unknown, UpdateStoreTableModeDto>({
    mutationFn: updateStoreTableMode,
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: storeMeQueryKey }) },
  })
}
