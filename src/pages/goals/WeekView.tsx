import { useState, useMemo, useCallback } from 'react'
import { usePageTitle } from '@/hooks/usePageTitle'
import { useParams, useNavigate, Link, Outlet } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Plus, Pencil, Check, X, GripVertical, MessageSquare } from 'lucide-react'
import { DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useToast } from '@/contexts/ToastContext'
import { weeksApi, tasksApi } from '@/lib/api'
import { formatWeekRange } from '@/lib/dates'
import { calculatePercentage, getScoreLevel, getScoreClasses, getStalenessClasses } from '@/lib/scores'
import { Skeleton } from '@/components/ui/Skeleton'
import type { Week, TaskWithCategory } from '@/types'

function SortableTaskRow({
  task,
  weekId,
  onToggle,
  onNavigate,
}: {
  task: TaskWithCategory
  weekId: string
  onToggle: (taskId: number, e: React.MouseEvent) => void
  onNavigate: (path: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: task.id })
  const style = { transform: CSS.Transform.toString(transform), transition }
  const stalenessClass = getStalenessClasses(task.stalenessCount)

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => onNavigate(`/goals/weekly/${weekId}/tasks/${task.id}`)}
      className={`p-3 hover:bg-zinc-800/50 transition-colors cursor-pointer ${
        stalenessClass ? `border-l-4 ${stalenessClass}` : ''
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className="flex-shrink-0 cursor-grab text-zinc-600 hover:text-zinc-400 touch-none"
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-3.5 h-3.5" />
        </div>
        <button
          onClick={(e) => onToggle(task.id, e)}
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
        {task.noteCount > 0 && (
          <span className="flex items-center gap-1 text-[10px] font-mono text-zinc-500">
            <MessageSquare className="w-3 h-3" />
            {task.noteCount}
          </span>
        )}
      </div>
      {task.contentHtml && (
        <div
          className={`ml-[3.25rem] mt-1 text-xs font-mono markdown-content ${
            task.status === 'completed' ? 'text-zinc-700' : 'text-zinc-500'
          }`}
          dangerouslySetInnerHTML={{ __html: task.contentHtml }}
        />
      )}
    </div>
  )
}

export function WeekView() {
  const { weekId } = useParams<{ weekId: string }>()
  usePageTitle(weekId ? `Week ${weekId}` : 'Week')
  const navigate = useNavigate()
  const toast = useToast()

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
      const group = groups.get(key)!
      group.sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id)
      sorted.set(key, group)
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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  )

  const handleDragEnd = useCallback((event: DragEndEvent, categoryKey: string) => {
    const { active, over } = event
    if (!over || active.id === over.id || !tasks || !weekId) return

    const categoryTasks = groupedTasks.get(categoryKey)
    if (!categoryTasks) return

    const oldIndex = categoryTasks.findIndex((t) => t.id === active.id)
    const newIndex = categoryTasks.findIndex((t) => t.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return

    const reorderedCategory = arrayMove(categoryTasks, oldIndex, newIndex)

    // Build new full task list with updated sortOrders
    const reorderedIds = new Set(reorderedCategory.map((t) => t.id))
    const newTasks = tasks.map((t) => {
      if (!reorderedIds.has(t.id)) return t
      const idx = reorderedCategory.findIndex((rt) => rt.id === t.id)
      return { ...t, sortOrder: idx }
    })
    setTasks(newTasks)

    // Build full task ID array across all categories for API call
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

    weeksApi.reorder(weekId, allTaskIds).catch(() => refetchTasks())
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

  const { totalTasks, completedTasks } = useMemo(() => {
    if (!tasks) return { totalTasks: 0, completedTasks: 0 }
    return {
      totalTasks: tasks.length,
      completedTasks: tasks.filter(t => t.status === 'completed').length,
    }
  }, [tasks])

  const loading = weekLoading || tasksLoading
  const error = weekError || tasksError

  if (loading) {
    return (
      <div>
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-5 w-12" />
            </div>
            <Skeleton className="h-3.5 w-36 mt-1" />
          </div>
          <div className="flex items-center gap-1">
            <Skeleton className="h-8 w-8 rounded" />
            <Skeleton className="h-8 w-8 rounded" />
          </div>
        </div>
        {/* Summary skeleton */}
        <Skeleton className="h-3.5 w-44 mt-2" />
        {/* Category group skeletons */}
        <div className="mt-6 space-y-6">
          {[0, 1].map((g) => (
            <div key={g}>
              <Skeleton className="h-3 w-24 mb-2" />
              <div className="bg-zinc-900 rounded-lg border border-zinc-800 divide-y divide-zinc-800">
                {[0, 1, 2].map((r) => (
                  <div key={r} className="flex items-center gap-3 p-3">
                    <Skeleton className="h-3.5 w-3.5 flex-shrink-0" />
                    <Skeleton className="h-4 w-4 rounded-sm flex-shrink-0" />
                    <Skeleton className="h-4 flex-1" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
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

  const percentage = calculatePercentage(completedTasks, totalTasks)
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
                {totalTasks > 0 && (
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
        {completedTasks} of {totalTasks} tasks completed
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
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(event) => handleDragEnd(event, category)}>
              <SortableContext items={categoryTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                <div className="bg-zinc-900 rounded-lg border border-zinc-800 divide-y divide-zinc-800">
                  {categoryTasks.map((task) => (
                    <SortableTaskRow
                      key={task.id}
                      task={task}
                      weekId={weekId}
                      onToggle={handleToggleTask}
                      onNavigate={navigate}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
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
