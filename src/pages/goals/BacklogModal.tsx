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
import { backlogApi, notesApi, weeksApi } from '@/lib/api'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import type { BacklogItem, Note, Week } from '@/types'
import type { Dispatch, SetStateAction } from 'react'

interface OutletContext {
  refetch: () => Promise<void>
  items: BacklogItem[] | null
  setItems: Dispatch<SetStateAction<BacklogItem[] | null>>
}

export function BacklogModal() {
  const { itemId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { data: categories } = useCategories()
  const { refetch, items, setItems } = useOutletContext<OutletContext>()

  const isEdit = Boolean(itemId)
  const itemIdNum = itemId ? Number(itemId) : 0
  const [loading, setLoading] = useState(isEdit)
  const [title, setTitle] = useState('')
  const [categoryId, setCategoryId] = useState<string>('')
  const [content, setContent] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [item, setItem] = useState<BacklogItem | null>(null)
  const [saving, setSaving] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showMoveToWeek, setShowMoveToWeek] = useState(false)
  const [selectedWeekId, setSelectedWeekId] = useState('')
  const [moving, setMoving] = useState(false)

  const { data: weeks } = useAsyncData<Week[]>(() => weeksApi.list(), [])

  const {
    data: notes,
    loading: notesLoading,
    refetch: refetchNotes,
  } = useAsyncData<Note[]>(
    () => (isEdit ? notesApi.listByBacklogItem(itemIdNum) : Promise.resolve([])),
    [itemIdNum]
  )

  // API returns sorted by startDate desc already
  const sortedWeeks = weeks ?? []

  useEffect(() => {
    if (!itemId) return

    backlogApi.get(Number(itemId)).then((b) => {
      setItem(b)
      setTitle(b.title)
      setCategoryId(b.categoryId ? String(b.categoryId) : '')
      setContent(b.contentMarkdown ?? '')
      setSelectedTags(b.tags ?? [])
      setLoading(false)
    }).catch(() => {
      toast.error('failed to load item')
      navigate('/goals/backlog')
    })
  }, [itemId, navigate, toast])

  const close = () => navigate('/goals/backlog')

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
      if (isEdit && item) {
        const updated = await backlogApi.update(item.id, data)
        setItems((prev) =>
          prev?.map((i) => (i.id === item.id ? updated : i)) ?? null
        )
        toast.success('item updated')
      } else {
        const created = await backlogApi.create({ ...data, priority: 0 })
        setItems((prev) => (prev ? [...prev, created] : [created]))
        toast.success('item created')
      }
      close()
      refetch()
    } catch {
      toast.error(isEdit ? 'failed to update item' : 'failed to create item')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!item) return

    const prev = items
    setItems((current) => current?.filter((i) => i.id !== item.id) ?? null)
    close()

    try {
      await backlogApi.delete(item.id)
      toast.success('item deleted')
    } catch {
      setItems(prev)
      toast.error('failed to delete item')
    }
  }

  const handleMoveToWeek = async () => {
    if (!item || !selectedWeekId) return
    setMoving(true)
    try {
      await backlogApi.moveToWeek(item.id, selectedWeekId)
      setItems((current) => current?.filter((i) => i.id !== item.id) ?? null)
      toast.success('moved to week')
      navigate(`/goals/weekly/${selectedWeekId}`)
    } catch {
      toast.error('failed to move item')
      setMoving(false)
    }
  }

  return (
    <Modal
      isOpen
      onClose={close}
      title={isEdit ? 'edit backlog item' : 'new backlog item'}
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
              placeholder="title"
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
                {isEdit && item && (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowMoveToWeek(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono text-zinc-400 hover:text-emerald-400 transition-colors"
                    >
                      move to week
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

          {showMoveToWeek && (
            <div className="mt-4 border-t border-zinc-800 pt-4">
              <p className="text-sm font-mono text-zinc-400 mb-3">
                select a week to move this item into as a task.
              </p>
              <select
                value={selectedWeekId}
                onChange={(e) => setSelectedWeekId(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-700 bg-zinc-900 rounded text-sm font-mono text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50"
              >
                <option value="">select a week</option>
                {sortedWeeks.map((w) => (
                  <option key={w.id} value={w.label}>
                    Week {w.label}
                  </option>
                ))}
              </select>
              <div className="flex justify-end gap-2 mt-3">
                <button
                  onClick={() => {
                    setShowMoveToWeek(false)
                    setSelectedWeekId('')
                  }}
                  className="px-3 py-1.5 text-xs font-mono text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  cancel
                </button>
                <button
                  onClick={handleMoveToWeek}
                  disabled={!selectedWeekId || moving}
                  className="px-4 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono font-medium rounded hover:bg-emerald-500/20 disabled:opacity-40 transition-colors"
                >
                  {moving ? 'moving...' : 'move'}
                </button>
              </div>
            </div>
          )}

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
              backlogItemId={itemIdNum}
            />
          )}
        </>
      )}
    </Modal>
  )
}
