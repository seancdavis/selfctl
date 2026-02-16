import { Link, Outlet, useNavigate } from 'react-router-dom'
import { usePageTitle } from '@/hooks/usePageTitle'
import { Plus } from 'lucide-react'
import { useAsyncData } from '@/hooks/useAsyncData'
import { useCategories } from '@/contexts/CategoriesContext'
import { recurringTasksApi } from '@/lib/api'
import type { RecurringTask } from '@/types'

export function Recurring() {
  usePageTitle('Recurring Tasks')
  const navigate = useNavigate()
  const { data: categories } = useCategories()
  const { data: tasks, loading, error, refetch, setData: setTasks } = useAsyncData<RecurringTask[]>(
    () => recurringTasksApi.list(),
    []
  )

  const sort = (a: RecurringTask, b: RecurringTask) => a.title.localeCompare(b.title)
  const activeTasks = (tasks?.filter((t) => t.isActive) ?? []).sort(sort)
  const pausedTasks = (tasks?.filter((t) => !t.isActive) ?? []).sort(sort)

  const renderTaskRow = (task: RecurringTask) => {
    const category = categories?.find((c) => c.id === task.categoryId)
    return (
      <div
        key={task.id}
        onClick={() => navigate(`/goals/recurring/${task.id}`)}
        className="p-4 hover:bg-zinc-800/50 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-sm font-mono text-zinc-200">{task.title}</span>
          {category && (
            <span className="text-[10px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded shrink-0">
              {category.name}
            </span>
          )}
          {task.tags?.length > 0 && task.tags.map((tag) => (
            <span key={tag} className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400/70 border border-emerald-500/20 px-1.5 py-0.5 rounded shrink-0">
              {tag}
            </span>
          ))}
        </div>
        {task.contentHtml && (
          <div
            className="mt-1.5 text-xs font-mono text-zinc-500 line-clamp-2 prose prose-sm prose-invert max-w-none [&>*]:m-0 markdown-content"
            dangerouslySetInnerHTML={{ __html: task.contentHtml }}
          />
        )}
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-mono font-bold text-zinc-100 flex items-center gap-2">
            <span className="text-amber-400">$</span> tasks::recurring
          </h1>
          <p className="text-xs font-mono text-zinc-600 mt-1">managed routines — repeat every week</p>
        </div>
        <Link
          to="/goals/recurring/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono font-medium rounded hover:bg-emerald-500/20 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          add task
        </Link>
      </div>

      <div className="mt-6">
        {loading && !tasks?.length && (
          <div className="text-center py-12 text-zinc-600 font-mono text-sm">
            <p>loading...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400 text-sm font-mono">
            {error}
          </div>
        )}

        {!loading && !error && tasks && tasks.length === 0 && (
          <div className="text-center py-12 text-zinc-600 font-mono text-sm">
            <p>no recurring tasks</p>
          </div>
        )}

        {activeTasks.length > 0 && (
          <div className="mb-6">
            <h2 className="text-[11px] font-mono font-medium text-zinc-500 uppercase tracking-widest mb-2">
              Active ({activeTasks.length})
            </h2>
            <div className="bg-zinc-900 rounded-lg border border-zinc-800 divide-y divide-zinc-800">
              {activeTasks.map(renderTaskRow)}
            </div>
          </div>
        )}

        {pausedTasks.length > 0 && (
          <div>
            <h2 className="text-[11px] font-mono font-medium text-zinc-500 uppercase tracking-widest mb-2">
              Paused ({pausedTasks.length})
            </h2>
            <div className="bg-zinc-900 rounded-lg border border-zinc-800 divide-y divide-zinc-800 opacity-60">
              {pausedTasks.map(renderTaskRow)}
            </div>
          </div>
        )}
      </div>

      <Outlet context={{ refetch, tasks, setTasks }} />
    </div>
  )
}
