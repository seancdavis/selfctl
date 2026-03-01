export function formatPace(secondsPerMile: number): string {
  if (secondsPerMile === 0) return '--'
  const minutes = Math.floor(secondsPerMile / 60)
  const seconds = secondsPerMile % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

export function formatDuration(totalSeconds: number): string {
  if (totalSeconds === 0) return '--'
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

export function formatDistance(miles: number): string {
  return `${miles.toFixed(2)} mi`
}

export function getRaceStatus(raceDate: string): 'upcoming' | 'today' | 'past' {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const race = new Date(raceDate + 'T00:00:00')
  if (race.getTime() === today.getTime()) return 'today'
  if (race > today) return 'upcoming'
  return 'past'
}

export function daysUntil(dateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr + 'T00:00:00')
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

export const RACE_PRESETS = [
  { label: '5K', miles: 3.11 },
  { label: '10K', miles: 6.21 },
  { label: '15K', miles: 9.32 },
  { label: 'Half Marathon', miles: 13.11 },
  { label: 'Marathon', miles: 26.22 },
  { label: '50K', miles: 31.07 },
] as const
