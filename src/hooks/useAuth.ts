import { useState, useEffect, useCallback, createContext, useContext } from 'react'
import { authClient } from '@/lib/auth'
import { setApiUser } from '@/lib/api'

interface User {
  id: string
  email: string
  name: string
  image?: string | null
}

interface AuthContextValue {
  user: User | null
  loading: boolean
  authenticated: boolean
  approved: boolean
  signInWithGoogle: () => void
  signOut: () => Promise<void>
  refetch: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuthProvider(): AuthContextValue {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)
  const [approved, setApproved] = useState(false)

  const fetchSession = useCallback(async () => {
    try {
      // Try Neon Auth session first
      try {
        const { data } = await authClient.getSession()

        if (data?.user?.id && data?.user?.email) {
          setUser(data.user as User)
          setApiUser({ id: data.user.id, email: data.user.email })

          const authResponse = await fetch('/api/auth-check', {
            headers: {
              'x-user-id': data.user.id,
              'x-user-email': data.user.email,
            },
          })
          const authData = await authResponse.json()
          setAuthenticated(true)
          setApproved(authData.approved ?? false)
          return
        }
      } catch {
        // Neon Auth unavailable — fall through to bypass check
      }

      // No Neon Auth session — check if server has auth bypass enabled
      try {
        const authResponse = await fetch('/api/auth-check')
        const authData = await authResponse.json()

        if (authData.bypass && authData.user) {
          setUser(authData.user)
          setApiUser({ id: authData.user.id, email: authData.user.email })
          setAuthenticated(true)
          setApproved(true)
          return
        }
      } catch {
        // auth-check unavailable
      }

      setUser(null)
      setApiUser(null)
      setAuthenticated(false)
      setApproved(false)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSession()
  }, [fetchSession])

  const signInWithGoogle = useCallback(() => {
    authClient.signIn.social({
      provider: 'google',
      callbackURL: `${window.location.origin}/`,
    })
  }, [])

  const signOut = useCallback(async () => {
    await authClient.signOut()
    window.location.href = '/'
  }, [])

  return {
    user,
    loading,
    authenticated,
    approved,
    signInWithGoogle,
    signOut,
    refetch: fetchSession,
  }
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
