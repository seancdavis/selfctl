import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { AutoResizeTextarea } from '@/components/ui/AutoResizeTextarea'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { notesApi } from '@/lib/api'
import { useToast } from '@/contexts/ToastContext'
import type { Note } from '@/types'

interface NotesSectionProps {
  notes: Note[] | null
  notesLoading: boolean
  refetchNotes: () => Promise<void>
  taskId?: number
  backlogItemId?: number
}

export function NotesSection({ notes, notesLoading, refetchNotes, taskId, backlogItemId }: NotesSectionProps) {
  const toast = useToast()
  const [noteContent, setNoteContent] = useState('')
  const [addingNote, setAddingNote] = useState(false)
  const [deletingNoteId, setDeletingNoteId] = useState<number | null>(null)

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!noteContent.trim()) return

    setAddingNote(true)
    try {
      await notesApi.create({
        taskId: taskId ?? null,
        backlogItemId: backlogItemId ?? null,
        contentMarkdown: noteContent.trim(),
      })
      setNoteContent('')
      refetchNotes()
      toast.success('note added')
    } catch {
      toast.error('failed to add note')
    } finally {
      setAddingNote(false)
    }
  }

  const handleDeleteNote = async (noteId: number) => {
    setDeletingNoteId(noteId)
    try {
      await notesApi.delete(noteId)
      refetchNotes()
      toast.success('note deleted')
    } catch {
      toast.error('failed to delete note')
    } finally {
      setDeletingNoteId(null)
    }
  }

  return (
    <div className="mt-6 border-t border-zinc-800 pt-4">
      <h3 className="text-[11px] font-mono font-medium text-zinc-500 uppercase tracking-widest mb-3">Notes</h3>

      <form onSubmit={handleAddNote} className="mb-4">
        <AutoResizeTextarea
          value={noteContent}
          onChange={(e) => setNoteContent(e.target.value)}
          placeholder="add a note (markdown supported)..."
          minRows={2}
          className="w-full px-3 py-2 border border-zinc-700 bg-zinc-900 rounded text-sm font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50"
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

      {notesLoading && (
        <div className="flex justify-center py-4">
          <LoadingSpinner size="sm" />
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
              className="bg-zinc-800/50 rounded border border-zinc-700/50 p-3"
            >
              <div
                className="prose prose-sm prose-invert max-w-none text-zinc-400"
                dangerouslySetInnerHTML={{ __html: note.contentHtml }}
              />
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-700/50">
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
  )
}
