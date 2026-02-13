import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useAsyncData } from '@/hooks/useAsyncData'
import { weeksApi } from '@/lib/api'
import { getCurrentWeekId, formatWeekRange } from '@/lib/dates'
import { calculatePercentage, getScoreLevel, getScoreClasses } from '@/lib/scores'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import type { Week } from '@/types'

function WeekCard({ week, isCurrent }: { week: Week; isCurrent: boolean }) {
  const percentage = calculatePercentage(week.completedTasks, week.totalTasks)
  const level = getScoreLevel(percentage)
  const scoreClasses = getScoreClasses(level)

  return (
    <Link
      to={`/goals/weekly/${week.id}`}
      className={`block bg-white rounded-lg border p-4 transition-colors hover:border-blue-300 ${
        isCurrent ? 'border-blue-400 ring-2 ring-blue-100' : 'border-gray-200'
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-900">Week {week.id}</h3>
            {isCurrent && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                Current
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            {formatWeekRange(week.startDate, week.endDate)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">
            {week.completedTasks}/{week.totalTasks} tasks
          </span>
          {week.totalTasks > 0 && (
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${scoreClasses}`}
            >
              {percentage}%
              {level === 'fire' && ' \uD83D\uDD25'}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}

export function WeeklyGoals() {
  const { data: weeks, loading, error } = useAsyncData<Week[]>(() => weeksApi.list(), [])
  const currentWeekId = getCurrentWeekId()

  const sortedWeeks = weeks ? [...weeks].sort((a, b) => b.id.localeCompare(a.id)) : []

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Weekly Goals</h1>
          <p className="text-gray-500 mt-1">Current and past weeks.</p>
        </div>
        <Link
          to="/goals/weekly/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Week
        </Link>
      </div>

      <div className="mt-6">
        {loading && (
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
            {error}
          </div>
        )}

        {!loading && !error && sortedWeeks.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No weeks yet.</p>
            <Link
              to="/goals/weekly/new"
              className="mt-2 inline-flex items-center gap-1 text-blue-600 text-sm hover:underline"
            >
              <Plus className="w-4 h-4" />
              Create your first week
            </Link>
          </div>
        )}

        {sortedWeeks.length > 0 && (
          <div className="space-y-2">
            {sortedWeeks.map((week) => (
              <WeekCard
                key={week.id}
                week={week}
                isCurrent={week.id === currentWeekId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
