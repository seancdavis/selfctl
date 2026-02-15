import { useState, useEffect } from 'react'
import { useParams, useNavigate, useOutletContext } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/contexts/ToastContext'
import { categoriesApi } from '@/lib/api'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import type { Category } from '@/types'

interface OutletContext {
  refetch: () => Promise<void>
}

export function CategoryModal() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { refetch } = useOutletContext<OutletContext>()

  const isEdit = Boolean(id)
  const [loading, setLoading] = useState(isEdit)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    if (!id) return

    categoriesApi.list().then((cats) => {
      const cat = cats.find((c) => c.id === Number(id))
      if (cat) {
        setName(cat.name)
        setLoading(false)
      } else {
        toast.error('category not found')
        navigate('/settings/categories')
      }
    }).catch(() => {
      toast.error('failed to load category')
      navigate('/settings/categories')
    })
  }, [id, navigate, toast])

  const close = () => navigate('/settings/categories')

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setSaving(true)
    try {
      if (isEdit) {
        await categoriesApi.update(Number(id), { name: name.trim() })
        toast.success('category updated')
      } else {
        await categoriesApi.create({ name: name.trim() })
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
      await categoriesApi.delete(Number(id))
      toast.success('category deleted')
      close()
      refetch()
    } catch {
      toast.error('failed to delete category')
    }
  }

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
