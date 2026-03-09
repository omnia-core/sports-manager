import { useAuthStore } from '../../stores/authStore'
import Button from './Button'

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuthStore()

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-secondary/20 bg-primary">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <span className="text-lg font-bold text-foreground">Sports Manager</span>
          <div className="flex items-center gap-3">
            <span className="text-sm text-foreground/60">{user?.name}</span>
            <Button variant="secondary" onClick={() => void logout()}>
              Logout
            </Button>
          </div>
        </div>
      </nav>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  )
}
