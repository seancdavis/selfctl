import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import type { ReactNode } from 'react'

type ToastType = 'success' | 'error' | 'loading'

interface Toast {
  id: number
  message: string
  type: ToastType
}

interface ToastContextValue {
  success: (message: string) => void
  error: (message: string) => void
  loading: (message: string) => number
  dismiss: (id: number) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

let nextId = 0

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  const [visible, setVisible] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
    if (toast.type !== 'loading') {
      timerRef.current = setTimeout(() => {
        setVisible(false)
        setTimeout(() => onDismiss(toast.id), 200)
      }, 3000)
    }
    return () => clearTimeout(timerRef.current)
  }, [toast.id, toast.type, onDismiss])

  const handleClick = () => {
    if (toast.type === 'loading') return
    clearTimeout(timerRef.current)
    setVisible(false)
    setTimeout(() => onDismiss(toast.id), 200)
  }

  const accent =
    toast.type === 'success' ? 'border-emerald-500/30' :
    toast.type === 'error' ? 'border-red-500/30' :
    'border-zinc-700'

  return (
    <div
      onClick={handleClick}
      className={`
        px-4 py-2.5 rounded border bg-zinc-900 shadow-lg
        font-mono text-xs transition-all duration-200 flex items-center gap-2
        ${toast.type !== 'loading' ? 'cursor-pointer' : ''}
        ${accent} ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
      `}
    >
      {toast.type === 'success' && <span className="text-emerald-400">✓</span>}
      {toast.type === 'error' && <span className="text-red-400">✗</span>}
      {toast.type === 'loading' && <LoadingSpinner size="sm" />}
      <span className="text-zinc-300">{toast.message}</span>
    </div>
  )
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addToast = useCallback((message: string, type: ToastType): number => {
    const id = nextId++
    setToasts((prev) => [...prev, { id, message, type }])
    return id
  }, [])

  const contextValue: ToastContextValue = {
    success: useCallback((msg: string) => { addToast(msg, 'success') }, [addToast]),
    error: useCallback((msg: string) => { addToast(msg, 'error') }, [addToast]),
    loading: useCallback((msg: string) => addToast(msg, 'loading'), [addToast]),
    dismiss: dismissToast,
  }

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {createPortal(
        <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
          {toasts.map((toast) => (
            <ToastItem key={toast.id} toast={toast} onDismiss={dismissToast} />
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
