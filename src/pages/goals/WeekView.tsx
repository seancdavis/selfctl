import { useMemo, useCallback } from 'react'
import { usePageTitle } from '@/hooks/usePageTitle'
import { useParams, useNavigate, Link, Outlet } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useCategories } from '@/contexts/CategoriesContext'
import { weeksApi, tasksApi } from '@/lib/api'
import { formatWeekRange, getPreviousWeekId, getNextWeekId } from '@/lib/dates'
import { calculatePercentage, getScoreLevel, getScoreClasses, getStalenessClasses } from '@/lib/scores'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import type { Week, TaskWithCategory } from '@/types'

export function WeekView() {
  const { weekId } = useParams<{ weekId: string }>()
  usePageTitle(weekId ? `Week ${weekId}` : 'Week')
  const navigate = useNavigate()
  const { data: categories } = useCategories()

  const { data: week, loading: weekLoading, error: weekError } = useAsyncData<Week>(
    () => weeksApi.get(weekId!),
    [weekId]
  )

  const { data: tasks, loading: tasksLoading, error: tasksError, refetch: refetchTasks, setData: setTasks } = useAsyncData<TaskWithCategory[]>(
    () => tasksApi.listByWeek(weekId!),
    [weekId]
  )

  const groupedTasks = useMemo(() => {
    if (!tasks) return new Map<string, TaskWithCategory[]>()
    const groups = new Map<string, TaskWithCategory[]>()
    for (const task of tasks) {
      const key = task.category?.name ?? 'Uncategorized'
      const existing = groups.get(key) || []
      existing.push(task)
      groups.set(key, existing)
    }
    const sorted = new Map<string, TaskWithCategory[]>()
    const keys = [...groups.keys()].sort((a, b) => {
      if (a === 'Uncategorized') return 1
      if (b === 'Uncategorized') return -1
      return a.localeCompare(b)
    })
    for (const key of keys) {
      sorted.set(key, groups.get(key)!)
    }
    return sorted
  }, [tasks])

  const handleToggleTask = useCallback(async (taskId: number, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const updated = await tasksApi.toggleStatus(taskId)
      setTasks((prev) =>
        prev
          ? prev.map((t) =>
              t.id === taskId ? { ...t, status: updated.status } : t
            )
          : prev
      )
    } catch {
      refetchTasks()
    }
  }, [setTasks, refetchTasks])

  const loading = weekLoading || tasksLoading
  const error = weekError || tasksError

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400 text-sm font-mono">
        {error}
      </div>
    )
  }

  if (!week || !weekId) {
    return (
      <div className="text-center py-12 text-zinc-600 font-mono text-sm">week not found</div>
    )
  }

  const percentage = calculatePercentage(week.completedTasks, week.totalTasks)
  const level = getScoreLevel(percentage)
  const scoreClasses = getScoreClasses(level)
  const prevWeekId = getPreviousWeekId(weekId)
  const nextWeekId = getNextWeekId(weekId)

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-mono font-bold text-zinc-100 flex items-center gap-2">
              <span className="text-blue-400">$</span> week::{weekId}
            </h1>
            {week.totalTasks > 0 && (
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium border ${scoreClasses}`}
              >
                {percentage}%{level === 'fire' && ' \uD83D\uDD25'}
              </span>
            )}
          </div>
          <p className="text-xs font-mono text-zinc-600 mt-0.5">
            {formatWeekRange(week.startDate, week.endDate)}
          </p>
        </div>

        <div className="flex items-center gap-1">
          <Link
            to={`/goals/weekly/${prevWeekId}`}
            className="p-2 text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800 rounded transition-colors"
            title="Previous week"
          >
            <ChevronLeft className="w-4 h-4" />
          </Link>
          <Link
            to={`/goals/weekly/${nextWeekId}`}
            className="p-2 text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800 rounded transition-colors"
            title="Next week"
          >
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Task summary */}
      <p className="text-xs font-mono text-zinc-600 mt-2">
        {week.completedTasks} of {week.totalTasks} tasks completed
      </p>

      {/* Task groups */}
      <div className="mt-6 space-y-6">
        {groupedTasks.size === 0 && (
          <div className="text-center py-8 text-zinc-600 font-mono text-sm">
            no tasks this week
          </div>
        )}

        {[...groupedTasks.entries()].map(([category, categoryTasks]) => (
          <div key={category}>
            <h2 className="text-[11px] font-mono font-medium text-zinc-500 uppercase tracking-widest mb-2">
              {category}
            </h2>
            <div className="bg-zinc-900 rounded-lg border border-zinc-800 divide-y divide-zinc-800">
              {categoryTasks.map((task) => {
                const stalenessClass = getStalenessClasses(task.stalenessCount)
                return (
                  <div
                    key={task.id}
                    onClick={() => navigate(`/goals/weekly/${weekId}/tasks/${task.id}`)}
                    className={`flex items-center gap-3 p-3 hover:bg-zinc-800/50 transition-colors cursor-pointer ${
                      stalenessClass ? `border-l-4 ${stalenessClass}` : ''
                    }`}
                  >
                    <button
                      onClick={(e) => handleToggleTask(task.id, e)}
                      className={`w-4 h-4 rounded-sm border flex-shrink-0 flex items-center justify-center transition-all ${
                        task.status === 'completed'
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                          : 'border-zinc-600 hover:border-zinc-500'
                      }`}
                      aria-label={task.status === 'completed' ? 'Mark incomplete' : 'Mark complete'}
                    >
                      {task.status === 'completed' && (
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                    <span
                      className={`flex-1 text-sm font-mono transition-colors ${
                        task.status === 'completed'
                          ? 'text-zinc-600 line-through'
                          : 'text-zinc-200'
                      }`}
                    >
                      {task.title}
                    </span>
                    {task.tags?.length > 0 && task.tags.map((tag) => (
                      <span key={tag} className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400/70 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                        {tag}
                      </span>
                    ))}
                    {task.isRecurring && (
                      <span className="text-[10px] font-mono bg-zinc-800 text-zinc-500 border border-zinc-700 px-1.5 py-0.5 rounded">
                        recurring
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Add task */}
      <div className="mt-6">
        <Link
          to={`/goals/weekly/${weekId}/tasks/new`}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-mono text-zinc-600 hover:text-zinc-400 border border-dashed border-zinc-700 rounded hover:border-zinc-600 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          add task
        </Link>
      </div>

      {/* Back link */}
      <div className="mt-8">
        <Link
          to="/goals/weekly"
          className="text-xs font-mono text-zinc-600 hover:text-zinc-400 transition-colors"
        >
          &larr; all weeks
        </Link>
      </div>

      <Outlet context={{ refetchTasks, tasks, setTasks, weekId }} />
    </div>
  )
}
