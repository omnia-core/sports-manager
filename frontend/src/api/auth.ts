import { get, post } from './client'
import type { User } from '../types/index'

export const authApi = {
  register(data: { email: string; password: string; name: string }): Promise<User> {
    return post<User>('/api/auth/register', data)
  },

  login(data: { email: string; password: string }): Promise<User> {
    return post<User>('/api/auth/login', data)
  },

  logout(): Promise<void> {
    return post<void>('/api/auth/logout')
  },

  me(): Promise<User> {
    return get<User>('/api/auth/me')
  },
}
