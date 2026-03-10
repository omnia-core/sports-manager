import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTeamStore } from '../../stores/teamStore'
import { useAuthStore } from '../../stores/authStore'
import { usePlaybookStore } from '../../stores/playbookStore'
import { teamsApi } from '../../api/teams'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Spinner from '../../components/ui/Spinner'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import { ApiError } from '../../api/client'
import type { MemberWithUser, Playbook } from '../../types'

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

// ─── Playbooks tab ────────────────────────────────────────────────────────────

interface CreatePlaybookModalProps {
  onClose: () => void
  onSubmit: (name: string, description: string) => Promise<void>
}

function CreatePlaybookModal({ onClose, onSubmit }: CreatePlaybookModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setIsLoading(true)
    setError('')
    try {
      await onSubmit(name.trim(), description.trim())
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create playbook.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Modal title="New Playbook" onClose={onClose}>
      <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">
        <Input
          label="Playbook name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Offensive Sets"
          autoFocus
        />
        <Input
          label="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Short description..."
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading}>
            Create Playbook
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function PlaybookCard({
  playbook,
  isCoach,
  onOpen,
  onDelete,
}: {
  playbook: Playbook
  isCoach: boolean
  onOpen: () => void
  onDelete: () => void
}) {
  return (
    <div
      className="flex cursor-pointer items-start justify-between gap-4 rounded-lg border border-secondary/20 bg-primary p-4 transition-colors hover:border-secondary/40"
      onClick={onOpen}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{playbook.name}</p>
        {playbook.description && (
          <p className="mt-1 truncate text-xs text-foreground/50">{playbook.description}</p>
        )}
      </div>
      {isCoach && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          className="flex-shrink-0 rounded p-1 text-foreground/30 hover:bg-red-900/30 hover:text-red-400"
          aria-label="Delete playbook"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      )}
    </div>
  )
}

function PlaybooksTab({ teamID, isCoach }: { teamID: string; isCoach: boolean }) {
  const navigate = useNavigate()
  const { playbooks, isLoading, fetchPlaybooks, createPlaybook, deletePlaybook } = usePlaybookStore()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    void fetchPlaybooks(teamID)
  }, [teamID, fetchPlaybooks])

  async function handleDelete(playbookID: string) {
    if (!window.confirm('Delete this playbook? All plays inside will be lost.')) return
    setDeleteError(null)
    try {
      await deletePlaybook(playbookID)
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : 'Failed to delete playbook.')
    }
  }

  async function handleCreate(name: string, description: string) {
    const pb = await createPlaybook(teamID, { name, description: description || undefined })
    navigate(`/playbooks/${pb.id}`)
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-foreground/50">{playbooks.length} playbook{playbooks.length !== 1 ? 's' : ''}</p>
        {isCoach && (
          <Button onClick={() => setShowCreateModal(true)}>New Playbook</Button>
        )}
      </div>

      {deleteError && (
        <p className="mb-3 rounded-md bg-red-900/30 px-3 py-2 text-sm text-red-300 border border-red-800">
          {deleteError}
        </p>
      )}

      {playbooks.length === 0 ? (
        <div className="rounded-lg border border-secondary/10 bg-primary py-16 text-center">
          <p className="text-sm text-foreground/40">No playbooks yet.</p>
          {isCoach && (
            <p className="mt-1 text-xs text-foreground/30">Click "New Playbook" to get started.</p>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {playbooks.map((pb) => (
            <PlaybookCard
              key={pb.id}
              playbook={pb}
              isCoach={isCoach}
              onOpen={() => navigate(`/playbooks/${pb.id}`)}
              onDelete={() => void handleDelete(pb.id)}
            />
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreatePlaybookModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreate}
        />
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function TeamDetailPage() {
  const { teamID } = useParams<{ teamID: string }>()
  const navigate = useNavigate()
  const { currentTeam, members, isTeamLoading, isMembersLoading, fetchTeam, fetchMembers } = useTeamStore()
  const { user } = useAuthStore()
  const [activeTab, setActiveTab] = useState<Tab>('roster')
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    if (!teamID) return
    void fetchTeam(teamID)
    void fetchMembers(teamID)
  }, [teamID, fetchTeam, fetchMembers])

  const isCoach = currentTeam?.coach_id === user?.id

  async function handleDelete() {
    if (!teamID || !window.confirm('Delete this team? This cannot be undone.')) return
    setIsDeleting(true)
    setDeleteError(null)
    try {
      await teamsApi.remove(teamID)
      navigate('/teams')
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : 'Failed to delete team.')
      setIsDeleting(false)
    }
  }

  if (isTeamLoading || !currentTeam) {
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

      {deleteError && (
        <p className="mt-3 rounded-md bg-red-900/30 px-3 py-2 text-sm text-red-300 border border-red-800">
          {deleteError}
        </p>
      )}

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
            {isMembersLoading ? (
              <div className="flex justify-center py-12">
                <Spinner size="lg" />
              </div>
            ) : (
              <div className="rounded-lg border border-secondary/20 bg-primary px-4">
                {members.length === 0 ? (
                  <p className="py-8 text-center text-sm text-foreground/40">No members yet.</p>
                ) : (
                  members.map((mwu) => <MemberRow key={mwu.member.id} mwu={mwu} />)
                )}
              </div>
            )}
            {isCoach && teamID && <InviteForm teamID={teamID} />}
          </div>
        )}
        {activeTab === 'playbooks' && teamID && (
          <PlaybooksTab teamID={teamID} isCoach={isCoach} />
        )}
      </div>
    </div>
  )
}
