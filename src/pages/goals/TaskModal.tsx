import { useState, useEffect } from 'react'
import { useParams, useNavigate, useOutletContext } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { AutoResizeTextarea } from '@/components/ui/AutoResizeTextarea'
import { NotesSection } from '@/components/goals/NotesSection'
import { TagSelector } from '@/components/goals/TagSelector'
import { useCategories } from '@/contexts/CategoriesContext'
import { useToast } from '@/contexts/ToastContext'
import { useAsyncData } from '@/hooks/useAsyncData'
import { tasksApi, notesApi } from '@/lib/api'
import { getStalenessDescription, getStalenessClasses } from '@/lib/scores'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import type { TaskWithCategory, Note } from '@/types'
import type { Dispatch, SetStateAction } from 'react'

interface OutletContext {
  refetchTasks: () => Promise<void>
  tasks: TaskWithCategory[] | null
  setTasks: Dispatch<SetStateAction<TaskWithCategory[] | null>>
  weekId: string
}

export function TaskModal() {
  const { taskId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { data: categories } = useCategories()
  const { refetchTasks, tasks, setTasks, weekId } = useOutletContext<OutletContext>()

  const isEdit = Boolean(taskId)
  const taskIdNum = taskId ? Number(taskId) : 0
  const [loading, setLoading] = useState(isEdit)
  const [title, setTitle] = useState('')
  const [categoryId, setCategoryId] = useState<string>('')
  const [content, setContent] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [task, setTask] = useState<TaskWithCategory | null>(null)
  const [saving, setSaving] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [togglingStatus, setTogglingStatus] = useState(false)

  const {
    data: notes,
    loading: notesLoading,
    refetch: refetchNotes,
  } = useAsyncData<Note[]>(
    () => (isEdit ? notesApi.listByTask(taskIdNum) : Promise.resolve([])),
    [taskIdNum]
  )

  useEffect(() => {
    if (!taskId) return

    tasksApi.get(Number(taskId)).then((t) => {
      setTask(t)
      setTitle(t.title)
      setCategoryId(t.categoryId ? String(t.categoryId) : '')
      setContent(t.contentMarkdown ?? '')
      setSelectedTags(t.tags ?? [])
      setLoading(false)
    }).catch(() => {
      toast.error('failed to load task')
      navigate(`/goals/weekly/${weekId}`)
    })
  }, [taskId, navigate, toast, weekId])

  const close = () => navigate(`/goals/weekly/${weekId}`)

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
        const updated = await tasksApi.update(task.id, data)
        setTasks((prev) =>
          prev?.map((t) => (t.id === task.id ? { ...t, ...updated } : t)) ?? null
        )
        toast.success('task updated')
      } else {
        await tasksApi.create({
          weekId,
          ...data,
          status: 'pending',
        })
        toast.success('task created')
      }
      close()
      refetchTasks()
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
      await tasksApi.delete(task.id)
      toast.success('task deleted')
      refetchTasks()
    } catch {
      setTasks(prev)
      toast.error('failed to delete task')
    }
  }

  const handleToggleStatus = async () => {
    if (!task) return
    setTogglingStatus(true)
    try {
      const updated = await tasksApi.toggleStatus(task.id)
      setTask({ ...task, status: updated.status })
      setTasks((prev) =>
        prev?.map((t) => (t.id === task.id ? { ...t, status: updated.status } : t)) ?? null
      )
      toast.success(updated.status === 'completed' ? 'task completed' : 'task reopened')
    } catch {
      toast.error('failed to toggle status')
    } finally {
      setTogglingStatus(false)
    }
  }

  return (
    <Modal
      isOpen
      onClose={close}
      title={isEdit ? 'edit task' : 'new task'}
    >
      {loading ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      ) : (
        <>
          {/* Read-only badges for edit mode */}
          {isEdit && task && (
            <div className="flex items-center gap-2 mb-4">
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded font-medium ${
                  task.status === 'completed'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                }`}
              >
                {task.status === 'completed' ? 'completed' : 'pending'}
              </span>
              {task.stalenessCount > 0 && (
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded border-l-2 ${getStalenessClasses(task.stalenessCount)}`}>
                  {getStalenessDescription(task.stalenessCount)}
                </span>
              )}
              {task.isRecurring && (
                <span className="text-[10px] font-mono bg-zinc-800 text-zinc-500 border border-zinc-700 px-2 py-0.5 rounded">
                  recurring
                </span>
              )}
            </div>
          )}

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
              onChange={(e) => setCategoryId(e.target.value)}
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
                      onClick={handleToggleStatus}
                      disabled={togglingStatus}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono transition-colors disabled:opacity-40 ${
                        task.status === 'completed'
                          ? 'text-zinc-400 hover:text-amber-400'
                          : 'text-zinc-400 hover:text-emerald-400'
                      }`}
                    >
                      {togglingStatus
                        ? 'updating...'
                        : task.status === 'completed'
                        ? 'mark incomplete'
                        : 'mark complete'}
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
                are you sure? this action cannot be undone.
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

          {isEdit && (
            <NotesSection
              notes={notes}
              notesLoading={notesLoading}
              refetchNotes={refetchNotes}
              taskId={taskIdNum}
            />
          )}
        </>
      )}
    </Modal>
  )
}
