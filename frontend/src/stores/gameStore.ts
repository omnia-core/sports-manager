import { create } from 'zustand'
import { gamesApi } from '../api/games'
import type { Game, GameDetail, GameStats, GamePlayer } from '../types'

interface GameState {
  games: Game[]
  currentGame: GameDetail | null
  isLoading: boolean
  fetchGames(teamID: string): Promise<void>
  createGame(teamID: string, data: { opponent_name: string; game_date: string }): Promise<Game>
  deleteGame(gameID: string): Promise<void>
  fetchGameDetail(gameID: string): Promise<void>
  updateGame(
    gameID: string,
    data: { opponent_name?: string; game_date?: string; team_score?: number | null; opponent_score?: number | null },
  ): Promise<void>
  upsertStats(gameID: string, userID: string, stats: GameStats): Promise<void>
  toggleDNP(gameID: string, userID: string): Promise<void>
}

export const useGameStore = create<GameState>((set) => ({
  games: [],
  currentGame: null,
  isLoading: false,

  async fetchGames(teamID: string) {
    set({ isLoading: true })
    try {
      const { games } = await gamesApi.list(teamID)
      set({ games })
    } finally {
      set({ isLoading: false })
    }
  },

  async createGame(teamID: string, data: { opponent_name: string; game_date: string }) {
    const game = await gamesApi.create(teamID, data)
    set((s) => ({ games: [game, ...s.games] }))
    return game
  },

  async deleteGame(gameID: string) {
    await gamesApi.remove(gameID)
    set((s) => ({ games: s.games.filter((g) => g.id !== gameID) }))
  },

  async fetchGameDetail(gameID: string) {
    set({ isLoading: true, currentGame: null })
    try {
      const detail = await gamesApi.getDetail(gameID)
      set({ currentGame: detail })
    } finally {
      set({ isLoading: false })
    }
  },

  async updateGame(gameID, data) {
    const game = await gamesApi.update(gameID, data)
    set((s) => ({
      games: s.games.map((g) => (g.id === gameID ? game : g)),
      currentGame: s.currentGame ? { ...s.currentGame, game } : null,
    }))
  },

  async upsertStats(gameID: string, memberID: string, stats: GameStats) {
    const updated = await gamesApi.upsertStats(gameID, memberID, stats)
    set((s) => {
      if (!s.currentGame) return {}
      return {
        currentGame: {
          ...s.currentGame,
          players: s.currentGame.players.map((p: GamePlayer) =>
            p.member_id === memberID ? { ...p, stats: updated } : p,
          ),
        },
      }
    })
  },

  async toggleDNP(gameID: string, memberID: string) {
    const { is_dnp } = await gamesApi.toggleDNP(gameID, memberID)
    set((s) => {
      if (!s.currentGame) return {}
      return {
        currentGame: {
          ...s.currentGame,
          // Only the flag changes. The server's ToggleDNP updates is_dnp and
          // never touches game_stats, so dropping the line locally invented a
          // loss the backend had not performed — and the next box-score edit
          // rebuilt from emptyStats() and committed those zeros over real
          // numbers.
          players: s.currentGame.players.map((p: GamePlayer) =>
            p.member_id === memberID ? { ...p, is_dnp } : p,
          ),
        },
      }
    })
  },
}))
