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
      return 'bg-orange-100 text-orange-800 border-orange-300'
    case 'green':
      return 'bg-green-100 text-green-800 border-green-300'
    case 'yellow':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300'
    case 'red':
      return 'bg-red-100 text-red-800 border-red-300'
  }
}

export function getScoreTextColor(level: ScoreLevel): string {
  switch (level) {
    case 'fire':
      return 'text-orange-600'
    case 'green':
      return 'text-green-600'
    case 'yellow':
      return 'text-yellow-600'
    case 'red':
      return 'text-red-600'
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
  if (count === 1) return 'border-l-yellow-400'
  if (count === 2) return 'border-l-orange-400'
  if (count >= 3) return 'border-l-red-400'
  return ''
}
