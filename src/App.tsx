import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useSearchParams, useNavigate } from 'react-router-dom'
import { AuthContext, useAuthProvider, useAuth } from '@/hooks/useAuth'
import { PageLoader } from '@/components/LoadingSpinner'
import { AppLayout } from '@/components/layout/AppLayout'
import { SignIn } from '@/pages/auth/SignIn'
import { Unauthorized } from '@/pages/auth/Unauthorized'
import { Dashboard } from '@/pages/Dashboard'
import { Health } from '@/pages/health/Health'
import { WeeklyGoals } from '@/pages/goals/WeeklyGoals'
import { WeekView } from '@/pages/goals/WeekView'
import { TaskModal } from '@/pages/goals/TaskModal'
import { WeekWizard } from '@/pages/goals/WeekWizard'
import { Backlog } from '@/pages/goals/Backlog'
import { BacklogModal } from '@/pages/goals/BacklogModal'
import { Recurring } from '@/pages/goals/Recurring'
import { RecurringTaskModal } from '@/pages/goals/RecurringTaskModal'
import { Categories } from '@/pages/goals/Categories'
import { CategoryModal } from '@/pages/goals/CategoryModal'
import { CategoriesProvider } from '@/contexts/CategoriesContext'
import { ToastProvider } from '@/contexts/ToastContext'
import { getCurrentWeekId } from '@/lib/dates'

function CurrentWeekRedirect() {
  const navigate = useNavigate()
  useEffect(() => {
    navigate(`/goals/weekly/${getCurrentWeekId()}`, { replace: true })
  }, [navigate])
  return null
}

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
          <Route path="/goals/weekly/current" element={<CurrentWeekRedirect />} />
          <Route path="/goals/weekly/new" element={<WeekWizard />} />
          <Route path="/goals/weekly/:weekId" element={<WeekView />}>
            <Route path="tasks/new" element={<TaskModal />} />
            <Route path="tasks/:taskId" element={<TaskModal />} />
          </Route>
          <Route path="/goals/backlog" element={<Backlog />}>
            <Route path="new" element={<BacklogModal />} />
            <Route path=":itemId" element={<BacklogModal />} />
          </Route>
          <Route path="/goals/recurring" element={<Recurring />}>
            <Route path="new" element={<RecurringTaskModal />} />
            <Route path=":taskId" element={<RecurringTaskModal />} />
          </Route>
          <Route path="/settings/categories" element={<Categories />}>
            <Route path="new" element={<CategoryModal />} />
            <Route path=":id" element={<CategoryModal />} />
          </Route>
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
      <ToastProvider>
        <BrowserRouter>
          <OAuthCallbackHandler refetch={authValue.refetch} />
          <AuthenticatedApp />
        </BrowserRouter>
      </ToastProvider>
    </AuthContext.Provider>
  )
}

export default function App() {
  return <AppContent />
}
