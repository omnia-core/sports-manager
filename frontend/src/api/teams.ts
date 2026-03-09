import { get, post, put, del } from './client'
import type { Team, MemberWithUser } from '../types'

export const teamsApi = {
  list(): Promise<{ teams: Team[] }> {
    return get<{ teams: Team[] }>('/api/teams')
  },

  create(data: { name: string; sport: string }): Promise<Team> {
    return post<Team>('/api/teams', data)
  },

  get(teamID: string): Promise<Team> {
    return get<Team>(`/api/teams/${teamID}`)
  },

  update(teamID: string, data: { name: string; logo_url?: string }): Promise<Team> {
    return put<Team>(`/api/teams/${teamID}`, data)
  },

  remove(teamID: string): Promise<void> {
    return del<void>(`/api/teams/${teamID}`)
  },

  listMembers(teamID: string): Promise<{ members: MemberWithUser[] }> {
    return get<{ members: MemberWithUser[] }>(`/api/teams/${teamID}/members`)
  },

  inviteMember(teamID: string, email: string): Promise<void> {
    return post<void>(`/api/teams/${teamID}/members`, { email })
  },
}
