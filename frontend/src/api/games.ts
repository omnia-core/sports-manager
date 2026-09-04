import { get, post, put, patch, del } from './client'
import type { Game, GameDetail, GameStats } from '../types'

export const gamesApi = {
  list(teamID: string): Promise<{ games: Game[] }> {
    return get<{ games: Game[] }>(`/api/teams/${teamID}/games`)
  },

  create(teamID: string, data: { opponent_name: string; game_date: string }): Promise<Game> {
    return post<Game>(`/api/teams/${teamID}/games`, data)
  },

  getDetail(gameID: string): Promise<GameDetail> {
    return get<GameDetail>(`/api/games/${gameID}`)
  },

  update(
    gameID: string,
    data: { opponent_name?: string; game_date?: string; opponent_score?: number | null },
  ): Promise<Game> {
    return put<Game>(`/api/games/${gameID}`, data)
  },

  remove(gameID: string): Promise<void> {
    return del<void>(`/api/games/${gameID}`)
  },

  upsertStats(gameID: string, memberID: string, stats: GameStats): Promise<GameStats> {
    return put<GameStats>(`/api/games/${gameID}/stats/${memberID}`, stats)
  },

  toggleDNP(gameID: string, memberID: string): Promise<{ is_dnp: boolean }> {
    return patch<{ is_dnp: boolean }>(`/api/games/${gameID}/players/${memberID}`)
  },
}
