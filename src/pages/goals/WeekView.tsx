import { useState, useMemo, useCallback } from 'react'
import { usePageTitle } from '@/hooks/usePageTitle'
import { useParams, useNavigate, Link, Outlet } from 'react-router-dom'
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Plus, Pencil, Check, X } from 'lucide-react'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useCategories } from '@/contexts/CategoriesContext'
import { useToast } from '@/contexts/ToastContext'
import { weeksApi, tasksApi } from '@/lib/api'
import { formatWeekRange } from '@/lib/dates'
import { calculatePercentage, getScoreLevel, getScoreClasses, getStalenessClasses } from '@/lib/scores'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import type { Week, TaskWithCategory } from '@/types'

export function WeekView() {
  const { weekId } = useParams<{ weekId: string }>()
  usePageTitle(weekId ? `Week ${weekId}` : 'Week')
  const navigate = useNavigate()
  const toast = useToast()
  const { data: categories } = useCategories()

  const [editing, setEditing] = useState(false)
  const [editLabel, setEditLabel] = useState('')
  const [editStartDate, setEditStartDate] = useState('')
  const [editEndDate, setEditEndDate] = useState('')
  const [editSaving, setEditSaving] = useState(false)

  const { data: week, loading: weekLoading, error: weekError, setData: setWeek } = useAsyncData<Week>(
    () => weeksApi.get(weekId!),
    [weekId]
  )

  const { data: tasks, loading: tasksLoading, error: tasksError, refetch: refetchTasks, setData: setTasks } = useAsyncData<TaskWithCategory[]>(
    () => tasksApi.listByWeek(weekId!),
    [weekId]
  )

  // Fetch all weeks for prev/next navigation
  const { data: allWeeks } = useAsyncData<Week[]>(() => weeksApi.list(), [])

  const { prevWeek, nextWeek } = useMemo(() => {
    if (!allWeeks || !weekId) return { prevWeek: null, nextWeek: null }
    // allWeeks comes sorted by startDate desc from API
    const sorted = [...allWeeks].sort((a, b) => a.startDate.localeCompare(b.startDate))
    const currentIdx = sorted.findIndex((w) => w.label === weekId)
    if (currentIdx < 0) return { prevWeek: null, nextWeek: null }
    return {
      prevWeek: currentIdx > 0 ? sorted[currentIdx - 1] : null,
      nextWeek: currentIdx < sorted.length - 1 ? sorted[currentIdx + 1] : null,
    }
  }, [allWeeks, weekId])

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

  const handleMoveTask = useCallback(async (
    taskId: number,
    categoryKey: string,
    direction: 'up' | 'down',
    e: React.MouseEvent,
  ) => {
    e.stopPropagation()
    if (!tasks || !weekId) return

    const categoryTasks = groupedTasks.get(categoryKey)
    if (!categoryTasks) return

    const idx = categoryTasks.findIndex((t) => t.id === taskId)
    if (idx < 0) return
    if (direction === 'up' && idx === 0) return
    if (direction === 'down' && idx === categoryTasks.length - 1) return

    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    const taskA = categoryTasks[idx]
    const taskB = categoryTasks[swapIdx]

    const newTasks = tasks.map((t) => {
      if (t.id === taskA.id) return { ...t, sortOrder: taskB.sortOrder }
      if (t.id === taskB.id) return { ...t, sortOrder: taskA.sortOrder }
      return t
    })
    setTasks(newTasks)

    const allTaskIds: number[] = []
    const newGrouped = new Map<string, TaskWithCategory[]>()
    for (const t of newTasks) {
      const key = t.category?.name ?? 'Uncategorized'
      const existing = newGrouped.get(key) || []
      existing.push(t)
      newGrouped.set(key, existing)
    }
    const groupKeys = [...newGrouped.keys()].sort((a, b) => {
      if (a === 'Uncategorized') return 1
      if (b === 'Uncategorized') return -1
      return a.localeCompare(b)
    })
    for (const key of groupKeys) {
      const group = newGrouped.get(key)!
      group.sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id)
      for (const t of group) {
        allTaskIds.push(t.id)
      }
    }

    try {
      await weeksApi.reorder(weekId, allTaskIds)
    } catch {
      refetchTasks()
    }
  }, [tasks, weekId, groupedTasks, setTasks, refetchTasks])

  const startEditing = () => {
    if (!week) return
    setEditLabel(week.label)
    setEditStartDate(week.startDate)
    setEditEndDate(week.endDate)
    setEditing(true)
  }

  const cancelEditing = () => {
    setEditing(false)
  }

  const handleSaveEdit = async () => {
    if (!week || !editLabel.trim()) return
    setEditSaving(true)
    try {
      const updates: { label?: string; startDate?: string; endDate?: string } = {}
      if (editLabel !== week.label) updates.label = editLabel
      if (editStartDate !== week.startDate) updates.startDate = editStartDate
      if (editEndDate !== week.endDate) updates.endDate = editEndDate

      if (Object.keys(updates).length === 0) {
        setEditing(false)
        return
      }

      const updated = await weeksApi.update(week.label, updates)
      setWeek(updated)
      setEditing(false)
      toast.success('week updated')

      // If label changed, navigate to new URL
      if (updates.label) {
        navigate(`/goals/weekly/${updates.label}`, { replace: true })
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'failed to update week')
    } finally {
      setEditSaving(false)
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

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          {editing ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-blue-400 text-xl font-bold font-mono">$</span>
                <span className="text-xl font-mono font-bold text-zinc-100">week::</span>
                <input
                  type="text"
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  className="w-24 px-2 py-0.5 border border-zinc-700 bg-zinc-900 rounded text-xl font-mono font-bold text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={editStartDate}
                  onChange={(e) => setEditStartDate(e.target.value)}
                  className="px-2 py-0.5 border border-zinc-700 bg-zinc-900 rounded text-xs font-mono text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50"
                />
                <span className="text-xs font-mono text-zinc-600">to</span>
                <input
                  type="date"
                  value={editEndDate}
                  onChange={(e) => setEditEndDate(e.target.value)}
                  className="px-2 py-0.5 border border-zinc-700 bg-zinc-900 rounded text-xs font-mono text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50"
                />
                <button
                  onClick={handleSaveEdit}
                  disabled={editSaving || !editLabel.trim()}
                  className="p-1 text-emerald-400 hover:text-emerald-300 disabled:opacity-40 transition-colors"
                  title="Save"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={cancelEditing}
                  className="p-1 text-zinc-500 hover:text-zinc-300 transition-colors"
                  title="Cancel"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-mono font-bold text-zinc-100 flex items-center gap-2">
                  <span className="text-blue-400">$</span> week::{week.label}
                </h1>
                <button
                  onClick={startEditing}
                  className="p-1 text-zinc-600 hover:text-zinc-400 transition-colors"
                  title="Edit week"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
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
            </>
          )}
        </div>

        <div className="flex items-center gap-1">
          {prevWeek ? (
            <Link
              to={`/goals/weekly/${prevWeek.label}`}
              className="p-2 text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800 rounded transition-colors"
              title={`Previous: ${prevWeek.label}`}
            >
              <ChevronLeft className="w-4 h-4" />
            </Link>
          ) : (
            <span className="p-2 text-zinc-800">
              <ChevronLeft className="w-4 h-4" />
            </span>
          )}
          {nextWeek ? (
            <Link
              to={`/goals/weekly/${nextWeek.label}`}
              className="p-2 text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800 rounded transition-colors"
              title={`Next: ${nextWeek.label}`}
            >
              <ChevronRight className="w-4 h-4" />
            </Link>
          ) : (
            <span className="p-2 text-zinc-800">
              <ChevronRight className="w-4 h-4" />
            </span>
          )}
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
              {categoryTasks.map((task, idx) => {
                const stalenessClass = getStalenessClasses(task.stalenessCount)
                const isFirst = idx === 0
                const isLast = idx === categoryTasks.length - 1
                return (
                  <div
                    key={task.id}
                    onClick={() => navigate(`/goals/weekly/${weekId}/tasks/${task.id}`)}
                    className={`group flex items-center gap-3 p-3 hover:bg-zinc-800/50 transition-colors cursor-pointer ${
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
                    {categoryTasks.length > 1 && (
                      <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => handleMoveTask(task.id, category, 'up', e)}
                          disabled={isFirst}
                          className="p-0.5 text-zinc-600 hover:text-zinc-300 disabled:opacity-0 transition-colors"
                          aria-label="Move up"
                        >
                          <ChevronUp className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => handleMoveTask(task.id, category, 'down', e)}
                          disabled={isLast}
                          className="p-0.5 text-zinc-600 hover:text-zinc-300 disabled:opacity-0 transition-colors"
                          aria-label="Move down"
                        >
                          <ChevronDown className="w-3 h-3" />
                        </button>
                      </div>
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
