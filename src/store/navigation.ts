import { create } from 'zustand'

export type PageKey = 
  | 'dashboard' 
  | 'kendaraan' 
  | 'service' 
  | 'anggaran' 
  | 'bengkel' 
  | 'suku-cadang' 
  | 'riwayat' 
  | 'laporan' 
  | 'pengaturan'
  | 'notifikasi'
  | 'profil'

interface NavigationState {
  currentPage: PageKey
  setCurrentPage: (page: PageKey) => void
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
}

export const useNavigationStore = create<NavigationState>((set) => ({
  currentPage: 'dashboard',
  setCurrentPage: (page) => set({ currentPage: page }),
  // Default sidebar open for desktop; on mobile it's managed by the Sheet component
  sidebarOpen: typeof window !== 'undefined' && window.innerWidth >= 768,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}))
