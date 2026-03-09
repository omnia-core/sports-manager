import { create } from 'zustand'
import { teamsApi } from '../api/teams'
import type { Team, MemberWithUser } from '../types'

interface TeamState {
  teams: Team[]
  currentTeam: Team | null
  members: MemberWithUser[]
  isLoading: boolean
  fetchTeams(): Promise<void>
  fetchTeam(teamID: string): Promise<void>
  createTeam(data: { name: string; sport: string }): Promise<Team>
  fetchMembers(teamID: string): Promise<void>
  inviteMember(teamID: string, email: string): Promise<void>
}

export const useTeamStore = create<TeamState>((set) => ({
  teams: [],
  currentTeam: null,
  members: [],
  isLoading: false,

  async fetchTeams() {
    set({ isLoading: true })
    try {
      const { teams } = await teamsApi.list()
      set({ teams })
    } finally {
      set({ isLoading: false })
    }
  },

  async fetchTeam(teamID: string) {
    set({ isLoading: true })
    try {
      const team = await teamsApi.get(teamID)
      set({ currentTeam: team })
    } finally {
      set({ isLoading: false })
    }
  },

  async createTeam(data: { name: string; sport: string }) {
    const team = await teamsApi.create(data)
    set((state) => ({ teams: [...state.teams, team] }))
    return team
  },

  async fetchMembers(teamID: string) {
    const { members } = await teamsApi.listMembers(teamID)
    set({ members })
  },

  async inviteMember(teamID: string, email: string) {
    await teamsApi.inviteMember(teamID, email)
  },
}))
