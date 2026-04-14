export interface User {
  id: string
  email: string
  name: string
  avatar_url: string | null
  created_at: string
}

export interface Team {
  id: string
  name: string
  sport: string
  coach_id: string
  logo_url: string | null
  created_at: string
}

export interface TeamMember {
  id: string
  team_id: string
  user_id: string
  role: 'coach' | 'player'
  jersey_number: number | null
  position: string | null
  joined_at: string
}

export interface MemberWithUser {
  member: TeamMember
  user: {
    id: string
    name: string
    email: string
    avatar_url: string | null
  }
}

export interface Playbook {
  id: string
  team_id: string
  name: string
  description: string | null
  created_at: string
}

export interface Play {
  id: string
  playbook_id: string
  name: string
  category: 'offense' | 'defense' | 'special'
  description: string | null
  diagram_json: DiagramJSON | null
  created_at: string
}

export interface DiagramJSON {
  background: 'halfcourt' | 'fullcourt'
  players: PlayerToken[]
  arrows: Arrow[]
  annotations: Annotation[]
}

export interface PlayerToken {
  id: string
  x: number
  y: number
  team: 'offense' | 'defense'
  label: string
}

export interface Arrow {
  id: string
  from: string
  points: number[]
  type: 'run' | 'pass' | 'screen'
}

export interface Annotation {
  id: string
  x: number
  y: number
  text: string
}

export interface Game {
  id: string
  team_id: string
  opponent_name: string
  game_date: string  // "YYYY-MM-DD"
  team_score: number | null
  opponent_score: number | null
  created_at: string
}

export interface GameStats {
  mins: number
  pts: number
  fgm: number
  fga: number
  three_pm: number
  three_pa: number
  ftm: number
  fta: number
  orb: number
  drb: number
  ast: number
  stl: number
  blk: number
  tov: number
  pf: number
  plus_minus: number
}

export interface GamePlayer {
  user_id: string
  name: string
  jersey_number: number | null
  position: string | null
  is_dnp: boolean
  stats: GameStats | null
}

export interface GameDetail {
  game: Game
  players: GamePlayer[]
}
