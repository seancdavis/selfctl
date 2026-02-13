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
      const { data } = await authClient.getSession()
      setUser(data?.user ?? null)

      if (data?.user?.id && data?.user?.email) {
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
      } else {
        setApiUser(null)
        setAuthenticated(false)
        setApproved(false)
      }
    } catch (error) {
      console.error('Failed to fetch session:', error)
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
