import { useEffect, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import Spinner from './components/ui/Spinner'
import ProtectedRoute from './components/ui/ProtectedRoute'
import Layout from './components/ui/Layout'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import AcceptInvitePage from './pages/auth/AcceptInvitePage'
import TeamsPage from './pages/teams/TeamsPage'
import TeamDetailPage from './pages/teams/TeamDetailPage'
import PlaybookPage from './pages/playbooks/PlaybookPage'

// Lazy-load the Konva editor so it doesn't bloat the main bundle
const PlayEditorPage = lazy(() => import('./pages/playbooks/PlayEditorPage'))

function AppRoutes() {
  const { isLoading } = useAuthStore()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/accept-invite" element={<AcceptInvitePage />} />

      {/* Protected routes */}
      <Route
        path="/teams"
        element={
          <ProtectedRoute>
            <Layout>
              <TeamsPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/teams/:teamID"
        element={
          <ProtectedRoute>
            <Layout>
              <TeamDetailPage />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/playbooks/:playbookID"
        element={
          <ProtectedRoute>
            <Layout>
              <PlaybookPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/plays/:playID"
        element={
          <ProtectedRoute>
            <Layout>
              <Suspense fallback={<div className="flex min-h-[60vh] items-center justify-center"><Spinner size="lg" /></div>}>
                <PlayEditorPage />
              </Suspense>
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/teams" replace />} />
      <Route path="*" element={<Navigate to="/teams" replace />} />
    </Routes>
  )
}

export default function App() {
  const init = useAuthStore((s) => s.init)

  useEffect(() => {
    init()
  }, [init])

  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
