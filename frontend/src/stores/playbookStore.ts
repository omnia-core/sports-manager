import { create } from 'zustand'
import { playbooksApi } from '../api/playbooks'
import type { Playbook, Play, DiagramJSON } from '../types'

interface PlaybookState {
  playbooks: Playbook[]
  currentPlaybook: Playbook | null
  plays: Play[]
  currentPlay: Play | null
  isLoading: boolean
  fetchPlaybooks(teamID: string): Promise<void>
  createPlaybook(teamID: string, data: { name: string; description?: string }): Promise<Playbook>
  deletePlaybook(playbookID: string): Promise<void>
  fetchPlays(playbookID: string): Promise<void>
  fetchPlay(playID: string): Promise<void>
  savePlay(playID: string, diagram: DiagramJSON): Promise<void>
  createPlay(playbookID: string, data: { name: string; category: string }): Promise<Play>
  deletePlay(playID: string): Promise<void>
  setCurrentPlay(play: Play | null): void
}

export const usePlaybookStore = create<PlaybookState>((set) => ({
  playbooks: [],
  currentPlaybook: null,
  plays: [],
  currentPlay: null,
  isLoading: false,

  async fetchPlaybooks(teamID: string) {
    set({ isLoading: true })
    try {
      const { playbooks } = await playbooksApi.list(teamID)
      set({ playbooks })
    } finally {
      set({ isLoading: false })
    }
  },

  async createPlaybook(teamID: string, data: { name: string; description?: string }) {
    const playbook = await playbooksApi.create(teamID, data)
    set((state) => ({ playbooks: [...state.playbooks, playbook] }))
    return playbook
  },

  async deletePlaybook(playbookID: string) {
    await playbooksApi.remove(playbookID)
    set((state) => ({
      playbooks: state.playbooks.filter((p) => p.id !== playbookID),
    }))
  },

  async fetchPlays(playbookID: string) {
    // Clear stale data immediately so the previous playbook's content
    // is not shown while the new fetch is in flight.
    set({ isLoading: true, currentPlaybook: null, plays: [] })
    try {
      const [playbook, { plays }] = await Promise.all([
        playbooksApi.get(playbookID),
        playbooksApi.listPlays(playbookID),
      ])
      set({ currentPlaybook: playbook, plays })
    } finally {
      set({ isLoading: false })
    }
  },

  async savePlay(playID: string, diagram: DiagramJSON) {
    const updated = await playbooksApi.updatePlay(playID, { diagram_json: diagram })
    set((state) => ({
      currentPlay: state.currentPlay?.id === playID ? updated : state.currentPlay,
      plays: state.plays.map((p) => (p.id === playID ? updated : p)),
    }))
  },

  async createPlay(playbookID: string, data: { name: string; category: string }) {
    const play = await playbooksApi.createPlay(playbookID, data)
    set((state) => ({ plays: [...state.plays, play] }))
    return play
  },

  async deletePlay(playID: string) {
    await playbooksApi.removePlay(playID)
    set((state) => ({
      plays: state.plays.filter((p) => p.id !== playID),
    }))
  },

  setCurrentPlay(play: Play | null) {
    set({ currentPlay: play })
  },

  async fetchPlay(playID: string) {
    // Clear stale data immediately so the previous play's content
    // is not shown while the new fetch is in flight.
    set({ isLoading: true, currentPlay: null, currentPlaybook: null })
    try {
      const play = await playbooksApi.getPlay(playID)
      const playbook = await playbooksApi.get(play.playbook_id)
      set({ currentPlay: play, currentPlaybook: playbook })
    } finally {
      set({ isLoading: false })
    }
  },
}))
