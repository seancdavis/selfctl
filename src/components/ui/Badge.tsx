import type { ReactNode } from 'react'

type Variant = 'default' | 'secondary' | 'outline' | 'warning' | 'success'

interface BadgeProps {
  variant?: Variant
  className?: string
  children: ReactNode
}

const variantClasses: Record<Variant, string> = {
  default: 'bg-zinc-800 text-zinc-400 border border-zinc-700',
  secondary: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  outline: 'border border-zinc-700 text-zinc-400 bg-transparent',
  warning: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  success: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
}

export function Badge({ variant = 'default', className = '', children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-[11px] font-mono font-medium ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  )
}
