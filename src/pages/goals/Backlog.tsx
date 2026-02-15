import { Link, Outlet, useNavigate } from 'react-router-dom'
import { usePageTitle } from '@/hooks/usePageTitle'
import { Plus } from 'lucide-react'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useCategories } from '@/contexts/CategoriesContext'
import { backlogApi } from '@/lib/api'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import type { BacklogItem } from '@/types'

export function Backlog() {
  usePageTitle('Backlog')
  const navigate = useNavigate()
  const { data: categories } = useCategories()
  const { data: items, loading, error, refetch, setData: setItems } = useAsyncData<BacklogItem[]>(
    () => backlogApi.list(),
    []
  )

  const sortedItems = items
    ? [...items].sort((a, b) => a.title.localeCompare(b.title))
    : []

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-mono font-bold text-zinc-100 flex items-center gap-2">
            <span className="text-violet-400">$</span> tasks::backlog
          </h1>
          <p className="text-xs font-mono text-zinc-600 mt-1">queued items for future weeks</p>
        </div>
        <Link
          to="/goals/backlog/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono font-medium rounded hover:bg-emerald-500/20 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          add item
        </Link>
      </div>

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
                <div
                  key={item.id}
                  onClick={() => navigate(`/goals/backlog/${item.id}`)}
                  className="flex items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-mono text-zinc-200">{item.title}</span>
                    {category && (
                      <span className="text-[10px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded">
                        {category.name}
                      </span>
                    )}
                    {item.tags?.length > 0 && item.tags.map((tag) => (
                      <span key={tag} className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400/70 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <Outlet context={{ refetch, items, setItems }} />
    </div>
  )
}
