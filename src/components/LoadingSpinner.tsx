export function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' }
  return (
    <div
      className={`animate-spin ${sizes[size]} border-2 border-current border-t-transparent rounded-full`}
    />
  )
}

export function PageLoader({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <LoadingSpinner size="lg" />
      {message && <p className="mt-4 text-gray-500">{message}</p>}
    </div>
  )
}
