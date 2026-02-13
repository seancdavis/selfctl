import type { WeightEntry, HealthStats } from '@/types'

export function getWeightStats(data: WeightEntry[]): HealthStats {
  if (data.length === 0) {
    return { current: 0, average: 0, min: 0, max: 0, change: 0 }
  }

  const weights = data.map((d) => d.weight)
  const current = weights[weights.length - 1]
  const first = weights[0]
  const sum = weights.reduce((acc, w) => acc + w, 0)
  const average = Math.round((sum / weights.length) * 10) / 10
  const min = Math.min(...weights)
  const max = Math.max(...weights)
  const change = Math.round((current - first) * 10) / 10

  return { current, average, min, max, change }
}
