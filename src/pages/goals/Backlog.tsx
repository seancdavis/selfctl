import { useState } from 'react'
import { usePageTitle } from '@/hooks/usePageTitle'
import { Link } from 'react-router-dom'
import { Plus, X } from 'lucide-react'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useCategories } from '@/contexts/CategoriesContext'
import { backlogApi } from '@/lib/api'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import type { BacklogItem } from '@/types'

export function Backlog() {
  usePageTitle('Backlog')
  const { data: categories } = useCategories()
  const { data: items, loading, error, refetch } = useAsyncData<BacklogItem[]>(
    () => backlogApi.list(),
    []
  )

  const [showAddForm, setShowAddForm] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newCategory, setNewCategory] = useState<string>('')
  const [newContent, setNewContent] = useState('')
  const [adding, setAdding] = useState(false)

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) return

    setAdding(true)
    try {
      await backlogApi.create({
        title: newTitle.trim(),
        categoryId: newCategory ? Number(newCategory) : null,
        contentMarkdown: newContent.trim() || null,
        priority: 0,
      })
      setNewTitle('')
      setNewCategory('')
      setNewContent('')
      setShowAddForm(false)
      refetch()
    } catch {
      // silent
    } finally {
      setAdding(false)
    }
  }

  const sortedItems = items ? [...items].sort((a, b) => b.priority - a.priority || a.title.localeCompare(b.title)) : []

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Backlog</h1>
          <p className="text-gray-500 mt-1">Items saved for future weeks.</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Item
        </button>
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="mt-4 bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-900">New Backlog Item</h3>
            <button
              onClick={() => setShowAddForm(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={handleAdd} className="space-y-3">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Title"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">No category</option>
              {categories?.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="Content (Markdown, optional)"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!newTitle.trim() || adding}
                className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {adding ? 'Adding...' : 'Add Item'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* List */}
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

        {!loading && !error && sortedItems.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <p>No backlog items.</p>
          </div>
        )}

        {sortedItems.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
            {sortedItems.map((item) => {
              const category = categories?.find((c) => c.id === item.categoryId)
              return (
                <Link
                  key={item.id}
                  to={`/goals/backlog/${item.id}`}
                  className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-900">{item.title}</span>
                    {category && (
                      <span className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-full">
                        {category.name}
                      </span>
                    )}
                  </div>
                  {item.priority > 0 && (
                    <span className="text-xs text-gray-400">
                      Priority {item.priority}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
