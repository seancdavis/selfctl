import { useAuth } from '@/hooks/useAuth'

export function Unauthorized() {
  const { user, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="max-w-sm w-full px-6">
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 text-center">
          <h2 className="text-sm font-mono font-semibold text-red-400 mb-2">access denied</h2>
          <p className="text-red-400/70 text-sm font-mono mb-4">
            account not approved for this instance
          </p>
          {user && (
            <p className="text-xs font-mono text-zinc-600 mb-4">
              signed in as {user.email}
            </p>
          )}
          <button
            onClick={signOut}
            className="text-xs font-mono text-zinc-600 hover:text-zinc-400 underline cursor-pointer transition-colors"
          >
            sign out
          </button>
        </div>
      </div>
    </div>
  )
}
