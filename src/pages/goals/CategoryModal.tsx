import { useState, useEffect } from 'react'
import { useParams, useNavigate, useOutletContext } from 'react-router-dom'
import { Trash2, Plus, X } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/contexts/ToastContext'
import { categoriesApi, tagsApi } from '@/lib/api'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import type { Tag } from '@/types'

interface OutletContext {
  refetch: () => Promise<void>
}

export function CategoryModal() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { refetch } = useOutletContext<OutletContext>()

  const isEdit = Boolean(id)
  const categoryId = id ? Number(id) : 0
  const [loading, setLoading] = useState(isEdit)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Tags management
  const [tags, setTags] = useState<Tag[]>([])
  const [showNewTag, setShowNewTag] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [creatingTag, setCreatingTag] = useState(false)

  useEffect(() => {
    if (!id) return

    categoriesApi.list().then((cats) => {
      const cat = cats.find((c) => c.id === categoryId)
      if (cat) {
        setName(cat.name)
        setDescription(cat.description ?? '')
        setLoading(false)
      } else {
        toast.error('category not found')
        navigate('/settings/categories')
      }
    }).catch(() => {
      toast.error('failed to load category')
      navigate('/settings/categories')
    })

    tagsApi.list(categoryId).then(setTags).catch(() => {})
  }, [id, categoryId, navigate, toast])

  const close = () => navigate('/settings/categories')

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setSaving(true)
    try {
      if (isEdit) {
        await categoriesApi.update(categoryId, {
          name: name.trim(),
          description: description.trim() || null,
        })
        toast.success('category updated')
      } else {
        await categoriesApi.create({
          name: name.trim(),
          description: description.trim() || null,
        })
        toast.success('category created')
      }
      close()
      refetch()
    } catch {
      toast.error(isEdit ? 'failed to update category' : 'failed to create category')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    try {
      await categoriesApi.delete(categoryId)
      toast.success('category deleted')
      close()
      refetch()
    } catch {
      toast.error('failed to delete category')
    }
  }

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTagName.trim()) return

    setCreatingTag(true)
    try {
      const tag = await tagsApi.create({ name: newTagName.trim(), categoryId })
      setTags((prev) => [...prev, tag])
      setNewTagName('')
      setShowNewTag(false)
      toast.success('tag created')
    } catch {
      toast.error('failed to create tag')
    } finally {
      setCreatingTag(false)
    }
  }

  const handleDeleteTag = async (tagId: number) => {
    const prev = tags
    setTags((current) => current.filter((t) => t.id !== tagId))
    try {
      await tagsApi.delete(tagId)
      toast.success('tag deleted')
    } catch {
      setTags(prev)
      toast.error('failed to delete tag')
    }
  }

  const sortedTags = [...tags].sort((a, b) => a.name.localeCompare(b.name))

  return (
    <Modal
      isOpen
      onClose={close}
      title={isEdit ? 'edit category' : 'new category'}
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
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="category name"
              className="w-full px-3 py-2 border border-zinc-700 bg-zinc-900 rounded text-sm font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50"
              autoFocus
            />
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="description (optional)"
              className="w-full px-3 py-2 border border-zinc-700 bg-zinc-900 rounded text-sm font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50"
            />

            {/* Tags section — only in edit mode */}
            {isEdit && (
              <div>
                <h3 className="text-[11px] font-mono font-medium text-zinc-500 uppercase tracking-widest mb-2">Tags</h3>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {sortedTags.map((tag) => (
                    <span
                      key={tag.id}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono bg-emerald-500/10 text-emerald-400/70 border border-emerald-500/20"
                    >
                      {tag.name}
                      <button
                        type="button"
                        onClick={() => handleDeleteTag(tag.id)}
                        className="text-emerald-400/40 hover:text-red-400 transition-colors"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))}
                  {!showNewTag && (
                    <button
                      type="button"
                      onClick={() => setShowNewTag(true)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono text-zinc-600 hover:text-zinc-400 border border-dashed border-zinc-700 hover:border-zinc-600 transition-colors"
                    >
                      <Plus className="w-2.5 h-2.5" />
                      add tag
                    </button>
                  )}
                </div>

                {showNewTag && (
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="text"
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      placeholder="tag name"
                      className="flex-1 px-2 py-1 border border-zinc-700 bg-zinc-900 rounded text-xs font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/20"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleCreateTag(e)
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleCreateTag}
                      disabled={!newTagName.trim() || creatingTag}
                      className="px-2 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-mono rounded hover:bg-emerald-500/20 disabled:opacity-40 transition-colors"
                    >
                      {creatingTag ? '...' : 'add'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewTag(false)
                        setNewTagName('')
                      }}
                      className="text-zinc-600 hover:text-zinc-400 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {tags.length === 0 && !showNewTag && (
                  <p className="text-xs font-mono text-zinc-600">no tags yet</p>
                )}
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <div>
                {isEdit && (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono text-zinc-400 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> delete
                  </button>
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
                  disabled={!name.trim() || saving}
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
                are you sure? tasks and backlog items using this category will become uncategorized.
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
