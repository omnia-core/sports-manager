import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { usePlaybookStore } from '../../stores/playbookStore'
import { useTeamStore } from '../../stores/teamStore'
import { useAuthStore } from '../../stores/authStore'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Spinner from '../../components/ui/Spinner'
import Modal from '../../components/ui/Modal'
import Input from '../../components/ui/Input'
import { ApiError } from '../../api/client'
import type { Play } from '../../types'

type PlayCategory = Play['category']

const categoryVariant: Record<PlayCategory, 'green' | 'blue' | 'yellow'> = {
  offense: 'green',
  defense: 'blue',
  special: 'yellow',
}

function PlayCard({
  play,
  isCoach,
  onOpen,
  onDelete,
}: {
  play: Play
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
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-foreground">{play.name}</p>
          <Badge variant={categoryVariant[play.category]}>{play.category}</Badge>
        </div>
        {play.description && (
          <p className="mt-1 truncate text-xs text-foreground/50">{play.description}</p>
        )}
      </div>
      {isCoach && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          className="flex-shrink-0 rounded p-1 text-foreground/30 hover:bg-red-900/30 hover:text-red-400"
          aria-label="Delete play"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      )}
    </div>
  )
}

interface CreatePlayModalProps {
  onClose: () => void
  onSubmit: (name: string, category: PlayCategory) => Promise<void>
}

function CreatePlayModal({ onClose, onSubmit }: CreatePlayModalProps) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState<PlayCategory>('offense')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setIsLoading(true)
    setError('')
    try {
      await onSubmit(name.trim(), category)
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create play.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Modal title="New Play" onClose={onClose}>
      <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">
        <Input
          label="Play name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Pick and Roll"
          autoFocus
        />
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-foreground/70">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as PlayCategory)}
            className="rounded-md border border-secondary/20 bg-background px-3 py-2 text-sm text-foreground focus:border-secondary focus:outline-none"
          >
            <option value="offense">Offense</option>
            <option value="defense">Defense</option>
            <option value="special">Special</option>
          </select>
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading}>
            Create Play
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default function PlaybookPage() {
  const { playbookID } = useParams<{ playbookID: string }>()
  const navigate = useNavigate()
  const { currentPlaybook, plays, isLoading, fetchPlays, createPlay, deletePlay } = usePlaybookStore()
  const { currentTeam } = useTeamStore()
  const { user } = useAuthStore()
  const [showCreateModal, setShowCreateModal] = useState(false)

  useEffect(() => {
    if (!playbookID) return
    void fetchPlays(playbookID)
  }, [playbookID, fetchPlays])

  const isCoach = currentTeam?.coach_id === user?.id

  async function handleDeletePlay(playID: string) {
    if (!window.confirm('Delete this play? This cannot be undone.')) return
    await deletePlay(playID)
  }

  async function handleCreatePlay(name: string, category: PlayCategory) {
    if (!playbookID) return
    const play = await createPlay(playbookID, { name, category })
    navigate(`/plays/${play.id}`)
  }

  if (isLoading || !currentPlaybook) {
    return (
      <div className="flex justify-center py-24">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div>
      {/* Breadcrumb + header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="mb-1 flex items-center gap-2">
            {currentTeam && (
              <>
                <button
                  onClick={() => navigate(`/teams/${currentTeam.id}`)}
                  className="text-sm text-foreground/40 hover:text-foreground"
                >
                  {currentTeam.name}
                </button>
                <span className="text-foreground/20">/</span>
              </>
            )}
            <span className="text-sm text-foreground/60">Playbooks</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">{currentPlaybook.name}</h1>
          {currentPlaybook.description && (
            <p className="mt-1 text-sm text-foreground/50">{currentPlaybook.description}</p>
          )}
        </div>
        {isCoach && (
          <Button onClick={() => setShowCreateModal(true)}>New Play</Button>
        )}
      </div>

      {/* Play list */}
      {plays.length === 0 ? (
        <div className="rounded-lg border border-secondary/10 bg-primary py-16 text-center">
          <p className="text-sm text-foreground/40">No plays yet.</p>
          {isCoach && (
            <p className="mt-1 text-xs text-foreground/30">Click "New Play" to add the first one.</p>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {plays.map((play) => (
            <PlayCard
              key={play.id}
              play={play}
              isCoach={isCoach}
              onOpen={() => navigate(`/plays/${play.id}`)}
              onDelete={() => void handleDeletePlay(play.id)}
            />
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreatePlayModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreatePlay}
        />
      )}
    </div>
  )
}
