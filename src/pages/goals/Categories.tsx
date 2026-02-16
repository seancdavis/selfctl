import { useState, useEffect, useMemo } from 'react'
import { Link, Outlet, useNavigate } from 'react-router-dom'
import { usePageTitle } from '@/hooks/usePageTitle'
import { Plus } from 'lucide-react'
import { useCategories } from '@/contexts/CategoriesContext'
import { tagsApi } from '@/lib/api'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import type { Tag } from '@/types'

export function Categories() {
  usePageTitle('Categories')
  const navigate = useNavigate()
  const { data: categories, loading, error, refetch } = useCategories()
  const [allTags, setAllTags] = useState<Tag[]>([])

  useEffect(() => {
    tagsApi.list().then(setAllTags).catch(() => {})
  }, [categories])

  const tagsByCategory = useMemo(() => {
    const map = new Map<number, Tag[]>()
    for (const tag of allTags) {
      const existing = map.get(tag.categoryId) ?? []
      existing.push(tag)
      map.set(tag.categoryId, existing)
    }
    return map
  }, [allTags])

  const sortedCategories = categories
    ? [...categories].sort((a, b) => a.name.localeCompare(b.name))
    : []

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-mono font-bold text-zinc-100 flex items-center gap-2">
            <span className="text-zinc-500">$</span> config::categories
          </h1>
          <p className="text-xs font-mono text-zinc-600 mt-1">organize tasks and backlog items</p>
        </div>
        <Link
          to="/settings/categories/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono font-medium rounded hover:bg-emerald-500/20 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          add category
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

        {!loading && !error && sortedCategories.length === 0 && (
          <div className="text-center py-12 text-zinc-600 font-mono text-sm">
            <p>no categories yet</p>
          </div>
        )}

        {sortedCategories.length > 0 && (
          <div className="bg-zinc-900 rounded-lg border border-zinc-800 divide-y divide-zinc-800">
            {sortedCategories.map((cat) => {
              const catTags = (tagsByCategory.get(cat.id) ?? []).sort((a, b) =>
                a.name.localeCompare(b.name)
              )
              return (
                <div
                  key={cat.id}
                  onClick={() => navigate(`/settings/categories/${cat.id}`)}
                  className="p-4 hover:bg-zinc-800/50 transition-colors cursor-pointer"
                >
                  <span className="text-sm font-mono text-zinc-200">{cat.name}</span>
                  {cat.description && (
                    <p className="text-xs font-mono text-zinc-500 mt-0.5">{cat.description}</p>
                  )}
                  {catTags.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap mt-2">
                      {catTags.map((tag) => (
                        <span
                          key={tag.id}
                          className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono bg-emerald-500/10 text-emerald-400/70 border border-emerald-500/20"
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <Outlet context={{ refetch }} />
    </div>
  )
}
