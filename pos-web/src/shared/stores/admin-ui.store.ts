import { create } from 'zustand'

type AdminUiState = {
  isCollapsed: boolean
  mobileDrawerOpen: boolean
  toggleCollapse: () => void
  setCollapse: (value: boolean) => void
  setMobileDrawerOpen: (value: boolean) => void
  isHovered: boolean
  setIsHovered: (value: boolean) => void
}

export const useAdminUiStore = create<AdminUiState>((set) => ({
  isCollapsed: false,
  mobileDrawerOpen: false,
  isHovered: false,
  toggleCollapse: () => set((state) => ({ isCollapsed: !state.isCollapsed })),
  setCollapse: (value) => set({ isCollapsed: value }),
  setMobileDrawerOpen: (value) => set({ mobileDrawerOpen: value }),
  setIsHovered: (value) => set({ isHovered: value }),
}))
