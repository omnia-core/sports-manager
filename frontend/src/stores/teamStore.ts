import { create } from 'zustand'
import { teamsApi } from '../api/teams'
import type { Team, TeamMember, MemberWithUser } from '../types'

interface TeamState {
  teams: Team[]
  currentTeam: Team | null
  members: MemberWithUser[]
  isLoading: boolean
  isTeamLoading: boolean
  isMembersLoading: boolean
  fetchTeams(): Promise<void>
  fetchTeam(teamID: string): Promise<void>
  createTeam(data: { name: string; sport: string }): Promise<Team>
  updateTeam(teamID: string, data: { name: string }): Promise<Team>
  fetchMembers(teamID: string): Promise<void>
  inviteMember(teamID: string, email: string, memberID?: string): Promise<void>
  removeMember(teamID: string, userID: string): Promise<void>
  addRosterMember(teamID: string, data: { name: string; jersey_number?: number | null; position?: string | null }): Promise<TeamMember>
  updateMember(teamID: string, memberID: string, data: { jersey_number?: number | null; position?: string | null; name?: string }): Promise<TeamMember>
}

export const useTeamStore = create<TeamState>((set) => ({
  teams: [],
  currentTeam: null,
  members: [],
  isLoading: false,
  isTeamLoading: false,
  isMembersLoading: false,

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
    set({ isTeamLoading: true })
    try {
      const team = await teamsApi.get(teamID)
      set({ currentTeam: team })
    } finally {
      set({ isTeamLoading: false })
    }
  },

  async createTeam(data: { name: string; sport: string }) {
    const team = await teamsApi.create(data)
    set((state) => ({ teams: [...state.teams, team] }))
    return team
  },

  async updateTeam(teamID: string, data: { name: string }) {
    const team = await teamsApi.update(teamID, data)
    set((state) => ({
      currentTeam: state.currentTeam?.id === teamID ? team : state.currentTeam,
      teams: state.teams.map((t) => (t.id === teamID ? team : t)),
    }))
    return team
  },

  async fetchMembers(teamID: string) {
    set({ isMembersLoading: true })
    try {
      const { members } = await teamsApi.listMembers(teamID)
      set({ members })
    } finally {
      set({ isMembersLoading: false })
    }
  },

  async inviteMember(teamID: string, email: string, memberID?: string) {
    await teamsApi.inviteMember(teamID, email, memberID)
  },

  async removeMember(teamID: string, userID: string) {
    await teamsApi.removeMember(teamID, userID)
    set((state) => ({
      members: state.members.filter((m) => m.user?.id !== userID),
    }))
  },

  async addRosterMember(teamID: string, data: { name: string; jersey_number?: number | null; position?: string | null }) {
    const member = await teamsApi.addRosterMember(teamID, data)
    const mwu: MemberWithUser = { member, user: null }
    set((state) => ({ members: [...state.members, mwu] }))
    return member
  },

  async updateMember(teamID: string, memberID: string, data: { jersey_number?: number | null; position?: string | null; name?: string }) {
    const member = await teamsApi.updateMember(teamID, memberID, data)
    set((state) => ({
      members: state.members.map((m) => m.member.id === memberID ? { ...m, member } : m),
    }))
    return member
  },
}))
