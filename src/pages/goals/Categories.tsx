import { useState } from 'react'
import { usePageTitle } from '@/hooks/usePageTitle'
import { Plus, X, Pencil, Trash2, Check } from 'lucide-react'
import { useCategories } from '@/contexts/CategoriesContext'
import { categoriesApi } from '@/lib/api'
import { LoadingSpinner } from '@/components/LoadingSpinner'

export function Categories() {
  usePageTitle('Categories')
  const { data: categories, loading, error, refetch } = useCategories()

  const [showAddForm, setShowAddForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingName, setEditingName] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const sortedCategories = categories
    ? [...categories].sort((a, b) => a.name.localeCompare(b.name))
    : []

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return

    setAdding(true)
    try {
      await categoriesApi.create({ name: newName.trim() })
      setNewName('')
      setShowAddForm(false)
      refetch()
    } catch {
      // silent
    } finally {
      setAdding(false)
    }
  }

  const startEdit = (id: number, name: string) => {
    setEditingId(id)
    setEditingName(name)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditingName('')
  }

  const handleSaveEdit = async (id: number) => {
    if (!editingName.trim()) return

    setSavingEdit(true)
    try {
      await categoriesApi.update(id, { name: editingName.trim() })
      cancelEdit()
      refetch()
    } catch {
      // silent
    } finally {
      setSavingEdit(false)
    }
  }

  const handleDelete = async (id: number) => {
    setDeletingId(id)
    try {
      await categoriesApi.delete(id)
      setShowDeleteConfirm(null)
      refetch()
    } catch {
      // silent
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-mono font-bold text-zinc-100 flex items-center gap-2">
            <span className="text-zinc-500">$</span> config::categories
          </h1>
          <p className="text-xs font-mono text-zinc-600 mt-1">organize tasks and backlog items</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono font-medium rounded hover:bg-emerald-500/20 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          add category
        </button>
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="mt-4 bg-zinc-900 rounded-lg border border-zinc-800 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-mono font-medium text-zinc-200">new category</h3>
            <button
              onClick={() => {
                setShowAddForm(false)
                setNewName('')
              }}
              className="text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={handleAdd} className="flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="category name"
              className="flex-1 px-3 py-2 border border-zinc-700 bg-zinc-900 rounded text-sm font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50"
              autoFocus
            />
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false)
                setNewName('')
              }}
              className="px-3 py-2 text-xs font-mono text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              cancel
            </button>
            <button
              type="submit"
              disabled={!newName.trim() || adding}
              className="px-4 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono font-medium rounded hover:bg-emerald-500/20 disabled:opacity-40 transition-colors"
            >
              {adding ? 'adding...' : 'add'}
            </button>
          </form>
        </div>
      )}

      <div className="mt-6">
        {loading && (
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400 text-sm font-mono">
            {error}
          </div>
        )}

        {!loading && !error && sortedCategories.length === 0 && (
          <div className="text-center py-12 text-zinc-600 font-mono text-sm">
            <p>no categories yet</p>
          </div>
        )}

        {sortedCategories.length > 0 && (
          <div className="bg-zinc-900 rounded-lg border border-zinc-800 divide-y divide-zinc-800">
            {sortedCategories.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center justify-between p-4"
              >
                {editingId === cat.id ? (
                  <div className="flex-1 flex items-center gap-2">
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="flex-1 px-3 py-1.5 border border-zinc-700 bg-zinc-900 rounded text-sm font-mono text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit(cat.id)
                        if (e.key === 'Escape') cancelEdit()
                      }}
                    />
                    <button
                      onClick={() => handleSaveEdit(cat.id)}
                      disabled={!editingName.trim() || savingEdit}
                      className="p-1.5 text-emerald-400 hover:text-emerald-300 disabled:opacity-40 transition-colors"
                      title="Save"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="p-1.5 text-zinc-600 hover:text-zinc-400 transition-colors"
                      title="Cancel"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="text-sm font-mono text-zinc-200">{cat.name}</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => startEdit(cat.id, cat.name)}
                        className="p-1.5 text-zinc-600 hover:text-zinc-400 transition-colors"
                        title="Edit"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(cat.id)}
                        className="p-1.5 text-zinc-600 hover:text-red-400 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      {showDeleteConfirm !== null && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 max-w-sm mx-4 shadow-2xl">
            <h3 className="text-sm font-mono font-semibold text-zinc-200">
              delete category
            </h3>
            <p className="mt-2 text-sm font-mono text-zinc-500">
              Are you sure you want to delete this category? Tasks and backlog
              items using this category will become uncategorized.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 text-xs font-mono text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                cancel
              </button>
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
                disabled={deletingId === showDeleteConfirm}
                className="px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-mono font-medium rounded hover:bg-red-500/20 disabled:opacity-40 transition-colors"
              >
                {deletingId === showDeleteConfirm ? 'deleting...' : 'delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
