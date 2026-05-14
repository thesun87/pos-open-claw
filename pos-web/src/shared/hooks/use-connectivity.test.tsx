import '@testing-library/jest-dom/vitest'
import { render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '../lib/api-client'
import { useConnectivityStore } from '../stores/connectivity.store'
import { useConnectivity } from './use-connectivity'

vi.mock('../lib/api-client', () => ({ apiClient: { get: vi.fn() } }))
const getMock = vi.mocked(apiClient.get)
function Probe() { useConnectivity(); return null }

beforeEach(() => {
  getMock.mockReset().mockResolvedValue({ data: {} })
  useConnectivityStore.setState({ isOnline: true, lastCheckedAt: new Date(0), syncState: 'idle', lastSyncedAt: undefined })
  Object.defineProperty(navigator, 'onLine', { value: true, configurable: true })
})
afterEach(() => vi.useRealTimers())

describe('useConnectivity', () => {
  it('pings /health on mount and marks online', async () => {
    render(<Probe />)
    await waitFor(() => expect(getMock).toHaveBeenCalledWith('/health'))
    expect(useConnectivityStore.getState().isOnline).toBe(true)
  })

  it('marks offline when health ping fails and on native offline event', async () => {
    getMock.mockRejectedValueOnce(new Error('down'))
    render(<Probe />)
    await waitFor(() => expect(useConnectivityStore.getState().isOnline).toBe(false))
    useConnectivityStore.getState().setConnectivityState({ isOnline: true })
    window.dispatchEvent(new Event('offline'))
    expect(useConnectivityStore.getState().isOnline).toBe(false)
  })

  it('uses active tab 30s interval and cleans it up', async () => {
    vi.useFakeTimers()
    const { unmount } = render(<Probe />)
    await vi.advanceTimersByTimeAsync(30_000)
    expect(getMock).toHaveBeenCalledTimes(2)
    unmount()
    await vi.advanceTimersByTimeAsync(30_000)
    expect(getMock).toHaveBeenCalledTimes(2)
  })
})
