import { useState, useCallback } from 'react'
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
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
        {taskError}
      </div>
    )
  }

  if (!task) {
    return (
      <div className="text-center py-12 text-gray-500">Task not found.</div>
    )
  }

  const stalenessClass = getStalenessClasses(task.stalenessCount)

  return (
    <div className="max-w-3xl">
      {/* Back link */}
      <Link
        to={`/goals/weekly/${weekId}`}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Week {weekId}
      </Link>

      {/* Task header */}
      <div
        className={`bg-white rounded-lg border border-gray-200 p-6 ${
          stalenessClass ? `border-l-4 ${stalenessClass}` : ''
        }`}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">{task.title}</h1>
            <div className="flex items-center gap-3 mt-2">
              {task.category && (
                <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                  {task.category.name}
                </span>
              )}
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  task.status === 'completed'
                    ? 'bg-green-50 text-green-700'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {task.status === 'completed' ? 'Completed' : 'Pending'}
              </span>
              {task.stalenessCount > 0 && (
                <span className="text-xs text-orange-600">
                  {getStalenessDescription(task.stalenessCount)}
                </span>
              )}
              {task.isRecurring && (
                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                  Recurring
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        {task.contentHtml && (
          <div
            className="mt-4 prose prose-sm max-w-none text-gray-700"
            dangerouslySetInnerHTML={{ __html: task.contentHtml }}
          />
        )}

        {/* Actions */}
        <div className="mt-6 flex items-center gap-3 border-t border-gray-100 pt-4">
          <button
            onClick={handleToggleStatus}
            disabled={togglingStatus}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              task.status === 'completed'
                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                : 'bg-green-600 text-white hover:bg-green-700'
            } disabled:opacity-50`}
          >
            {togglingStatus
              ? 'Updating...'
              : task.status === 'completed'
              ? 'Mark Incomplete'
              : 'Mark Complete'}
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="p-2 text-gray-400 hover:text-red-600 transition-colors"
            title="Delete task"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">Delete Task</h3>
            <p className="mt-2 text-sm text-gray-600">
              Are you sure you want to delete "{task.title}"? This action cannot
              be undone.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteTask}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notes section */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes</h2>

        {/* Add note form */}
        <form
          onSubmit={handleAddNote}
          className="bg-white rounded-lg border border-gray-200 p-4 mb-4"
        >
          <textarea
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            placeholder="Add a note (Markdown supported)..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
          />
          <div className="flex justify-end mt-2">
            <button
              type="submit"
              disabled={!noteContent.trim() || addingNote}
              className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {addingNote ? 'Adding...' : 'Add Note'}
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
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
            {notesError}
          </div>
        )}

        {!notesLoading && notes && notes.length === 0 && (
          <p className="text-sm text-gray-400">No notes yet.</p>
        )}

        {notes && notes.length > 0 && (
          <div className="space-y-3">
            {notes.map((note) => (
              <div
                key={note.id}
                className="bg-white rounded-lg border border-gray-200 p-4"
              >
                <div
                  className="prose prose-sm max-w-none text-gray-700"
                  dangerouslySetInnerHTML={{ __html: note.contentHtml }}
                />
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                  <span className="text-xs text-gray-400">
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
                    className="text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
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
