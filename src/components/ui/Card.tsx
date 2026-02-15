import type { ReactNode } from 'react'

interface CardProps {
  className?: string
  children: ReactNode
}

export function Card({ className = '', children }: CardProps) {
  return (
    <div className={`bg-zinc-900 border border-zinc-800 rounded-lg ${className}`}>
      {children}
    </div>
  )
}
