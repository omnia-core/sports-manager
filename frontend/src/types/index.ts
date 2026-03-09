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
