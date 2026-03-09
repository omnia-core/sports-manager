import { get, post, put, del } from './client'
import type { Playbook, Play, DiagramJSON } from '../types'

export const playbooksApi = {
  list(teamID: string): Promise<{ playbooks: Playbook[] }> {
    return get<{ playbooks: Playbook[] }>(`/api/teams/${teamID}/playbooks`)
  },

  create(teamID: string, data: { name: string; description?: string }): Promise<Playbook> {
    return post<Playbook>(`/api/teams/${teamID}/playbooks`, data)
  },

  get(playbookID: string): Promise<Playbook> {
    return get<Playbook>(`/api/playbooks/${playbookID}`)
  },

  update(playbookID: string, data: { name: string; description?: string }): Promise<Playbook> {
    return put<Playbook>(`/api/playbooks/${playbookID}`, data)
  },

  remove(playbookID: string): Promise<void> {
    return del<void>(`/api/playbooks/${playbookID}`)
  },

  listPlays(playbookID: string): Promise<{ plays: Play[] }> {
    return get<{ plays: Play[] }>(`/api/playbooks/${playbookID}/plays`)
  },

  createPlay(
    playbookID: string,
    data: { name: string; category: string; description?: string; diagram_json?: DiagramJSON },
  ): Promise<Play> {
    return post<Play>(`/api/playbooks/${playbookID}/plays`, data)
  },

  getPlay(playID: string): Promise<Play> {
    return get<Play>(`/api/plays/${playID}`)
  },

  updatePlay(
    playID: string,
    data: { name?: string; category?: string; description?: string; diagram_json?: DiagramJSON },
  ): Promise<Play> {
    return put<Play>(`/api/plays/${playID}`, data)
  },

  removePlay(playID: string): Promise<void> {
    return del<void>(`/api/plays/${playID}`)
  },
}
