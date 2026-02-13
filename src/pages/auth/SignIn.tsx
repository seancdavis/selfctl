import { useAuth } from '@/hooks/useAuth'

export function SignIn() {
  const { signInWithGoogle, user } = useAuth()

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full px-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold text-gray-900">Personal Dashboard</h1>
          <p className="text-gray-500 mt-2">
            Sign in with your Google account to continue.
          </p>
        </div>

        {user ? (
          <p className="text-center text-gray-400">Checking access...</p>
        ) : (
          <button
            onClick={signInWithGoogle}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium cursor-pointer"
          >
            Continue with Google
          </button>
        )}
      </div>
    </div>
  )
}
