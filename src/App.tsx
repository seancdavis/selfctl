import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useSearchParams } from 'react-router-dom'
import { AuthContext, useAuthProvider, useAuth } from '@/hooks/useAuth'
import { PageLoader } from '@/components/LoadingSpinner'
import { AppLayout } from '@/components/layout/AppLayout'
import { SignIn } from '@/pages/auth/SignIn'
import { Unauthorized } from '@/pages/auth/Unauthorized'
import { Dashboard } from '@/pages/Dashboard'
import { Health } from '@/pages/health/Health'
import { WeeklyGoals } from '@/pages/goals/WeeklyGoals'
import { WeekView } from '@/pages/goals/WeekView'
import { TaskDetail } from '@/pages/goals/TaskDetail'
import { WeekWizard } from '@/pages/goals/WeekWizard'
import { Backlog } from '@/pages/goals/Backlog'
import { BacklogDetail } from '@/pages/goals/BacklogDetail'
import { Recurring } from '@/pages/goals/Recurring'
import { Categories } from '@/pages/goals/Categories'
import { CategoriesProvider } from '@/contexts/CategoriesContext'

function OAuthCallbackHandler({ refetch }: { refetch: () => Promise<void> }) {
  const [searchParams, setSearchParams] = useSearchParams()

  useEffect(() => {
    if (searchParams.has('neon_auth_session_verifier')) {
      refetch().then(() => {
        searchParams.delete('neon_auth_session_verifier')
        setSearchParams(searchParams, { replace: true })
      })
    }
  }, [searchParams, setSearchParams, refetch])

  return null
}

function AuthenticatedApp() {
  const { authenticated, approved } = useAuth()

  if (!authenticated) {
    return <SignIn />
  }

  if (!approved) {
    return <Unauthorized />
  }

  return (
    <CategoriesProvider>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/health" element={<Health />} />
          <Route path="/goals/weekly" element={<WeeklyGoals />} />
          <Route path="/goals/weekly/new" element={<WeekWizard />} />
          <Route path="/goals/weekly/:weekId" element={<WeekView />} />
          <Route path="/goals/weekly/:weekId/tasks/:taskId" element={<TaskDetail />} />
          <Route path="/goals/backlog" element={<Backlog />} />
          <Route path="/goals/backlog/:itemId" element={<BacklogDetail />} />
          <Route path="/goals/recurring" element={<Recurring />} />
          <Route path="/settings/categories" element={<Categories />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </CategoriesProvider>
  )
}

function AppContent() {
  const authValue = useAuthProvider()

  if (authValue.loading) {
    return <PageLoader message="Loading..." />
  }

  return (
    <AuthContext.Provider value={authValue}>
      <BrowserRouter>
        <OAuthCallbackHandler refetch={authValue.refetch} />
        <AuthenticatedApp />
      </BrowserRouter>
    </AuthContext.Provider>
  )
}

export default function App() {
  return <AppContent />
}
