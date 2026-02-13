import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useCategories } from '@/contexts/CategoriesContext'
import { backlogApi, notesApi, weeksApi } from '@/lib/api'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import type { BacklogItem, Note, Week } from '@/types'

export function BacklogDetail() {
  const { itemId } = useParams<{ itemId: string }>()
  const navigate = useNavigate()
  const { data: categories } = useCategories()

  const itemIdNum = itemId ? Number(itemId) : 0

  const [noteContent, setNoteContent] = useState('')
  const [addingNote, setAddingNote] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deletingNoteId, setDeletingNoteId] = useState<number | null>(null)
  const [showMoveToWeek, setShowMoveToWeek] = useState(false)
  const [selectedWeekId, setSelectedWeekId] = useState('')
  const [moving, setMoving] = useState(false)

  const {
    data: item,
    loading: itemLoading,
    error: itemError,
  } = useAsyncData<BacklogItem>(() => backlogApi.get(itemIdNum), [itemIdNum])

  const {
    data: notes,
    loading: notesLoading,
    error: notesError,
    refetch: refetchNotes,
  } = useAsyncData<Note[]>(() => notesApi.listByBacklogItem(itemIdNum), [itemIdNum])

  const { data: weeks } = useAsyncData<Week[]>(() => weeksApi.list(), [])

  const sortedWeeks = weeks ? [...weeks].sort((a, b) => b.id.localeCompare(a.id)) : []

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!noteContent.trim()) return

    setAddingNote(true)
    try {
      await notesApi.create({
        backlogItemId: itemIdNum,
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

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await backlogApi.delete(itemIdNum)
      navigate('/goals/backlog')
    } catch {
      setDeleting(false)
    }
  }

  const handleMoveToWeek = async () => {
    if (!selectedWeekId) return
    setMoving(true)
    try {
      await backlogApi.moveToWeek(itemIdNum, selectedWeekId)
      navigate(`/goals/weekly/${selectedWeekId}`)
    } catch {
      setMoving(false)
    }
  }

  if (itemLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    )
  }

  if (itemError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
        {itemError}
      </div>
    )
  }

  if (!item) {
    return (
      <div className="text-center py-12 text-gray-500">Item not found.</div>
    )
  }

  const category = categories?.find((c) => c.id === item.categoryId)

  return (
    <div className="max-w-3xl">
      {/* Back link */}
      <Link
        to="/goals/backlog"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Backlog
      </Link>

      {/* Item header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h1 className="text-xl font-bold text-gray-900">{item.title}</h1>
        <div className="flex items-center gap-3 mt-2">
          {category && (
            <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
              {category.name}
            </span>
          )}
          {item.priority > 0 && (
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
              Priority {item.priority}
            </span>
          )}
        </div>

        {/* Content */}
        {item.contentHtml && (
          <div
            className="mt-4 prose prose-sm max-w-none text-gray-700"
            dangerouslySetInnerHTML={{ __html: item.contentHtml }}
          />
        )}

        {/* Actions */}
        <div className="mt-6 flex items-center gap-3 border-t border-gray-100 pt-4">
          <button
            onClick={() => setShowMoveToWeek(true)}
            className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
          >
            Move to Week
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="p-2 text-gray-400 hover:text-red-600 transition-colors"
            title="Delete item"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Move to Week modal */}
      {showMoveToWeek && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">Move to Week</h3>
            <p className="mt-2 text-sm text-gray-600">
              Select a week to move this backlog item into as a task.
            </p>
            <select
              value={selectedWeekId}
              onChange={(e) => setSelectedWeekId(e.target.value)}
              className="mt-3 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select a week</option>
              {sortedWeeks.map((w) => (
                <option key={w.id} value={w.id}>
                  Week {w.id}
                </option>
              ))}
            </select>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowMoveToWeek(false)
                  setSelectedWeekId('')
                }}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleMoveToWeek}
                disabled={!selectedWeekId || moving}
                className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {moving ? 'Moving...' : 'Move'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">Delete Item</h3>
            <p className="mt-2 text-sm text-gray-600">
              Are you sure you want to delete "{item.title}"? This action cannot
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
                onClick={handleDelete}
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
