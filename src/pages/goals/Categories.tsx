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
          <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
          <p className="text-gray-500 mt-1">Organize your tasks and backlog items.</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Category
        </button>
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="mt-4 bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-900">New Category</h3>
            <button
              onClick={() => {
                setShowAddForm(false)
                setNewName('')
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={handleAdd} className="flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Category name"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false)
                setNewName('')
              }}
              className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!newName.trim() || adding}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {adding ? 'Adding...' : 'Add'}
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
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
            {error}
          </div>
        )}

        {!loading && !error && sortedCategories.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <p>No categories yet.</p>
          </div>
        )}

        {sortedCategories.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
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
                      className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit(cat.id)
                        if (e.key === 'Escape') cancelEdit()
                      }}
                    />
                    <button
                      onClick={() => handleSaveEdit(cat.id)}
                      disabled={!editingName.trim() || savingEdit}
                      className="p-1.5 text-green-600 hover:text-green-700 disabled:opacity-50 transition-colors"
                      title="Save"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
                      title="Cancel"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="text-sm text-gray-900">{cat.name}</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => startEdit(cat.id, cat.name)}
                        className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
                        title="Edit"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(cat.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">
              Delete Category
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              Are you sure you want to delete this category? Tasks and backlog
              items using this category will become uncategorized.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
                disabled={deletingId === showDeleteConfirm}
                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {deletingId === showDeleteConfirm ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
