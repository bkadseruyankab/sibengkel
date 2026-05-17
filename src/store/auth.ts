import { create } from 'zustand'

export interface AuthUser {
  id: string
  name: string
  email: string
  role: string
  bengkelId?: string
  phone?: string
}

interface AuthState {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
}

const STORAGE_KEY = 'bkad_auth_user'

function saveUserToStorage(user: AuthUser) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
  } catch {
    // ignore storage errors
  }
}

function removeUserFromStorage() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore storage errors
  }
}

function getUserFromStorage(): AuthUser | null {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    if (data) {
      return JSON.parse(data) as AuthUser
    }
  } catch {
    // ignore storage errors
  }
  return null
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (email: string, password: string) => {
    set({ isLoading: true })
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Login gagal')
      }

      const data = await res.json()
      const user: AuthUser = data.user

      saveUserToStorage(user)
      set({ user, isAuthenticated: true, isLoading: false })
    } catch (error) {
      set({ isLoading: false })
      throw error
    }
  },

  logout: async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {
      // ignore API errors on logout
    }
    removeUserFromStorage()
    set({ user: null, isAuthenticated: false, isLoading: false })
  },

  checkAuth: async () => {
    set({ isLoading: true })
    try {
      // First try to restore from localStorage
      const storedUser = getUserFromStorage()
      if (storedUser) {
        // Verify with API
        try {
          const res = await fetch(`/api/auth/me?userId=${storedUser.id}`)
          if (res.ok) {
            const data = await res.json()
            if (data.user) {
              const user: AuthUser = data.user
              saveUserToStorage(user)
              set({ user, isAuthenticated: true, isLoading: false })
              return
            }
          } else if (res.status === 404 || res.status === 403) {
            // User no longer exists or is deactivated — clear stale session
            removeUserFromStorage()
            set({ user: null, isAuthenticated: false, isLoading: false })
            return
          }
        } catch {
          // API unavailable, use stored user (offline tolerance)
          set({ user: storedUser, isAuthenticated: true, isLoading: false })
          return
        }
        // API returned non-OK but not 404/403 — keep stored user as fallback
        set({ user: storedUser, isAuthenticated: true, isLoading: false })
        return
      }

      set({ user: null, isAuthenticated: false, isLoading: false })
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false })
    }
  },
}))
