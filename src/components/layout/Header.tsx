import { useAuth } from '@/hooks/useAuth'

export function Header() {
  const { user, signOut } = useAuth()

  return (
    <header className="h-12 bg-zinc-900/30 border-b border-zinc-800 flex items-center justify-end px-6">
      <div className="flex items-center gap-4">
        {user && (
          <>
            <div className="flex items-center gap-2">
              {user.image && (
                <img src={user.image} alt="" className="w-5 h-5 rounded-full ring-1 ring-zinc-700" />
              )}
              <span className="text-xs font-mono text-zinc-500">{user.name || user.email}</span>
            </div>
            <button
              onClick={signOut}
              className="text-xs font-mono text-zinc-600 hover:text-zinc-400 transition-colors cursor-pointer"
            >
              sign out
            </button>
          </>
        )}
      </div>
    </header>
  )
}
