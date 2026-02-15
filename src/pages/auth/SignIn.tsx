import { useAuth } from '@/hooks/useAuth'

export function SignIn() {
  const { signInWithGoogle, user } = useAuth()

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="max-w-sm w-full px-6">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-mono font-bold text-zinc-100 flex items-center justify-center gap-2">
            <span className="text-emerald-400">{'>'}</span>
            selfctl
            <span className="animate-pulse text-emerald-400">_</span>
          </h1>
          <p className="text-zinc-600 text-sm font-mono mt-3">
            authenticate to continue
          </p>
        </div>

        {user ? (
          <p className="text-center text-zinc-600 text-sm font-mono">checking access...</p>
        ) : (
          <button
            onClick={signInWithGoogle}
            className="w-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 py-2.5 px-4 rounded font-mono text-sm font-medium transition-all cursor-pointer"
          >
            continue with google
          </button>
        )}
      </div>
    </div>
  )
}
