import { create } from 'zustand'
import { authApi } from '../api/auth'
import { registerUnauthorizedHandler } from '../api/client'
import type { User } from '../types'

interface AuthState {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  setUser: (user: User | null) => void
  logout: () => Promise<void>
  init: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  setUser(user: User | null) {
    set({ user, isAuthenticated: user !== null })
  },

  async logout() {
    try {
      await authApi.logout()
    } catch {
      // Backend clears the cookie regardless — swallow errors
    }
    set({ user: null, isAuthenticated: false })
  },

  async init() {
    // Wire up the 401 handler so the client can clear state without
    // importing the store directly (avoids circular dependency).
    registerUnauthorizedHandler(() => {
      set({ user: null, isAuthenticated: false })
      window.location.href = '/login'
    })

    set({ isLoading: true })
    try {
      const user = await authApi.me()
      set({ user, isAuthenticated: true })
    } catch {
      // No active session — not an error condition
      set({ user: null, isAuthenticated: false })
    } finally {
      set({ isLoading: false })
    }
  },
}))
