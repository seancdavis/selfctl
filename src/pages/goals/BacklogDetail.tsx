import { useState } from 'react'
import { usePageTitle } from '@/hooks/usePageTitle'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useCategories } from '@/contexts/CategoriesContext'
import { backlogApi, notesApi, weeksApi } from '@/lib/api'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import type { BacklogItem, Note, Week } from '@/types'

export function BacklogDetail() {
  usePageTitle('Backlog Item')
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
      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400 text-sm font-mono">
        {itemError}
      </div>
    )
  }

  if (!item) {
    return (
      <div className="text-center py-12 text-zinc-600 font-mono text-sm">item not found</div>
    )
  }

  const category = categories?.find((c) => c.id === item.categoryId)

  return (
    <div className="max-w-3xl">
      {/* Back link */}
      <Link
        to="/goals/backlog"
        className="inline-flex items-center gap-1 text-xs font-mono text-zinc-600 hover:text-zinc-400 transition-colors mb-4"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        back to backlog
      </Link>

      {/* Item header */}
      <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-5">
        <h1 className="text-lg font-mono font-bold text-zinc-100">{item.title}</h1>
        <div className="flex items-center gap-2 mt-2">
          {category && (
            <span className="text-[10px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded font-medium">
              {category.name}
            </span>
          )}
          {item.priority > 0 && (
            <span className="text-[10px] font-mono bg-zinc-800 text-zinc-500 border border-zinc-700 px-2 py-0.5 rounded">
              priority {item.priority}
            </span>
          )}
        </div>

        {/* Content */}
        {item.contentHtml && (
          <div
            className="mt-4 prose prose-sm prose-invert max-w-none text-zinc-400"
            dangerouslySetInnerHTML={{ __html: item.contentHtml }}
          />
        )}

        {/* Actions */}
        <div className="mt-5 flex items-center gap-3 border-t border-zinc-800 pt-4">
          <button
            onClick={() => setShowMoveToWeek(true)}
            className="px-4 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono font-medium rounded hover:bg-emerald-500/20 transition-colors"
          >
            move to week
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="p-2 text-zinc-600 hover:text-red-400 transition-colors"
            title="Delete item"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Move to Week modal */}
      {showMoveToWeek && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 max-w-sm mx-4 shadow-2xl">
            <h3 className="text-sm font-mono font-semibold text-zinc-200">move to week</h3>
            <p className="mt-2 text-xs font-mono text-zinc-500">
              Select a week to move this backlog item into as a task.
            </p>
            <select
              value={selectedWeekId}
              onChange={(e) => setSelectedWeekId(e.target.value)}
              className="mt-3 w-full px-3 py-2 border border-zinc-700 bg-zinc-900 rounded text-sm font-mono text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50"
            >
              <option value="">select a week</option>
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
                className="px-4 py-2 text-xs font-mono text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                cancel
              </button>
              <button
                onClick={handleMoveToWeek}
                disabled={!selectedWeekId || moving}
                className="px-4 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono font-medium rounded hover:bg-emerald-500/20 disabled:opacity-40 transition-colors"
              >
                {moving ? 'moving...' : 'move'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 max-w-sm mx-4 shadow-2xl">
            <h3 className="text-sm font-mono font-semibold text-zinc-200">delete item</h3>
            <p className="mt-2 text-sm font-mono text-zinc-500">
              Are you sure you want to delete "{item.title}"? This action cannot
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
                onClick={handleDelete}
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
