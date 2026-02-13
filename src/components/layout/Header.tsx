import { useAuth } from '@/hooks/useAuth'

export function Header() {
  const { user, signOut } = useAuth()

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-end px-6">
      {user && (
        <div className="flex items-center gap-3">
          {user.image && (
            <img src={user.image} alt="" className="w-7 h-7 rounded-full" />
          )}
          <span className="text-sm text-gray-600">{user.name || user.email}</span>
          <button
            onClick={signOut}
            className="text-sm text-gray-400 hover:text-gray-600 cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      )}
    </header>
  )
}
