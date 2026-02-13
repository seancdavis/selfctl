import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Heart,
  Target,
  ListTodo,
  RotateCcw,
  FolderOpen,
} from 'lucide-react'

const navSections = [
  {
    items: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Health',
    items: [
      { to: '/health', label: 'Weight & Body', icon: Heart },
    ],
  },
  {
    label: 'Goals',
    items: [
      { to: '/goals/weekly', label: 'Weekly Goals', icon: Target },
      { to: '/goals/backlog', label: 'Backlog', icon: ListTodo },
      { to: '/goals/recurring', label: 'Recurring', icon: RotateCcw },
    ],
  },
  {
    label: 'Settings',
    items: [
      { to: '/settings/categories', label: 'Categories', icon: FolderOpen },
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
    <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <Link to="/" className="text-lg font-semibold text-gray-900">
          Dashboard
        </Link>
      </div>

      <nav className="flex-1 p-3 space-y-4">
        {navSections.map((section, i) => (
          <div key={i}>
            {section.label && (
              <p className="px-3 mb-1 text-xs font-medium text-gray-400 uppercase tracking-wider">
                {section.label}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive(to)
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  )
}
