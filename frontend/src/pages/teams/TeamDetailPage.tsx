import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTeamStore } from '../../stores/teamStore'
import { useAuthStore } from '../../stores/authStore'
import { teamsApi } from '../../api/teams'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Spinner from '../../components/ui/Spinner'
import Input from '../../components/ui/Input'
import { ApiError } from '../../api/client'
import type { MemberWithUser } from '../../types'

type Tab = 'roster' | 'playbooks'

function RoleBadge({ role }: { role: 'coach' | 'player' }) {
  return <Badge variant={role === 'coach' ? 'blue' : 'gray'}>{role === 'coach' ? 'Coach' : 'Player'}</Badge>
}

function MemberRow({ mwu }: { mwu: MemberWithUser }) {
  const { member, user } = mwu
  return (
    <div className="flex items-center gap-4 border-b border-secondary/10 py-3 last:border-0">
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-secondary/20 text-sm font-semibold text-accent">
        {user.name.charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{user.name}</p>
        <p className="truncate text-xs text-foreground/40">{user.email}</p>
      </div>
      <div className="flex flex-shrink-0 items-center gap-2">
        {member.jersey_number !== null && (
          <span className="text-xs text-foreground/40">#{member.jersey_number}</span>
        )}
        <RoleBadge role={member.role} />
      </div>
    </div>
  )
}

function InviteForm({ teamID }: { teamID: string }) {
  const { inviteMember } = useTeamStore()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setStatus('loading')
    setMessage('')
    try {
      await inviteMember(teamID, email.trim())
      setStatus('success')
      setMessage(`Invite sent to ${email.trim()}.`)
      setEmail('')
    } catch (err) {
      setStatus('error')
      setMessage(err instanceof ApiError ? err.message : 'Failed to send invite.')
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="mt-4 flex flex-col gap-3 rounded-lg border border-secondary/20 bg-primary p-4">
      <p className="text-sm font-medium text-foreground/70">Invite a player</p>
      <div className="flex gap-2">
        <Input
          label=""
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="player@example.com"
          className="flex-1"
        />
        <Button type="submit" isLoading={status === 'loading'} className="self-end">
          Send Invite
        </Button>
      </div>
      {status === 'success' && <p className="text-sm text-accent">{message}</p>}
      {status === 'error' && <p className="text-sm text-red-400">{message}</p>}
    </form>
  )
}

export default function TeamDetailPage() {
  const { teamID } = useParams<{ teamID: string }>()
  const navigate = useNavigate()
  const { currentTeam, members, isLoading, fetchTeam, fetchMembers } = useTeamStore()
  const { user } = useAuthStore()
  const [activeTab, setActiveTab] = useState<Tab>('roster')
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (!teamID) return
    void fetchTeam(teamID)
    void fetchMembers(teamID)
  }, [teamID, fetchTeam, fetchMembers])

  const isCoach = currentTeam?.coach_id === user?.id

  async function handleDelete() {
    if (!teamID || !window.confirm('Delete this team? This cannot be undone.')) return
    setIsDeleting(true)
    try {
      await teamsApi.remove(teamID)
      navigate('/teams')
    } catch {
      setIsDeleting(false)
    }
  }

  if (isLoading || !currentTeam) {
    return (
      <div className="flex justify-center py-24">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/teams')}
            className="text-sm text-foreground/40 hover:text-foreground"
          >
            My Teams
          </button>
          <span className="text-foreground/20">/</span>
          <h1 className="text-2xl font-bold text-foreground">{currentTeam.name}</h1>
          <Badge variant="blue">{currentTeam.sport}</Badge>
        </div>
        {isCoach && (
          <Button variant="danger" isLoading={isDeleting} onClick={() => void handleDelete()}>
            Delete Team
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="mt-6 border-b border-secondary/20">
        <nav className="-mb-px flex gap-6">
          {(['roster', 'playbooks'] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`border-b-2 pb-3 text-sm font-medium capitalize transition-colors ${
                activeTab === tab
                  ? 'border-secondary text-secondary'
                  : 'border-transparent text-foreground/50 hover:text-foreground'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <div className="mt-6">
        {activeTab === 'roster' && (
          <div>
            <div className="rounded-lg border border-secondary/20 bg-primary px-4">
              {members.length === 0 ? (
                <p className="py-8 text-center text-sm text-foreground/40">No members yet.</p>
              ) : (
                members.map((mwu) => <MemberRow key={mwu.member.id} mwu={mwu} />)
              )}
            </div>
            {isCoach && teamID && <InviteForm teamID={teamID} />}
          </div>
        )}
        {activeTab === 'playbooks' && (
          <p className="text-sm text-foreground/40">Playbooks — coming soon.</p>
        )}
      </div>
    </div>
  )
}
