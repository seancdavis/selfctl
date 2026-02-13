import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from 'react'
import { api } from '@/lib/api'
import type { Category } from '@/types'

interface CategoriesContextValue {
  data: Category[] | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

const CategoriesContext = createContext<CategoriesContextValue | null>(null)

export function CategoriesProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Category[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)

  const fetchCategories = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const categories = await api.get<Category[]>('/goals-categories')
      if (mountedRef.current) {
        setData(categories)
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to load categories')
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    fetchCategories()
    return () => {
      mountedRef.current = false
    }
  }, [fetchCategories])

  return (
    <CategoriesContext.Provider value={{ data, loading, error, refetch: fetchCategories }}>
      {children}
    </CategoriesContext.Provider>
  )
}

export function useCategories(): CategoriesContextValue {
  const context = useContext(CategoriesContext)
  if (!context) {
    throw new Error('useCategories must be used within a CategoriesProvider')
  }
  return context
}
