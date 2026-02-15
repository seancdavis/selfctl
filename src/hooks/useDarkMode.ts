import { useEffect } from 'react'

export function useDarkMode() {
  useEffect(() => {
    document.documentElement.classList.add('dark')
  }, [])

  return { theme: 'dark' as const }
}
