import type { ScoreLevel } from '@/types'

export function calculatePercentage(completed: number, total: number): number {
  if (total === 0) return 0
  return Math.round((completed / total) * 100)
}

export function getScoreLevel(percentage: number): ScoreLevel {
  if (percentage >= 100) return 'fire'
  if (percentage >= 75) return 'green'
  if (percentage >= 50) return 'yellow'
  return 'red'
}

export function getScoreClasses(level: ScoreLevel): string {
  switch (level) {
    case 'fire':
      return 'bg-orange-500/10 text-orange-400 border-orange-500/20'
    case 'green':
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    case 'yellow':
      return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
    case 'red':
      return 'bg-red-500/10 text-red-400 border-red-500/20'
  }
}

export function getScoreTextColor(level: ScoreLevel): string {
  switch (level) {
    case 'fire':
      return 'text-orange-400'
    case 'green':
      return 'text-emerald-400'
    case 'yellow':
      return 'text-amber-400'
    case 'red':
      return 'text-red-400'
  }
}

export function getStalenessDescription(count: number): string {
  if (count === 0) return 'New'
  if (count === 1) return 'Carried over once'
  if (count === 2) return 'Carried over twice'
  if (count === 3) return 'Carried over 3 times'
  return `Carried over ${count} times`
}

export function getStalenessClasses(count: number): string {
  if (count === 0) return ''
  if (count === 1) return 'border-l-amber-400'
  if (count === 2) return 'border-l-orange-400'
  if (count >= 3) return 'border-l-red-400'
  return ''
}
