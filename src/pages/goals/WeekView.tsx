import { useState, useMemo, useCallback } from 'react'
import { usePageTitle } from '@/hooks/usePageTitle'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react'
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

  const [showAddForm, setShowAddForm] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskCategory, setNewTaskCategory] = useState<string>('')
  const [addingTask, setAddingTask] = useState(false)

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

  const handleToggleTask = useCallback(async (taskId: number) => {
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

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTaskTitle.trim() || !weekId) return

    setAddingTask(true)
    try {
      await tasksApi.create({
        weekId,
        title: newTaskTitle.trim(),
        categoryId: newTaskCategory ? Number(newTaskCategory) : null,
        status: 'pending',
      })
      setNewTaskTitle('')
      setNewTaskCategory('')
      setShowAddForm(false)
      refetchTasks()
    } catch {
      // silent
    } finally {
      setAddingTask(false)
    }
  }

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
                    className={`flex items-center gap-3 p-3 ${
                      stalenessClass ? `border-l-4 ${stalenessClass}` : ''
                    }`}
                  >
                    <button
                      onClick={() => handleToggleTask(task.id)}
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
                    <button
                      onClick={() => navigate(`/goals/weekly/${weekId}/tasks/${task.id}`)}
                      className={`flex-1 text-left text-sm font-mono transition-colors hover:text-blue-400 ${
                        task.status === 'completed'
                          ? 'text-zinc-600 line-through'
                          : 'text-zinc-200'
                      }`}
                    >
                      {task.title}
                    </button>
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
        {showAddForm ? (
          <form
            onSubmit={handleAddTask}
            className="bg-zinc-900 rounded-lg border border-zinc-800 p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-mono font-medium text-zinc-200">add task</h3>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <input
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="task title"
                className="w-full px-3 py-2 border border-zinc-700 bg-zinc-900 rounded text-sm font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50"
                autoFocus
              />
              <select
                value={newTaskCategory}
                onChange={(e) => setNewTaskCategory(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-700 bg-zinc-900 rounded text-sm font-mono text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50"
              >
                <option value="">no category</option>
                {categories?.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1.5 text-xs font-mono text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  cancel
                </button>
                <button
                  type="submit"
                  disabled={!newTaskTitle.trim() || addingTask}
                  className="px-4 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono font-medium rounded hover:bg-emerald-500/20 disabled:opacity-40 transition-colors"
                >
                  {addingTask ? 'adding...' : 'add'}
                </button>
              </div>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-mono text-zinc-600 hover:text-zinc-400 border border-dashed border-zinc-700 rounded hover:border-zinc-600 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            add task
          </button>
        )}
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
    </div>
  )
}
