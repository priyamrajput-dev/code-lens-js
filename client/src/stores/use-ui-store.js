import { create } from "zustand";
export const useUIStore = create(set => ({
  isSidebarOpen: false,
  setSidebarOpen: open => set({
    isSidebarOpen: open
  }),
  toggleSidebar: () => set(state => ({
    isSidebarOpen: !state.isSidebarOpen
  }))
}));
