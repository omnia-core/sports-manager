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
