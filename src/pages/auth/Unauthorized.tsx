import { useAuth } from '@/hooks/useAuth'

export function Unauthorized() {
  const { user, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full px-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h2 className="text-lg font-semibold text-red-800 mb-2">Access Denied</h2>
          <p className="text-red-600 mb-4">
            Your account is not approved for this application.
          </p>
          {user && (
            <p className="text-sm text-gray-500 mb-4">
              Signed in as {user.email}
            </p>
          )}
          <button
            onClick={signOut}
            className="text-sm text-gray-600 hover:text-gray-900 underline cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}
