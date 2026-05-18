import { create } from 'zustand'

type AdminUiState = {
  isCollapsed: boolean
  mobileDrawerOpen: boolean
  toggleCollapse: () => void
  setCollapse: (value: boolean) => void
  setMobileDrawerOpen: (value: boolean) => void
}

export const useAdminUiStore = create<AdminUiState>((set) => ({
  isCollapsed: false,
  mobileDrawerOpen: false,
  toggleCollapse: () => set((state) => ({ isCollapsed: !state.isCollapsed })),
  setCollapse: (value) => set({ isCollapsed: value }),
  setMobileDrawerOpen: (value) => set({ mobileDrawerOpen: value }),
}))
