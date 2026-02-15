import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Activity,
  Target,
  ListTodo,
  RotateCcw,
  FolderOpen,
} from 'lucide-react'

const navSections = [
  {
    items: [
      { to: '/', label: 'dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'vitals',
    items: [
      { to: '/health', label: 'weight', icon: Activity },
    ],
  },
  {
    label: 'tasks',
    items: [
      { to: '/goals/weekly', label: 'weekly', icon: Target },
      { to: '/goals/backlog', label: 'backlog', icon: ListTodo },
      { to: '/goals/recurring', label: 'recurring', icon: RotateCcw },
    ],
  },
  {
    label: 'config',
    items: [
      { to: '/settings/categories', label: 'categories', icon: FolderOpen },
    ],
  },
]

export function Sidebar() {
  const location = useLocation()

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  return (
    <aside className="w-52 bg-zinc-900/50 border-r border-zinc-800 flex flex-col">
      <div className="p-4 border-b border-zinc-800">
        <Link to="/" className="font-mono text-base font-bold text-zinc-100 tracking-tight flex items-center gap-1.5">
          <span className="text-emerald-400">{'>'}</span>
          <span>selfctl</span>
          <span className="animate-pulse text-emerald-400 ml-0.5">_</span>
        </Link>
      </div>

      <nav className="flex-1 p-3 space-y-4">
        {navSections.map((section, i) => (
          <div key={i}>
            {section.label && (
              <p className="px-3 mb-1.5 text-[10px] font-mono font-medium text-zinc-600 uppercase tracking-widest">
                {section.label}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center gap-2.5 px-3 py-1.5 rounded text-sm font-mono font-medium transition-colors ${
                    isActive(to)
                      ? 'bg-zinc-800 text-emerald-400 border border-zinc-700'
                      : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 border border-transparent'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-zinc-800">
        <div className="px-3 py-1.5">
          <span className="text-[10px] font-mono text-zinc-700">v0.1.0</span>
        </div>
      </div>
    </aside>
  )
}
