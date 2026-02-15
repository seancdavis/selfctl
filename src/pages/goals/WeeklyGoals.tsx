import { usePageTitle } from '@/hooks/usePageTitle'
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
      className={`block bg-zinc-900 rounded-lg border p-4 transition-colors hover:border-zinc-600 ${
        isCurrent ? 'border-emerald-500/30 ring-1 ring-emerald-500/10' : 'border-zinc-800'
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-mono font-semibold text-zinc-200">Week {week.id}</h3>
            {isCurrent && (
              <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-medium">
                current
              </span>
            )}
          </div>
          <p className="text-xs font-mono text-zinc-600 mt-0.5">
            {formatWeekRange(week.startDate, week.endDate)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-zinc-600">
            {week.completedTasks}/{week.totalTasks} tasks
          </span>
          {week.totalTasks > 0 && (
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium border ${scoreClasses}`}
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
  usePageTitle('Weekly Goals')
  const { data: weeks, loading, error } = useAsyncData<Week[]>(() => weeksApi.list(), [])
  const currentWeekId = getCurrentWeekId()

  const sortedWeeks = weeks ? [...weeks].sort((a, b) => b.id.localeCompare(a.id)) : []

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-mono font-bold text-zinc-100 flex items-center gap-2">
            <span className="text-blue-400">$</span> tasks::weekly
          </h1>
          <p className="text-xs font-mono text-zinc-600 mt-1">current and past weeks</p>
        </div>
        <Link
          to="/goals/weekly/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono font-medium rounded hover:bg-emerald-500/20 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          new week
        </Link>
      </div>

      <div className="mt-6">
        {loading && (
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400 text-sm font-mono">
            {error}
          </div>
        )}

        {!loading && !error && sortedWeeks.length === 0 && (
          <div className="text-center py-12">
            <p className="text-zinc-600 text-sm font-mono">no weeks found</p>
            <Link
              to="/goals/weekly/new"
              className="mt-2 inline-flex items-center gap-1 text-emerald-400 text-sm font-mono hover:text-emerald-300 transition-colors"
            >
              <Plus className="w-4 h-4" />
              init first week
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
