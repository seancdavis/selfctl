import { useState, useCallback } from 'react'
import { usePageTitle } from '@/hooks/usePageTitle'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Trash2, ArrowLeft } from 'lucide-react'
import { useAsyncData } from '@/hooks/useAsyncData'
import { tasksApi, notesApi } from '@/lib/api'
import {
  getStalenessDescription,
  getStalenessClasses,
} from '@/lib/scores'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import type { TaskWithCategory, Note } from '@/types'

export function TaskDetail() {
  usePageTitle('Task')
  const { weekId, taskId } = useParams<{ weekId: string; taskId: string }>()
  const navigate = useNavigate()

  const [noteContent, setNoteContent] = useState('')
  const [addingNote, setAddingNote] = useState(false)
  const [togglingStatus, setTogglingStatus] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deletingNoteId, setDeletingNoteId] = useState<number | null>(null)

  const taskIdNum = taskId ? Number(taskId) : 0

  const {
    data: task,
    loading: taskLoading,
    error: taskError,
    refetch: refetchTask,
  } = useAsyncData<TaskWithCategory>(() => tasksApi.get(taskIdNum), [taskIdNum])

  const {
    data: notes,
    loading: notesLoading,
    error: notesError,
    refetch: refetchNotes,
  } = useAsyncData<Note[]>(() => notesApi.listByTask(taskIdNum), [taskIdNum])

  const handleToggleStatus = useCallback(async () => {
    if (!task) return
    setTogglingStatus(true)
    try {
      await tasksApi.toggleStatus(task.id)
      refetchTask()
    } catch {
      // silent
    } finally {
      setTogglingStatus(false)
    }
  }, [task, refetchTask])

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!noteContent.trim()) return

    setAddingNote(true)
    try {
      await notesApi.create({
        taskId: taskIdNum,
        contentMarkdown: noteContent.trim(),
      })
      setNoteContent('')
      refetchNotes()
    } catch {
      // silent
    } finally {
      setAddingNote(false)
    }
  }

  const handleDeleteNote = async (noteId: number) => {
    setDeletingNoteId(noteId)
    try {
      await notesApi.delete(noteId)
      refetchNotes()
    } catch {
      // silent
    } finally {
      setDeletingNoteId(null)
    }
  }

  const handleDeleteTask = async () => {
    if (!task) return
    setDeleting(true)
    try {
      await tasksApi.delete(task.id)
      navigate(`/goals/weekly/${weekId}`)
    } catch {
      setDeleting(false)
    }
  }

  if (taskLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    )
  }

  if (taskError) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400 text-sm font-mono">
        {taskError}
      </div>
    )
  }

  if (!task) {
    return (
      <div className="text-center py-12 text-zinc-600 font-mono text-sm">task not found</div>
    )
  }

  const stalenessClass = getStalenessClasses(task.stalenessCount)

  return (
    <div className="max-w-3xl">
      {/* Back link */}
      <Link
        to={`/goals/weekly/${weekId}`}
        className="inline-flex items-center gap-1 text-xs font-mono text-zinc-600 hover:text-zinc-400 transition-colors mb-4"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        back to week {weekId}
      </Link>

      {/* Task header */}
      <div
        className={`bg-zinc-900 rounded-lg border border-zinc-800 p-5 ${
          stalenessClass ? `border-l-4 ${stalenessClass}` : ''
        }`}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-lg font-mono font-bold text-zinc-100">{task.title}</h1>
            <div className="flex items-center gap-2 mt-2">
              {task.category && (
                <span className="text-[10px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded font-medium">
                  {task.category.name}
                </span>
              )}
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
                <span className="text-[10px] font-mono text-amber-400">
                  {getStalenessDescription(task.stalenessCount)}
                </span>
              )}
              {task.isRecurring && (
                <span className="text-[10px] font-mono bg-zinc-800 text-zinc-500 border border-zinc-700 px-2 py-0.5 rounded">
                  recurring
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        {task.contentHtml && (
          <div
            className="mt-4 prose prose-sm prose-invert max-w-none text-zinc-400"
            dangerouslySetInnerHTML={{ __html: task.contentHtml }}
          />
        )}

        {/* Actions */}
        <div className="mt-5 flex items-center gap-3 border-t border-zinc-800 pt-4">
          <button
            onClick={handleToggleStatus}
            disabled={togglingStatus}
            className={`px-4 py-2 text-xs font-mono font-medium rounded transition-colors ${
              task.status === 'completed'
                ? 'bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-700'
                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
            } disabled:opacity-40`}
          >
            {togglingStatus
              ? 'updating...'
              : task.status === 'completed'
              ? 'mark incomplete'
              : 'mark complete'}
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="p-2 text-zinc-600 hover:text-red-400 transition-colors"
            title="Delete task"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 max-w-sm mx-4 shadow-2xl">
            <h3 className="text-sm font-mono font-semibold text-zinc-200">delete task</h3>
            <p className="mt-2 text-sm font-mono text-zinc-500">
              Are you sure you want to delete "{task.title}"? This action cannot
              be undone.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-xs font-mono text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                cancel
              </button>
              <button
                onClick={handleDeleteTask}
                disabled={deleting}
                className="px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-mono font-medium rounded hover:bg-red-500/20 disabled:opacity-40 transition-colors"
              >
                {deleting ? 'deleting...' : 'delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notes section */}
      <div className="mt-8">
        <h2 className="text-[11px] font-mono font-medium text-zinc-500 uppercase tracking-widest mb-4">Notes</h2>

        {/* Add note form */}
        <form
          onSubmit={handleAddNote}
          className="bg-zinc-900 rounded-lg border border-zinc-800 p-4 mb-4"
        >
          <textarea
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            placeholder="add a note (markdown supported)..."
            rows={3}
            className="w-full px-3 py-2 border border-zinc-700 bg-zinc-900 rounded text-sm font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 resize-y"
          />
          <div className="flex justify-end mt-2">
            <button
              type="submit"
              disabled={!noteContent.trim() || addingNote}
              className="px-4 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono font-medium rounded hover:bg-emerald-500/20 disabled:opacity-40 transition-colors"
            >
              {addingNote ? 'adding...' : 'add note'}
            </button>
          </div>
        </form>

        {/* Notes list */}
        {notesLoading && (
          <div className="flex justify-center py-4">
            <LoadingSpinner size="sm" />
          </div>
        )}

        {notesError && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm font-mono">
            {notesError}
          </div>
        )}

        {!notesLoading && notes && notes.length === 0 && (
          <p className="text-xs font-mono text-zinc-600">no notes yet</p>
        )}

        {notes && notes.length > 0 && (
          <div className="space-y-3">
            {notes.map((note) => (
              <div
                key={note.id}
                className="bg-zinc-900 rounded-lg border border-zinc-800 p-4"
              >
                <div
                  className="prose prose-sm prose-invert max-w-none text-zinc-400"
                  dangerouslySetInnerHTML={{ __html: note.contentHtml }}
                />
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-800">
                  <span className="text-[10px] font-mono text-zinc-600">
                    {new Date(note.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </span>
                  <button
                    onClick={() => handleDeleteNote(note.id)}
                    disabled={deletingNoteId === note.id}
                    className="text-zinc-600 hover:text-red-400 transition-colors disabled:opacity-40"
                    title="Delete note"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
