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
          <h1 className="text-xl font-mono font-bold text-zinc-100 flex items-center gap-2">
            <span className="text-violet-400">$</span> tasks::backlog
          </h1>
          <p className="text-xs font-mono text-zinc-600 mt-1">queued items for future weeks</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono font-medium rounded hover:bg-emerald-500/20 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          add item
        </button>
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="mt-4 bg-zinc-900 rounded-lg border border-zinc-800 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-mono font-medium text-zinc-200">new backlog item</h3>
            <button
              onClick={() => setShowAddForm(false)}
              className="text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={handleAdd} className="space-y-3">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="title"
              className="w-full px-3 py-2 border border-zinc-700 bg-zinc-900 rounded text-sm font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50"
              autoFocus
            />
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="w-full px-3 py-2 border border-zinc-700 bg-zinc-900 rounded text-sm font-mono text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50"
            >
              <option value="">no category</option>
              {categories?.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="content (markdown, optional)"
              rows={3}
              className="w-full px-3 py-2 border border-zinc-700 bg-zinc-900 rounded text-sm font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 resize-y"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-3 py-1.5 text-xs font-mono text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                cancel
              </button>
              <button
                type="submit"
                disabled={!newTitle.trim() || adding}
                className="px-4 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono font-medium rounded hover:bg-emerald-500/20 disabled:opacity-40 transition-colors"
              >
                {adding ? 'adding...' : 'add'}
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
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400 text-sm font-mono">
            {error}
          </div>
        )}

        {!loading && !error && sortedItems.length === 0 && (
          <div className="text-center py-12 text-zinc-600 font-mono text-sm">
            <p>no backlog items</p>
          </div>
        )}

        {sortedItems.length > 0 && (
          <div className="bg-zinc-900 rounded-lg border border-zinc-800 divide-y divide-zinc-800">
            {sortedItems.map((item) => {
              const category = categories?.find((c) => c.id === item.categoryId)
              return (
                <Link
                  key={item.id}
                  to={`/goals/backlog/${item.id}`}
                  className="flex items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-mono text-zinc-200">{item.title}</span>
                    {category && (
                      <span className="text-[10px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded">
                        {category.name}
                      </span>
                    )}
                  </div>
                  {item.priority > 0 && (
                    <span className="text-[10px] font-mono text-zinc-600">
                      priority {item.priority}
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
