import { useQuery } from '@tanstack/react-query'
import { fetchStoreMe, storeMeQueryKey } from './api'

export function useStoreMe() {
  return useQuery({ queryKey: storeMeQueryKey, queryFn: fetchStoreMe, staleTime: 5 * 60 * 1000, retry: false })
}
