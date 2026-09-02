import { create } from 'zustand'
import { authApi } from '../api/auth'
import { registerUnauthorizedHandler } from '../api/client'
import { claimCaches, releaseCaches } from '../api/cache'
import type { User } from '../types'

interface AuthState {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  setUser: (user: User | null) => Promise<void>
  logout: () => Promise<void>
  init: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  async setUser(user: User | null) {
    // Purge before the store flips, so no authenticated view can fetch through
    // a cache still holding the previous user's responses.
    if (user) await claimCaches(user.id)
    set({ user, isAuthenticated: user !== null })
  },

  async logout() {
    try {
      await authApi.logout()
    } catch {
      // Backend clears the cookie regardless — swallow errors
    }
    await releaseCaches()
    set({ user: null, isAuthenticated: false })
  },

  async init() {
    // Wire up the 401 handler so the client can clear state without
    // importing the store directly (avoids circular dependency).
    registerUnauthorizedHandler(() => {
      // A 401 that reached here is an unrecoverable session — drop its cache too.
      void releaseCaches()
      set({ user: null, isAuthenticated: false })
      // ProtectedRoute handles the redirect to /login via React Router — no hard reload needed
    })

    set({ isLoading: true })
    try {
      const user = await authApi.me()
      await claimCaches(user.id)
      set({ user, isAuthenticated: true })
    } catch {
      // No active session — not an error condition
      set({ user: null, isAuthenticated: false })
    } finally {
      set({ isLoading: false })
    }
  },
}))
