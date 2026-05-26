import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '../../../shared/lib/api-client'
import { storeMeQueryKey } from './api'
import { useStoreMe, useTableMode, useUpdateTableMode } from './hooks'

vi.mock('../../../shared/lib/api-client', () => ({ apiClient: { get: vi.fn(), patch: vi.fn() } }))
const mockedApi = vi.mocked(apiClient)

function createWrapper(client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })) {
  return ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

describe('admin tables hooks', () => {
  beforeEach(() => vi.resetAllMocks())

  it('useStoreMe reads stores/me into shared query key cache', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    mockedApi.get.mockResolvedValue({ data: { id: 's1', name: 'Store', code: 'S1', tableMode: true, createdAt: '', updatedAt: '' } })
    const { result } = renderHook(() => useStoreMe(), { wrapper: createWrapper(client) })
    await waitFor(() => expect(result.current.data?.tableMode).toBe(true))
    expect(client.getQueryData(storeMeQueryKey)).toMatchObject({ tableMode: true })
  })

  it('useTableMode derives false while loading and current value after fetch', async () => {
    mockedApi.get.mockResolvedValue({ data: { id: 's1', name: 'Store', code: 'S1', tableMode: true, createdAt: '', updatedAt: '' } })
    const { result } = renderHook(() => useTableMode(), { wrapper: createWrapper() })
    expect(result.current.tableMode).toBe(false)
    await waitFor(() => expect(result.current.tableMode).toBe(true))
  })

  it('useUpdateTableMode patches stores/me and invalidates only storeMeQueryKey', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries')
    mockedApi.patch.mockResolvedValue({ data: { id: 's1', name: 'Store', code: 'S1', tableMode: true, createdAt: '', updatedAt: '' } })
    const { result } = renderHook(() => useUpdateTableMode(), { wrapper: createWrapper(client) })
    result.current.mutate({ tableMode: true })
    await waitFor(() => expect(mockedApi.patch).toHaveBeenCalledWith('/stores/me', { tableMode: true }))
    await waitFor(() => expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: storeMeQueryKey }))
    expect(invalidateSpy).toHaveBeenCalledTimes(1)
  })
})
