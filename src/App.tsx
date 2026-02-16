import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useSearchParams, useNavigate, Link } from 'react-router-dom'
import { AuthContext, useAuthProvider, useAuth } from '@/hooks/useAuth'
import { PageLoader, LoadingSpinner } from '@/components/LoadingSpinner'
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
import { weeksApi } from '@/lib/api'
import { usePageTitle } from '@/hooks/usePageTitle'
import { Plus } from 'lucide-react'

function CurrentWeekPage() {
  usePageTitle('This Week')
  const navigate = useNavigate()
  const [status, setStatus] = useState<'loading' | 'no-active' | 'error'>('loading')

  useEffect(() => {
    weeksApi.findActive()
      .then((week) => {
        navigate(`/goals/weekly/${week.label}`, { replace: true })
      })
      .catch(() => {
        setStatus('no-active')
      })
  }, [navigate])

  if (status === 'loading') {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="text-center py-12">
      <p className="text-zinc-500 text-sm font-mono mb-6">no active week</p>
      <div className="flex items-center justify-center gap-3">
        <Link
          to="/goals/weekly/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono font-medium rounded hover:bg-emerald-500/20 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          create new week
        </Link>
        <Link
          to="/goals/weekly"
          className="inline-flex items-center gap-2 px-4 py-2 text-zinc-500 border border-zinc-700 text-xs font-mono font-medium rounded hover:text-zinc-300 hover:border-zinc-600 transition-colors"
        >
          visit most recent week
        </Link>
      </div>
    </div>
  )
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
          <Route path="/goals/weekly/current" element={<CurrentWeekPage />} />
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
