import { create } from 'zustand'
import type { AuthUser, SessionRecord } from './token-store-types'

type SessionState = {
  currentUser: AuthUser | null
  isAuthenticated: boolean
  authExpiredMessage: string | null
  setSessionFromRecord: (session: SessionRecord) => void
  clearSessionState: (message?: string) => void
}

export const useSessionStore = create<SessionState>((set) => ({
  currentUser: null,
  isAuthenticated: false,
  authExpiredMessage: null,
  setSessionFromRecord: (session) => set({ currentUser: session.userInfo, isAuthenticated: true, authExpiredMessage: null }),
  clearSessionState: (message) => set({ currentUser: null, isAuthenticated: false, authExpiredMessage: message ?? null }),
}))
