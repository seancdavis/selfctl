import { useState } from 'react'
import { Plus, X, Pause, Play, Trash2, Pencil } from 'lucide-react'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useCategories } from '@/contexts/CategoriesContext'
import { recurringTasksApi } from '@/lib/api'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import type { RecurringTask } from '@/types'

export function Recurring() {
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
        className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-900">{task.title}</span>
          {category && (
            <span className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-full">
              {category.name}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => openEditForm(task)}
            className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
            title="Edit"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleToggle(task.id)}
            disabled={togglingId === task.id}
            className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors disabled:opacity-50"
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
            className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
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
          <h1 className="text-2xl font-bold text-gray-900">Recurring Tasks</h1>
          <p className="text-gray-500 mt-1">
            Tasks that repeat every week.
          </p>
        </div>
        <button
          onClick={openAddForm}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Task
        </button>
      </div>

      {/* Add/Edit form */}
      {showForm && (
        <div className="mt-4 bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-900">
              {editingTask ? 'Edit Recurring Task' : 'New Recurring Task'}
            </h3>
            <button
              onClick={closeForm}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="text"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="Task title"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
            <select
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">No category</option>
              {categories?.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            <textarea
              value={formContent}
              onChange={(e) => setFormContent(e.target.value)}
              placeholder="Content (Markdown, optional)"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={closeForm}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!formTitle.trim() || saving}
                className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving...' : editingTask ? 'Update' : 'Add'}
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
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
            {error}
          </div>
        )}

        {!loading && !error && tasks && tasks.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <p>No recurring tasks.</p>
          </div>
        )}

        {/* Active tasks */}
        {activeTasks.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">
              Active ({activeTasks.length})
            </h2>
            <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
              {activeTasks.map(renderTaskRow)}
            </div>
          </div>
        )}

        {/* Paused tasks */}
        {pausedTasks.length > 0 && (
          <div>
            <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">
              Paused ({pausedTasks.length})
            </h2>
            <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100 opacity-75">
              {pausedTasks.map(renderTaskRow)}
            </div>
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      {showDeleteConfirm !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">
              Delete Recurring Task
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              Are you sure you want to delete this recurring task? This will not
              affect tasks already created in existing weeks.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
                disabled={deletingId === showDeleteConfirm}
                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {deletingId === showDeleteConfirm ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
