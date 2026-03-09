import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '../../api/auth'
import { useAuthStore } from '../../stores/authStore'
import { ApiError } from '../../api/client'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'

export default function RegisterPage() {
  const navigate = useNavigate()
  const setUser = useAuthStore((s) => s.setUser)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setIsLoading(true)
    try {
      const user = await authApi.register({ name, email, password })
      setUser(user)
      navigate('/teams', { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-xl border border-secondary/20 bg-primary p-8 shadow-sm">
        <h1 className="mb-1 text-2xl font-bold text-foreground">Create account</h1>
        <p className="mb-6 text-sm text-foreground/50">Start managing your team today</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jane Smith"
            required
            autoComplete="name"
          />
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
            autoComplete="new-password"
            minLength={8}
          />

          {error && (
            <p className="rounded-md bg-red-900/30 px-3 py-2 text-sm text-red-300 border border-red-800">{error}</p>
          )}

          <Button type="submit" isLoading={isLoading} className="mt-1 w-full">
            Create account
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-foreground/50">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-secondary hover:text-accent">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
