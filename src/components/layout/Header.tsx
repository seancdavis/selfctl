import { Moon, Sun } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useDarkMode } from '@/hooks/useDarkMode'

export function Header() {
  const { user, signOut } = useAuth()
  const { theme, toggle } = useDarkMode()

  return (
    <header className="h-14 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center justify-end px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={toggle}
          className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
        {user && (
          <>
            {user.image && (
              <img src={user.image} alt="" className="w-7 h-7 rounded-full" />
            )}
            <span className="text-sm text-gray-600 dark:text-gray-400">{user.name || user.email}</span>
            <button
              onClick={signOut}
              className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer"
            >
              Sign Out
            </button>
          </>
        )}
      </div>
    </header>
  )
}
