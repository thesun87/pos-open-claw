import '@testing-library/jest-dom/vitest'
import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useConnectivityStore } from '../../stores/connectivity.store'
import { ConnectivityIndicator } from './connectivity-indicator'

afterEach(() => {
  vi.useRealTimers()
  useConnectivityStore.setState({ isOnline: true, lastCheckedAt: new Date(0), syncState: 'idle', lastSyncedAt: undefined })
})

describe('ConnectivityIndicator', () => {
  it('renders online and offline text with non-color status content', () => {
    render(<ConnectivityIndicator />)
    expect(screen.getByLabelText('Trạng thái kết nối: Online')).toHaveTextContent('Online')
    act(() => useConnectivityStore.getState().setConnectivityState({ isOnline: false }))
    expect(screen.getByLabelText('Trạng thái kết nối: Offline — vẫn bán được')).toHaveTextContent('Offline — vẫn bán được')
  })

  it('prioritizes running sync and recent success with auto fade', async () => {
    vi.useFakeTimers()
    render(<ConnectivityIndicator />)
    act(() => useConnectivityStore.getState().setSyncUiState('running'))
    expect(screen.getByText('Đang đồng bộ')).toBeInTheDocument()
    act(() => useConnectivityStore.getState().setSyncUiState('idle', new Date()))
    expect(screen.getByText('Đã đồng bộ')).toBeInTheDocument()
    await vi.advanceTimersByTimeAsync(3000)
    expect(screen.getByText('Online')).toBeInTheDocument()
  })
})
