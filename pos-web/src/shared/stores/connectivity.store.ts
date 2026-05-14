import { create } from 'zustand'

export type SyncUiState = 'idle' | 'running' | 'backoff'

interface ConnectivityState {
  isOnline: boolean
  lastCheckedAt: Date
  syncState: SyncUiState
  lastSyncedAt: Date | undefined
  setConnectivityState: (state: { isOnline: boolean; lastCheckedAt?: Date }) => void
  setSyncUiState: (state: SyncUiState, lastSyncedAt?: Date) => void
}

export const useConnectivityStore = create<ConnectivityState>((set) => ({
  isOnline: typeof navigator === 'undefined' ? true : navigator.onLine,
  lastCheckedAt: new Date(0),
  syncState: 'idle',
  lastSyncedAt: undefined,
  setConnectivityState: ({ isOnline, lastCheckedAt }) => set({ isOnline, lastCheckedAt: lastCheckedAt ?? new Date() }),
  setSyncUiState: (syncState, lastSyncedAt) => set((current) => ({
    syncState,
    lastSyncedAt: lastSyncedAt ?? current.lastSyncedAt,
  })),
}))
