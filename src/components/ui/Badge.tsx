import type { ReactNode } from 'react'

type Variant = 'default' | 'secondary' | 'outline' | 'warning' | 'success'

interface BadgeProps {
  variant?: Variant
  className?: string
  children: ReactNode
}

const variantClasses: Record<Variant, string> = {
  default: 'bg-gray-100 text-gray-700',
  secondary: 'bg-blue-100 text-blue-700',
  outline: 'border border-gray-300 text-gray-700 bg-transparent',
  warning: 'bg-yellow-100 text-yellow-800',
  success: 'bg-green-100 text-green-700',
}

export function Badge({ variant = 'default', className = '', children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  )
}
