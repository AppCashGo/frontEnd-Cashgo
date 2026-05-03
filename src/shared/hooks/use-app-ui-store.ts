import { create } from 'zustand'

type AppUiState = {
  isSidebarCollapsed: boolean
  isMobileSidebarOpen: boolean
  toggleSidebarCollapse: () => void
  toggleMobileSidebar: () => void
  closeMobileSidebar: () => void
}

export const useAppUiStore = create<AppUiState>((set) => ({
  isSidebarCollapsed: false,
  isMobileSidebarOpen: false,
  toggleSidebarCollapse: () =>
    set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
  toggleMobileSidebar: () =>
    set((state) => ({ isMobileSidebarOpen: !state.isMobileSidebarOpen })),
  closeMobileSidebar: () => set({ isMobileSidebarOpen: false }),
}))
