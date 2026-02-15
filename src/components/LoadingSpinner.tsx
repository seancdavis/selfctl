export function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-10 h-10' }
  return (
    <div
      className={`animate-spin ${sizes[size]} border-2 border-zinc-700 border-t-emerald-400 rounded-full`}
    />
  )
}

export function PageLoader({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950">
      <LoadingSpinner size="lg" />
      {message && <p className="mt-4 text-xs font-mono text-zinc-600">{message}</p>}
    </div>
  )
}
