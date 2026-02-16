import { useState, useEffect } from 'react'
import { useParams, useNavigate, useOutletContext } from 'react-router-dom'
import { Trash2, Pause, Play } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { AutoResizeTextarea } from '@/components/ui/AutoResizeTextarea'
import { TagSelector } from '@/components/goals/TagSelector'
import { useCategories } from '@/contexts/CategoriesContext'
import { useToast } from '@/contexts/ToastContext'
import { recurringTasksApi } from '@/lib/api'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import type { RecurringTask } from '@/types'
import type { Dispatch, SetStateAction } from 'react'

interface OutletContext {
  refetch: () => Promise<void>
  tasks: RecurringTask[] | null
  setTasks: Dispatch<SetStateAction<RecurringTask[] | null>>
}

export function RecurringTaskModal() {
  const { taskId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { data: categories } = useCategories()
  const { refetch, tasks, setTasks } = useOutletContext<OutletContext>()

  const isEdit = Boolean(taskId)
  const [loading, setLoading] = useState(isEdit)
  const [title, setTitle] = useState('')
  const [categoryId, setCategoryId] = useState<string>('')
  const [content, setContent] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [task, setTask] = useState<RecurringTask | null>(null)
  const [saving, setSaving] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    if (!taskId) return

    recurringTasksApi.get(Number(taskId)).then((t) => {
      setTask(t)
      setTitle(t.title)
      setCategoryId(t.categoryId ? String(t.categoryId) : '')
      setContent(t.contentMarkdown ?? '')
      setSelectedTags(t.tags ?? [])
      setLoading(false)
    }).catch(() => {
      toast.error('failed to load task')
      navigate('/goals/recurring')
    })
  }, [taskId, navigate, toast])

  const close = () => navigate('/goals/recurring')

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    setSaving(true)
    const data = {
      title: title.trim(),
      categoryId: categoryId ? Number(categoryId) : null,
      contentMarkdown: content.trim() || null,
      tags: selectedTags,
    }

    try {
      if (isEdit && task) {
        const updated = await recurringTasksApi.update(task.id, data)
        setTasks((prev) =>
          prev?.map((t) => (t.id === task.id ? updated : t)) ?? null
        )
        toast.success('task updated')
      } else {
        const created = await recurringTasksApi.create({ ...data, isActive: true })
        setTasks((prev) => (prev ? [...prev, created] : [created]))
        toast.success('task created')
      }
      close()
      refetch()
    } catch {
      toast.error(isEdit ? 'failed to update task' : 'failed to create task')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!task) return

    const prev = tasks
    setTasks((current) => current?.filter((t) => t.id !== task.id) ?? null)
    close()

    try {
      await recurringTasksApi.delete(task.id)
      toast.success('task deleted')
    } catch {
      setTasks(prev)
      toast.error('failed to delete task')
    }
  }

  const handleToggle = async () => {
    if (!task) return

    const newActive = !task.isActive
    setTask({ ...task, isActive: newActive })
    setTasks((prev) =>
      prev?.map((t) => (t.id === task.id ? { ...t, isActive: newActive } : t)) ?? null
    )

    try {
      await recurringTasksApi.toggle(task.id)
      toast.success(newActive ? 'task resumed' : 'task paused')
      refetch()
    } catch {
      setTask({ ...task, isActive: !newActive })
      setTasks((prev) =>
        prev?.map((t) => (t.id === task.id ? { ...t, isActive: !newActive } : t)) ?? null
      )
      toast.error('failed to toggle task')
    }
  }

  return (
    <Modal
      isOpen
      onClose={close}
      title={isEdit ? 'edit recurring task' : 'new recurring task'}
    >
      {loading ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      ) : (
        <>
          <form onSubmit={handleSave} className="space-y-3">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="task title"
              className="w-full px-3 py-2 border border-zinc-700 bg-zinc-900 rounded text-sm font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50"
              autoFocus
            />
            <select
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value)
                setSelectedTags([])
              }}
              className="w-full px-3 py-2 border border-zinc-700 bg-zinc-900 rounded text-sm font-mono text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50"
            >
              <option value="">no category</option>
              {categories?.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            <TagSelector
              categoryId={categoryId ? Number(categoryId) : null}
              selectedTags={selectedTags}
              onChange={setSelectedTags}
            />
            <AutoResizeTextarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="content (markdown, optional)"
              minRows={3}
              className="w-full px-3 py-2 border border-zinc-700 bg-zinc-900 rounded text-sm font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50"
            />

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-1">
                {isEdit && task && (
                  <>
                    <button
                      type="button"
                      onClick={handleToggle}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono text-zinc-400 hover:text-blue-400 transition-colors"
                    >
                      {task.isActive ? (
                        <>
                          <Pause className="w-3.5 h-3.5" /> pause
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5" /> resume
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono text-zinc-400 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> delete
                    </button>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={close}
                  className="px-3 py-1.5 text-xs font-mono text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  cancel
                </button>
                <button
                  type="submit"
                  disabled={!title.trim() || saving}
                  className="px-4 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono font-medium rounded hover:bg-emerald-500/20 disabled:opacity-40 transition-colors"
                >
                  {saving ? 'saving...' : isEdit ? 'update' : 'create'}
                </button>
              </div>
            </div>
          </form>

          {showDeleteConfirm && (
            <div className="mt-4 border-t border-zinc-800 pt-4">
              <p className="text-sm font-mono text-zinc-400">
                are you sure? this will not affect tasks already created in existing weeks.
              </p>
              <div className="flex justify-end gap-2 mt-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-3 py-1.5 text-xs font-mono text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-1.5 bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-mono font-medium rounded hover:bg-red-500/20 transition-colors"
                >
                  confirm delete
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </Modal>
  )
}
