import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTeamStore } from '../../stores/teamStore'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import Input from '../../components/ui/Input'
import Spinner from '../../components/ui/Spinner'
import { ApiError } from '../../api/client'

function CreateTeamModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { createTeam } = useTeamStore()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError('Team name is required.')
      return
    }
    setIsSubmitting(true)
    setError('')
    try {
      const team = await createTeam({ name: name.trim(), sport: 'basketball' })
      onCreated()
      navigate(`/teams/${team.id}`)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create team.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal title="Create Team" onClose={onClose}>
      <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">
        <Input
          label="Team name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Westside Warriors"
          autoFocus
        />
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-foreground/70">Sport</span>
          <div className="flex items-center gap-2 rounded-md border border-secondary/20 bg-background px-3 py-2">
            <Badge variant="blue">Basketball</Badge>
            <span className="text-xs text-foreground/40">More sports coming soon</span>
          </div>
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            Create Team
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default function TeamsPage() {
  const { teams, isLoading, fetchTeams } = useTeamStore()
  const navigate = useNavigate()
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => {
    void fetchTeams()
  }, [fetchTeams])

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">My Teams</h1>
        <Button onClick={() => setShowCreate(true)}>Create Team</Button>
      </div>

      {isLoading ? (
        <div className="mt-16 flex justify-center">
          <Spinner size="lg" />
        </div>
      ) : teams.length === 0 ? (
        <div className="mt-16 text-center">
          <p className="text-foreground/50">No teams yet — create your first team.</p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <button
              key={team.id}
              onClick={() => navigate(`/teams/${team.id}`)}
              className="flex flex-col gap-3 rounded-lg border border-secondary/20 bg-primary p-5 text-left transition-colors hover:border-secondary"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-base font-semibold text-foreground">{team.name}</span>
                <Badge variant="blue">{team.sport}</Badge>
              </div>
              <span className="text-xs text-foreground/40">
                Created {new Date(team.created_at).toLocaleDateString()}
              </span>
            </button>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateTeamModal
          onClose={() => setShowCreate(false)}
          onCreated={() => setShowCreate(false)}
        />
      )}
    </>
  )
}
