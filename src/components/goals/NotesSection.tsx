import { useState, useEffect, useRef, useCallback } from 'react'
import { Trash2, ImagePlus, X as XIcon } from 'lucide-react'
import { AutoResizeTextarea } from '@/components/ui/AutoResizeTextarea'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { notesApi, attachmentsApi } from '@/lib/api'
import { useToast } from '@/contexts/ToastContext'
import type { Note, Attachment } from '@/types'

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
  const [attachmentsByNote, setAttachmentsByNote] = useState<Map<number, Attachment[]>>(new Map())
  const [uploadingNoteId, setUploadingNoteId] = useState<number | null>(null)
  const fileInputRefs = useRef<Map<number, HTMLInputElement>>(new Map())

  const fetchAttachments = useCallback(async (noteIds: number[]) => {
    const results = await Promise.all(
      noteIds.map(async (noteId) => {
        try {
          const attachments = await attachmentsApi.listByNote(noteId)
          return [noteId, attachments] as const
        } catch {
          return [noteId, []] as const
        }
      })
    )
    setAttachmentsByNote(new Map(results))
  }, [])

  useEffect(() => {
    if (notes && notes.length > 0) {
      fetchAttachments(notes.map(n => n.id))
    } else {
      setAttachmentsByNote(new Map())
    }
  }, [notes, fetchAttachments])

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

  const handleUpload = async (noteId: number, file: File) => {
    setUploadingNoteId(noteId)
    try {
      const attachment = await attachmentsApi.upload(noteId, file)
      setAttachmentsByNote(prev => {
        const next = new Map(prev)
        const existing = next.get(noteId) || []
        next.set(noteId, [...existing, attachment])
        return next
      })
      toast.success('image uploaded')
    } catch {
      toast.error('failed to upload image')
    } finally {
      setUploadingNoteId(null)
    }
  }

  const handleDeleteAttachment = async (noteId: number, attachmentId: number) => {
    try {
      await attachmentsApi.delete(attachmentId)
      setAttachmentsByNote(prev => {
        const next = new Map(prev)
        const existing = next.get(noteId) || []
        next.set(noteId, existing.filter(a => a.id !== attachmentId))
        return next
      })
      toast.success('image deleted')
    } catch {
      toast.error('failed to delete image')
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
          {notes.map((note) => {
            const noteAttachments = attachmentsByNote.get(note.id) || []
            return (
              <div
                key={note.id}
                className="bg-zinc-800/50 rounded border border-zinc-700/50 p-3"
              >
                <div
                  className="prose prose-sm prose-invert max-w-none text-zinc-400 markdown-content"
                  dangerouslySetInnerHTML={{ __html: note.contentHtml }}
                />
                {noteAttachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {noteAttachments.map((attachment) => (
                      <div key={attachment.id} className="relative group">
                        <img
                          src={attachmentsApi.getUrl(attachment.blobKey)}
                          alt={attachment.filename}
                          className="h-20 w-20 object-cover rounded border border-zinc-700"
                        />
                        <button
                          onClick={() => handleDeleteAttachment(note.id, attachment.id)}
                          className="absolute -top-1.5 -right-1.5 bg-zinc-900 border border-zinc-700 rounded-full p-0.5 text-zinc-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Delete image"
                        >
                          <XIcon className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
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
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      ref={(el) => {
                        if (el) fileInputRefs.current.set(note.id, el)
                      }}
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleUpload(note.id, file)
                        e.target.value = ''
                      }}
                    />
                    <button
                      onClick={() => fileInputRefs.current.get(note.id)?.click()}
                      disabled={uploadingNoteId === note.id}
                      className="text-zinc-600 hover:text-zinc-400 transition-colors disabled:opacity-40"
                      title="Upload image"
                    >
                      <ImagePlus className="w-3.5 h-3.5" />
                    </button>
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
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
