import { usePageTitle } from '@/hooks/usePageTitle'
import { Link } from 'react-router-dom'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  YAxis,
  Tooltip,
} from 'recharts'
import { ArrowRight, Plus, ListTodo, Target, Scale } from 'lucide-react'
import { useAsyncData } from '@/hooks/useAsyncData'
import { healthApi, weeksApi } from '@/lib/api'
import { getCurrentWeekId, formatWeekRange } from '@/lib/dates'
import { calculatePercentage, getScoreLevel, getScoreTextColor } from '@/lib/scores'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import type { Week, WeightEntry } from '@/types'

function WeekProgressWidget() {
  const currentWeekId = getCurrentWeekId()
  const { data: weeks, loading } = useAsyncData<Week[]>(() => weeksApi.list(), [])

  const currentWeek = weeks?.find((w) => w.id === currentWeekId)

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
          This Week
        </h3>
        <div className="flex justify-center py-8">
          <LoadingSpinner size="sm" />
        </div>
      </div>
    )
  }

  if (!currentWeek) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
          This Week
        </h3>
        <p className="text-gray-400 text-sm mb-4">No week created yet.</p>
        <Link
          to="/goals/weekly/new"
          className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          <Plus className="w-4 h-4" />
          Create this week
        </Link>
      </div>
    )
  }

  const percentage = calculatePercentage(currentWeek.completedTasks, currentWeek.totalTasks)
  const level = getScoreLevel(percentage)
  const textColor = getScoreTextColor(level)

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
          This Week
        </h3>
        <Link
          to={`/goals/weekly/${currentWeekId}`}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1"
        >
          View <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="flex items-end gap-3 mb-3">
        <span className={`text-4xl font-bold ${textColor}`}>{percentage}%</span>
        <span className="text-sm text-gray-500 pb-1">
          {currentWeek.completedTasks}/{currentWeek.totalTasks} tasks
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-100 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all ${
            level === 'fire'
              ? 'bg-orange-500'
              : level === 'green'
                ? 'bg-green-500'
                : level === 'yellow'
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
          }`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>

      <p className="text-xs text-gray-400 mt-2">
        {formatWeekRange(currentWeek.startDate, currentWeek.endDate)}
      </p>
    </div>
  )
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function WeightTrendWidget() {
  const { data: entries, loading } = useAsyncData<WeightEntry[]>(
    () => healthApi.getWeightEntries(30),
    []
  )

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
          Weight Trend
        </h3>
        <div className="flex justify-center py-8">
          <LoadingSpinner size="sm" />
        </div>
      </div>
    )
  }

  if (!entries || entries.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
          Weight Trend
        </h3>
        <p className="text-gray-400 text-sm">No weight data yet.</p>
      </div>
    )
  }

  const sorted = [...entries].sort(
    (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
  )
  const latest = sorted[sorted.length - 1]
  const oldest = sorted[0]
  const change = latest.weight - oldest.weight
  const chartData = sorted.map((e) => ({
    date: formatDate(e.recordedAt),
    weight: e.weight,
  }))

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
          Weight Trend
        </h3>
        <Link
          to="/health"
          className="text-sm text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1"
        >
          Details <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="flex items-end gap-3 mb-3">
        <span className="text-4xl font-bold text-gray-900">
          {latest.weight.toFixed(1)}
        </span>
        <span className="text-sm text-gray-500 pb-1">lbs</span>
        <span
          className={`text-sm font-medium pb-1 ${
            change < 0 ? 'text-green-600' : change > 0 ? 'text-red-600' : 'text-gray-500'
          }`}
        >
          {change > 0 ? '+' : ''}
          {change.toFixed(1)} last 30d
        </span>
      </div>

      <div className="h-24">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <YAxis
              domain={[
                (dataMin: number) => Math.floor(dataMin - 1),
                (dataMax: number) => Math.ceil(dataMax + 1),
              ]}
              hide
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '0.5rem',
                fontSize: '0.75rem',
              }}
            />
            <Line
              type="monotone"
              dataKey="weight"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function QuickActions() {
  const actions = [
    {
      label: 'Weekly Goals',
      description: 'View and manage this week',
      to: `/goals/weekly/${getCurrentWeekId()}`,
      icon: Target,
      color: 'text-blue-600 bg-blue-50',
    },
    {
      label: 'New Week',
      description: 'Create a new weekly plan',
      to: '/goals/weekly/new',
      icon: Plus,
      color: 'text-green-600 bg-green-50',
    },
    {
      label: 'Backlog',
      description: 'Review saved items',
      to: '/goals/backlog',
      icon: ListTodo,
      color: 'text-purple-600 bg-purple-50',
    },
    {
      label: 'Health',
      description: 'View health metrics',
      to: '/health',
      icon: Scale,
      color: 'text-orange-600 bg-orange-50',
    },
  ]

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
        Quick Actions
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {actions.map((action) => (
          <Link
            key={action.to}
            to={action.to}
            className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <div className={`p-2 rounded-lg ${action.color}`}>
              <action.icon className="w-4 h-4" />
            </div>
            <div>
              <span className="text-sm font-medium text-gray-900 block">
                {action.label}
              </span>
              <span className="text-xs text-gray-500">{action.description}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

export function Dashboard() {
  usePageTitle()
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      <p className="text-gray-500 mt-1">Overview of your health and goals.</p>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <WeekProgressWidget />
        <WeightTrendWidget />
        <QuickActions />
      </div>
    </div>
  )
}
