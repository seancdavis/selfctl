import { useState } from 'react'
import { usePageTitle } from '@/hooks/usePageTitle'
import { Plus, X, Pause, Play, Trash2, Pencil } from 'lucide-react'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useCategories } from '@/contexts/CategoriesContext'
import { recurringTasksApi } from '@/lib/api'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import type { RecurringTask } from '@/types'

export function Recurring() {
  usePageTitle('Recurring Tasks')
  const { data: categories } = useCategories()
  const { data: tasks, loading, error, refetch } = useAsyncData<RecurringTask[]>(
    () => recurringTasksApi.list(),
    []
  )

  const [showForm, setShowForm] = useState(false)
  const [editingTask, setEditingTask] = useState<RecurringTask | null>(null)
  const [formTitle, setFormTitle] = useState('')
  const [formCategory, setFormCategory] = useState<string>('')
  const [formContent, setFormContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [togglingId, setTogglingId] = useState<number | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const activeTasks = tasks?.filter((t) => t.isActive) ?? []
  const pausedTasks = tasks?.filter((t) => !t.isActive) ?? []

  const openAddForm = () => {
    setEditingTask(null)
    setFormTitle('')
    setFormCategory('')
    setFormContent('')
    setShowForm(true)
  }

  const openEditForm = (task: RecurringTask) => {
    setEditingTask(task)
    setFormTitle(task.title)
    setFormCategory(task.categoryId ? String(task.categoryId) : '')
    setFormContent(task.contentMarkdown ?? '')
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingTask(null)
    setFormTitle('')
    setFormCategory('')
    setFormContent('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formTitle.trim()) return

    setSaving(true)
    try {
      const data = {
        title: formTitle.trim(),
        categoryId: formCategory ? Number(formCategory) : null,
        contentMarkdown: formContent.trim() || null,
      }

      if (editingTask) {
        await recurringTasksApi.update(editingTask.id, data)
      } else {
        await recurringTasksApi.create({ ...data, isActive: true })
      }
      closeForm()
      refetch()
    } catch {
      // silent
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (id: number) => {
    setTogglingId(id)
    try {
      await recurringTasksApi.toggle(id)
      refetch()
    } catch {
      // silent
    } finally {
      setTogglingId(null)
    }
  }

  const handleDelete = async (id: number) => {
    setDeletingId(id)
    try {
      await recurringTasksApi.delete(id)
      setShowDeleteConfirm(null)
      refetch()
    } catch {
      // silent
    } finally {
      setDeletingId(null)
    }
  }

  const renderTaskRow = (task: RecurringTask) => {
    const category = categories?.find((c) => c.id === task.categoryId)
    return (
      <div
        key={task.id}
        className="flex items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-mono text-zinc-200">{task.title}</span>
          {category && (
            <span className="text-[10px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded">
              {category.name}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => openEditForm(task)}
            className="p-1.5 text-zinc-600 hover:text-zinc-400 transition-colors"
            title="Edit"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleToggle(task.id)}
            disabled={togglingId === task.id}
            className="p-1.5 text-zinc-600 hover:text-blue-400 transition-colors disabled:opacity-40"
            title={task.isActive ? 'Pause' : 'Resume'}
          >
            {task.isActive ? (
              <Pause className="w-3.5 h-3.5" />
            ) : (
              <Play className="w-3.5 h-3.5" />
            )}
          </button>
          <button
            onClick={() => setShowDeleteConfirm(task.id)}
            className="p-1.5 text-zinc-600 hover:text-red-400 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-mono font-bold text-zinc-100 flex items-center gap-2">
            <span className="text-amber-400">$</span> tasks::recurring
          </h1>
          <p className="text-xs font-mono text-zinc-600 mt-1">managed routines — repeat every week</p>
        </div>
        <button
          onClick={openAddForm}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono font-medium rounded hover:bg-emerald-500/20 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          add task
        </button>
      </div>

      {/* Add/Edit form */}
      {showForm && (
        <div className="mt-4 bg-zinc-900 rounded-lg border border-zinc-800 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-mono font-medium text-zinc-200">
              {editingTask ? 'edit recurring task' : 'new recurring task'}
            </h3>
            <button
              onClick={closeForm}
              className="text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="text"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="task title"
              className="w-full px-3 py-2 border border-zinc-700 bg-zinc-900 rounded text-sm font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50"
              autoFocus
            />
            <select
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value)}
              className="w-full px-3 py-2 border border-zinc-700 bg-zinc-900 rounded text-sm font-mono text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50"
            >
              <option value="">no category</option>
              {categories?.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            <textarea
              value={formContent}
              onChange={(e) => setFormContent(e.target.value)}
              placeholder="content (markdown, optional)"
              rows={3}
              className="w-full px-3 py-2 border border-zinc-700 bg-zinc-900 rounded text-sm font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 resize-y"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={closeForm}
                className="px-3 py-1.5 text-xs font-mono text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                cancel
              </button>
              <button
                type="submit"
                disabled={!formTitle.trim() || saving}
                className="px-4 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono font-medium rounded hover:bg-emerald-500/20 disabled:opacity-40 transition-colors"
              >
                {saving ? 'saving...' : editingTask ? 'update' : 'add'}
              </button>
            </div>
          </form>
        </div>
      )}

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

        {!loading && !error && tasks && tasks.length === 0 && (
          <div className="text-center py-12 text-zinc-600 font-mono text-sm">
            <p>no recurring tasks</p>
          </div>
        )}

        {/* Active tasks */}
        {activeTasks.length > 0 && (
          <div className="mb-6">
            <h2 className="text-[11px] font-mono font-medium text-zinc-500 uppercase tracking-widest mb-2">
              Active ({activeTasks.length})
            </h2>
            <div className="bg-zinc-900 rounded-lg border border-zinc-800 divide-y divide-zinc-800">
              {activeTasks.map(renderTaskRow)}
            </div>
          </div>
        )}

        {/* Paused tasks */}
        {pausedTasks.length > 0 && (
          <div>
            <h2 className="text-[11px] font-mono font-medium text-zinc-500 uppercase tracking-widest mb-2">
              Paused ({pausedTasks.length})
            </h2>
            <div className="bg-zinc-900 rounded-lg border border-zinc-800 divide-y divide-zinc-800 opacity-60">
              {pausedTasks.map(renderTaskRow)}
            </div>
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      {showDeleteConfirm !== null && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 max-w-sm mx-4 shadow-2xl">
            <h3 className="text-sm font-mono font-semibold text-zinc-200">
              delete recurring task
            </h3>
            <p className="mt-2 text-sm font-mono text-zinc-500">
              Are you sure you want to delete this recurring task? This will not
              affect tasks already created in existing weeks.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 text-xs font-mono text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                cancel
              </button>
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
                disabled={deletingId === showDeleteConfirm}
                className="px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-mono font-medium rounded hover:bg-red-500/20 disabled:opacity-40 transition-colors"
              >
                {deletingId === showDeleteConfirm ? 'deleting...' : 'delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
