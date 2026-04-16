import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTeamStore } from '../../stores/teamStore'
import { useAuthStore } from '../../stores/authStore'
import { usePlaybookStore } from '../../stores/playbookStore'
import { useGameStore } from '../../stores/gameStore'
import { teamsApi } from '../../api/teams'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Spinner from '../../components/ui/Spinner'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import { ApiError } from '../../api/client'
import type { MemberWithUser, Playbook, Game } from '../../types'

type Tab = 'roster' | 'playbooks' | 'games'

function RoleBadge({ role }: { role: 'coach' | 'player' }) {
  return <Badge variant={role === 'coach' ? 'blue' : 'gray'}>{role === 'coach' ? 'Coach' : 'Player'}</Badge>
}

// ─── Add Roster Member Form ───────────────────────────────────────────────────

function AddRosterForm({ teamID, onDone }: { teamID: string; onDone: () => void }) {
  const { addRosterMember } = useTeamStore()
  const [name, setName] = useState('')
  const [jersey, setJersey] = useState('')
  const [position, setPosition] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setIsLoading(true)
    setError('')
    try {
      await addRosterMember(teamID, {
        name: name.trim(),
        jersey_number: jersey ? parseInt(jersey, 10) : null,
        position: position.trim() || null,
      })
      setName('')
      setJersey('')
      setPosition('')
      onDone()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to add player.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="mt-4 flex flex-col gap-3 rounded-lg border border-secondary/20 bg-primary p-4">
      <p className="text-sm font-medium text-foreground/70">Add player to roster</p>
      <div className="flex gap-2">
        <Input
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Player name"
          className="flex-1"
          disabled={isLoading}
        />
        <Input
          label="Jersey #"
          type="number"
          value={jersey}
          onChange={(e) => setJersey(e.target.value)}
          placeholder="23"
          className="w-24"
          disabled={isLoading}
        />
        <Input
          label="Position"
          value={position}
          onChange={(e) => setPosition(e.target.value)}
          placeholder="PG"
          className="w-24"
          disabled={isLoading}
        />
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" type="button" onClick={onDone}>Cancel</Button>
        <Button type="submit" isLoading={isLoading}>Add Player</Button>
      </div>
    </form>
  )
}

// ─── Inline Invite Form (for placeholder slots) ───────────────────────────────

function SlotInviteForm({ teamID, memberID, onDone }: { teamID: string; memberID: string; onDone: () => void }) {
  const { inviteMember } = useTeamStore()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || status === 'loading') return
    setStatus('loading')
    setMessage('')
    try {
      await inviteMember(teamID, email.trim(), memberID)
      setStatus('success')
      setMessage(`Invite sent to ${email.trim()}.`)
    } catch (err) {
      setStatus('error')
      setMessage(err instanceof ApiError ? err.message : 'Failed to send invite.')
    }
  }

  if (status === 'success') {
    return (
      <div className="mt-2 flex items-center gap-2">
        <p className="text-xs text-accent">{message}</p>
        <button onClick={onDone} className="text-xs text-foreground/40 hover:text-foreground">Done</button>
      </div>
    )
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="mt-2 flex gap-2">
      <Input
        label=""
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="player@example.com"
        className="flex-1"
        disabled={status === 'loading'}
      />
      <Button type="submit" isLoading={status === 'loading'} className="self-end">Send</Button>
      <Button variant="secondary" type="button" onClick={onDone} className="self-end">Cancel</Button>
      {status === 'error' && <p className="text-xs text-red-400">{message}</p>}
    </form>
  )
}

// ─── Inline Edit Form ─────────────────────────────────────────────────────────

function EditMemberForm({
  teamID,
  mwu,
  onDone,
}: {
  teamID: string
  mwu: MemberWithUser
  onDone: () => void
}) {
  const { updateMember } = useTeamStore()
  const { member, user } = mwu
  const isPlaceholder = user === null
  const [name, setName] = useState(member.name ?? '')
  const [jersey, setJersey] = useState(member.jersey_number !== null ? String(member.jersey_number) : '')
  const [position, setPosition] = useState(member.position ?? '')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    try {
      await updateMember(teamID, member.id, {
        jersey_number: jersey ? parseInt(jersey, 10) : null,
        position: position.trim() || null,
        name: isPlaceholder ? (name.trim() || undefined) : undefined,
      })
      onDone()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="mt-2 flex flex-wrap items-end gap-2">
      {isPlaceholder && (
        <Input
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Player name"
          className="w-36"
          disabled={isLoading}
        />
      )}
      <Input
        label="Jersey #"
        type="number"
        value={jersey}
        onChange={(e) => setJersey(e.target.value)}
        placeholder="23"
        className="w-20"
        disabled={isLoading}
      />
      <Input
        label="Position"
        value={position}
        onChange={(e) => setPosition(e.target.value)}
        placeholder="PG"
        className="w-20"
        disabled={isLoading}
      />
      {error && <p className="w-full text-xs text-red-400">{error}</p>}
      <Button type="submit" isLoading={isLoading}>Save</Button>
      <Button variant="secondary" type="button" onClick={onDone}>Cancel</Button>
    </form>
  )
}

// ─── Member Row ───────────────────────────────────────────────────────────────

function MemberRow({
  mwu,
  teamID,
  isCoach,
  isCurrentUser,
  onRemove,
}: {
  mwu: MemberWithUser
  teamID: string
  isCoach: boolean
  isCurrentUser: boolean
  onRemove: () => void
}) {
  const { member, user } = mwu
  const canRemove = isCoach && member.role !== 'coach'
  const isPlaceholder = user === null
  const displayName = isPlaceholder ? (member.name ?? 'Unnamed') : user.name
  const [showInvite, setShowInvite] = useState(false)
  const [showEdit, setShowEdit] = useState(false)

  return (
    <div className="border-b border-secondary/10 py-3 last:border-0">
      <div className="flex items-center gap-4">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-secondary/20 text-sm font-semibold text-accent">
          {displayName.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">
            {displayName}
            {isCurrentUser && <span className="ml-1 text-xs text-foreground/30">(you)</span>}
          </p>
          {isPlaceholder ? (
            <p className="text-xs text-foreground/30 italic">No account yet</p>
          ) : (
            <p className="truncate text-xs text-foreground/40">{user.email}</p>
          )}
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          {member.jersey_number !== null && (
            <span className="text-xs text-foreground/40">#{member.jersey_number}</span>
          )}
          {member.position && (
            <span className="text-xs text-foreground/40">{member.position}</span>
          )}
          <RoleBadge role={member.role} />
          {isCoach && (
            <button
              onClick={() => { setShowEdit((v) => !v); setShowInvite(false) }}
              className="rounded p-1 text-foreground/30 hover:bg-secondary/10 hover:text-foreground/60"
              aria-label={`Edit ${displayName}`}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l-4 1 1-4L15.232 5.232a2 2 0 012.828 0l.708.708a2 2 0 010 2.828L9 13z" />
              </svg>
            </button>
          )}
          {isCoach && isPlaceholder && !showInvite && !showEdit && (
            <button
              onClick={() => setShowInvite(true)}
              className="rounded px-2 py-1 text-xs text-accent border border-secondary/30 hover:bg-secondary/10"
            >
              Invite
            </button>
          )}
          {canRemove && (
            <button
              onClick={onRemove}
              className="rounded p-1 text-foreground/30 hover:bg-red-900/30 hover:text-red-400"
              aria-label={`Remove ${displayName}`}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>
      {showEdit && (
        <div className="mt-2 pl-13">
          <EditMemberForm teamID={teamID} mwu={mwu} onDone={() => setShowEdit(false)} />
        </div>
      )}
      {showInvite && (
        <div className="mt-2 pl-13">
          <SlotInviteForm teamID={teamID} memberID={member.id} onDone={() => setShowInvite(false)} />
        </div>
      )}
    </div>
  )
}

// ─── General Invite Form ──────────────────────────────────────────────────────

function InviteForm({ teamID }: { teamID: string }) {
  const { inviteMember } = useTeamStore()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || status === 'loading') return
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
      <p className="text-sm font-medium text-foreground/70">Invite by email</p>
      <div className="flex gap-2">
        <Input
          label=""
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="player@example.com"
          className="flex-1"
          disabled={status === 'loading'}
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

// ─── Edit Team Modal ──────────────────────────────────────────────────────────

function EditTeamModal({
  initialName,
  onClose,
  onSubmit,
}: {
  initialName: string
  onClose: () => void
  onSubmit: (name: string) => Promise<unknown>
}) {
  const [name, setName] = useState(initialName)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setIsLoading(true)
    setError('')
    try {
      await onSubmit(name.trim())
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update team.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Modal title="Edit Team" onClose={onClose}>
      <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">
        <Input
          label="Team name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading}>
            Save
          </Button>
        </div>
      </form>
    </Modal>
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

// ─── Games tab ────────────────────────────────────────────────────────────────

function GamesTab({ teamID, isCoach }: { teamID: string; isCoach: boolean }) {
  const navigate = useNavigate()
  const { games, isLoading, fetchGames, createGame, deleteGame } = useGameStore()
  const [showCreate, setShowCreate] = useState(false)
  const [opponentName, setOpponentName] = useState('')
  const [gameDate, setGameDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  useEffect(() => {
    void fetchGames(teamID)
  }, [teamID, fetchGames])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!opponentName.trim()) return
    setCreating(true)
    setCreateError('')
    try {
      const game = await createGame(teamID, { opponent_name: opponentName.trim(), game_date: gameDate })
      navigate(`/games/${game.id}`)
    } catch {
      setCreateError('Failed to create game.')
      setCreating(false)
    }
  }

  function gameResult(g: Game): string {
    if (g.team_score === null || g.opponent_score === null) return '—'
    if (g.team_score > g.opponent_score) return 'W'
    if (g.team_score < g.opponent_score) return 'L'
    return 'T'
  }

  if (isLoading) {
    return <div className="flex justify-center py-12"><Spinner size="lg" /></div>
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-foreground/50">{games.length} game{games.length !== 1 ? 's' : ''}</p>
        {isCoach && <Button onClick={() => setShowCreate((v) => !v)}>Log Game</Button>}
      </div>

      {showCreate && isCoach && (
        <form onSubmit={(e) => void handleCreate(e)} className="mb-4 flex flex-col gap-3 rounded-lg border border-secondary/20 bg-primary p-4">
          <p className="text-sm font-medium text-foreground/70">New Game</p>
          <div className="flex gap-3">
            <Input
              label="Opponent"
              value={opponentName}
              onChange={(e) => setOpponentName(e.target.value)}
              placeholder="e.g. Lakers"
              className="flex-1"
            />
            <Input
              label="Date"
              type="date"
              value={gameDate}
              onChange={(e) => setGameDate(e.target.value)}
            />
          </div>
          {createError && <p className="text-sm text-red-400">{createError}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" isLoading={creating}>Create</Button>
          </div>
        </form>
      )}

      {games.length === 0 ? (
        <div className="rounded-lg border border-secondary/10 bg-primary py-16 text-center">
          <p className="text-sm text-foreground/40">No games logged yet.</p>
          {isCoach && <p className="mt-1 text-xs text-foreground/30">Click "Log Game" to add your first game.</p>}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {games.map((g) => {
            const result = gameResult(g)
            const resultColor = result === 'W' ? 'text-secondary' : result === 'L' ? 'text-red-400' : 'text-foreground/40'
            return (
              <div
                key={g.id}
                onClick={() => navigate(`/games/${g.id}`)}
                className="flex cursor-pointer items-center justify-between rounded-lg border border-secondary/20 bg-primary px-4 py-3 transition-colors hover:border-secondary/40"
              >
                <div>
                  <p className="text-sm font-semibold text-foreground">vs {g.opponent_name}</p>
                  <p className="text-xs text-foreground/40">{g.game_date}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm tabular-nums text-foreground/70">
                    {g.team_score ?? '—'} — {g.opponent_score ?? '—'}
                  </span>
                  <span className={`text-sm font-bold ${resultColor}`}>{result}</span>
                  {isCoach && (
                    <button
                      onClick={(e) => { e.stopPropagation(); void deleteGame(g.id) }}
                      className="rounded p-1 text-foreground/30 hover:bg-red-900/30 hover:text-red-400"
                      aria-label="Delete game"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function TeamDetailPage() {
  const { teamID } = useParams<{ teamID: string }>()
  const navigate = useNavigate()
  const { currentTeam, members, isTeamLoading, isMembersLoading, fetchTeam, fetchMembers, updateTeam, removeMember } = useTeamStore()
  const { user } = useAuthStore()
  const [activeTab, setActiveTab] = useState<Tab>('roster')
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [removeError, setRemoveError] = useState<string | null>(null)
  const [showAddRoster, setShowAddRoster] = useState(false)

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

  async function handleRemoveMember(memberID: string, displayName: string) {
    if (!teamID || !window.confirm(`Remove ${displayName} from this team?`)) return
    setRemoveError(null)
    try {
      await removeMember(teamID, memberID)
    } catch (err) {
      setRemoveError(err instanceof ApiError ? err.message : 'Failed to remove member.')
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
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setShowEditModal(true)}>
              Edit
            </Button>
            <Button variant="danger" isLoading={isDeleting} onClick={() => void handleDelete()}>
              Delete Team
            </Button>
          </div>
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
          {(['roster', 'playbooks', 'games'] as Tab[]).map((tab) => (
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
              <>
                {removeError && (
                  <p className="mb-3 rounded-md bg-red-900/30 px-3 py-2 text-sm text-red-300 border border-red-800">
                    {removeError}
                  </p>
                )}
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-sm text-foreground/50">{members.length} member{members.length !== 1 ? 's' : ''}</p>
                  {isCoach && (
                    <Button onClick={() => setShowAddRoster((v) => !v)}>Add Player</Button>
                  )}
                </div>
                <div className="rounded-lg border border-secondary/20 bg-primary px-4">
                  {members.length === 0 ? (
                    <p className="py-8 text-center text-sm text-foreground/40">
                      No members yet.
                      {isCoach && <span className="block mt-1 text-xs text-foreground/30">Use "Add Player" to add roster slots.</span>}
                    </p>
                  ) : (
                    members.map((mwu) => (
                      <MemberRow
                        key={mwu.member.id}
                        mwu={mwu}
                        teamID={teamID!}
                        isCoach={isCoach}
                        isCurrentUser={mwu.user?.id === user?.id}
                        onRemove={() => {
                          const name = mwu.user?.name ?? mwu.member.name ?? 'player'
                          void handleRemoveMember(mwu.member.id, name)
                        }}
                      />
                    ))
                  )}
                </div>
              </>
            )}
            {isCoach && teamID && showAddRoster && (
              <AddRosterForm teamID={teamID} onDone={() => setShowAddRoster(false)} />
            )}
            {isCoach && teamID && <InviteForm teamID={teamID} />}
          </div>
        )}
        {activeTab === 'playbooks' && teamID && (
          <PlaybooksTab teamID={teamID} isCoach={isCoach} />
        )}
        {activeTab === 'games' && teamID && (
          <GamesTab teamID={teamID} isCoach={isCoach} />
        )}
      </div>

      {showEditModal && (
        <EditTeamModal
          initialName={currentTeam.name}
          onClose={() => setShowEditModal(false)}
          onSubmit={(name) => updateTeam(currentTeam.id, { name })}
        />
      )}
    </div>
  )
}
