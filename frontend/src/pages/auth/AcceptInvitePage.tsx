import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { post } from '../../api/client'
import { authApi } from '../../api/auth'
import { useAuthStore } from '../../stores/authStore'
import { ApiError } from '../../api/client'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Spinner from '../../components/ui/Spinner'

// ----------------------------------------------------------------
// Sub-form: inline login for unauthenticated visitors
// ----------------------------------------------------------------
function InlineLoginForm({ onSuccess }: { onSuccess: () => void }) {
  const setUser = useAuthStore((s) => s.setUser)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setIsLoading(true)
    try {
      const user = await authApi.login({ email, password })
      setUser(user)
      onSuccess()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        required
        autoComplete="email"
      />
      <Input
        label="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="••••••••"
        required
        autoComplete="current-password"
      />
      {error && <p className="rounded-md bg-red-900/30 px-3 py-2 text-sm text-red-300 border border-red-800">{error}</p>}
      <Button type="submit" isLoading={isLoading} className="w-full">
        Sign in and accept invite
      </Button>
    </form>
  )
}

// ----------------------------------------------------------------
// Main page
// ----------------------------------------------------------------
type PageState = 'login' | 'accepting' | 'success' | 'error'

export default function AcceptInvitePage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { isAuthenticated, isLoading: authLoading } = useAuthStore()

  const token = searchParams.get('token') ?? ''

  const [pageState, setPageState] = useState<PageState>('login')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  async function acceptInvite() {
    setPageState('accepting')
    try {
      await post<void>(`/api/invites/${token}/accept`)
      setPageState('success')
      setTimeout(() => navigate('/teams', { replace: true }), 1500)
    } catch (err) {
      setErrorMsg(
        err instanceof ApiError ? err.message : 'Could not accept invite. The link may have expired.',
      )
      setPageState('error')
    }
  }

  // Once we know the user is authenticated, accept immediately
  useEffect(() => {
    if (!authLoading && isAuthenticated && token) {
      acceptInvite()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAuthenticated])

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm rounded-xl border border-secondary/20 bg-primary p-8 shadow-sm text-center">
          <p className="text-red-400">Invalid invite link — no token provided.</p>
          <Link to="/login" className="mt-4 inline-block text-sm text-secondary hover:text-accent">
            Go to login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-xl border border-secondary/20 bg-primary p-8 shadow-sm">
        {/* Loading — waiting for auth bootstrap */}
        {authLoading && (
          <div className="flex flex-col items-center gap-4 py-4">
            <Spinner size="lg" />
            <p className="text-sm text-foreground/50">Loading...</p>
          </div>
        )}

        {/* Accepting invite */}
        {!authLoading && pageState === 'accepting' && (
          <div className="flex flex-col items-center gap-4 py-4">
            <Spinner size="lg" />
            <p className="text-sm text-foreground/50">Accepting your invite...</p>
          </div>
        )}

        {/* Success */}
        {pageState === 'success' && (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <p className="text-lg font-semibold text-foreground">You're in!</p>
            <p className="text-sm text-foreground/50">Redirecting you to your teams...</p>
          </div>
        )}

        {/* Error */}
        {pageState === 'error' && (
          <div className="flex flex-col gap-4">
            <p className="rounded-md bg-red-900/30 px-3 py-2 text-sm text-red-300 border border-red-800">{errorMsg}</p>
            <Link to="/teams" className="text-center text-sm text-secondary hover:text-accent">
              Go to my teams
            </Link>
          </div>
        )}

        {/* Unauthenticated — show inline login */}
        {!authLoading && !isAuthenticated && pageState === 'login' && (
          <>
            <h1 className="mb-1 text-2xl font-bold text-foreground">Accept invite</h1>
            <p className="mb-6 text-sm text-foreground/50">
              Sign in to join the team. Don't have an account?{' '}
              <Link to={`/register`} className="text-secondary hover:text-accent">
                Create one
              </Link>
            </p>
            <InlineLoginForm onSuccess={() => { /* effect will fire */ }} />
          </>
        )}
      </div>
    </div>
  )
}
