import { useQuery } from '@tanstack/react-query'
import {
  areasQueryKey,
  fetchAreas,
  fetchStoreMe,
  fetchTableStatus,
  fetchTables,
  storeMeQueryKey,
  tableStatusQueryKey,
  tablesQueryKey,
  type AreaDto,
  type StoreMeDto,
  type TableDto,
  type TableStatusRow,
} from './api'
import { usePosTableContextStore } from './store'
import { useConnectivityStore } from '../../shared/stores/connectivity.store'

export function useStoreMe() {
  return useQuery<StoreMeDto>({
    queryKey: storeMeQueryKey,
    queryFn: fetchStoreMe,
    staleTime: 5 * 60_000,
  })
}

export function useTableMode(): { tableMode: boolean; isLoading: boolean; isError: boolean } {
  const q = useStoreMe()
  return {
    tableMode: q.data?.tableMode ?? false,
    isLoading: q.isLoading,
    isError: q.isError,
  }
}

export function useAreas() {
  const { tableMode } = useTableMode()
  return useQuery<AreaDto[]>({
    queryKey: areasQueryKey,
    queryFn: fetchAreas,
    enabled: tableMode,
    staleTime: 5 * 60_000,
  })
}

export function useTables() {
  const { tableMode } = useTableMode()
  return useQuery<TableDto[]>({
    queryKey: tablesQueryKey,
    queryFn: fetchTables,
    enabled: tableMode,
    staleTime: 5 * 60_000,
  })
}

export function useTableStatus() {
  const { tableMode } = useTableMode()
  const selectedTableId = usePosTableContextStore((s) => s.selectedTableId)
  // Gate polling: only when table-mode active, no table selected, AND online (AC2 — offline pause)
  const isOnline = useConnectivityStore((s) => s.isOnline)
  const enabled = tableMode && selectedTableId === null && isOnline
  return useQuery<TableStatusRow[]>({
    queryKey: tableStatusQueryKey,
    queryFn: fetchTableStatus,
    enabled,
    refetchInterval: enabled ? 30_000 : false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    staleTime: 0,
  })
}
