export function getCurrentWeekId(): string {
  return getWeekId(new Date())
}

export function getWeekId(date: Date): string {
  const year = date.getFullYear()
  const week = getWeekNumber(date)
  return `${year}-${String(week).padStart(2, '0')}`
}

export function getWeekNumber(date: Date): number {
  const target = new Date(date.valueOf())
  const dayNum = (date.getDay() + 6) % 7
  target.setDate(target.getDate() - dayNum + 3)
  const firstThursday = target.valueOf()
  target.setMonth(0, 1)
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7)
  }
  return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000)
}

export function getNextWeekId(weekId: string): string {
  const { year, week } = parseWeekId(weekId)
  const weeksInYear = getWeeksInYear(year)
  if (week >= weeksInYear) {
    return `${year + 1}-01`
  }
  return `${year}-${String(week + 1).padStart(2, '0')}`
}

export function getPreviousWeekId(weekId: string): string {
  const { year, week } = parseWeekId(weekId)
  if (week <= 1) {
    const prevYearWeeks = getWeeksInYear(year - 1)
    return `${year - 1}-${String(prevYearWeeks).padStart(2, '0')}`
  }
  return `${year}-${String(week - 1).padStart(2, '0')}`
}

export function getWeeksInYear(year: number): number {
  const dec31 = new Date(year, 11, 31)
  const weekNum = getWeekNumber(dec31)
  return weekNum === 1 ? getWeekNumber(new Date(year, 11, 24)) : weekNum
}

export function getWeekStartDate(weekId: string): string {
  const { year, week } = parseWeekId(weekId)
  const jan4 = new Date(year, 0, 4)
  const jan4DayOfWeek = jan4.getDay() || 7
  const firstMonday = new Date(jan4)
  firstMonday.setDate(jan4.getDate() - jan4DayOfWeek + 1)
  const targetDate = new Date(firstMonday)
  targetDate.setDate(firstMonday.getDate() + (week - 1) * 7)
  return targetDate.toISOString().split('T')[0]
}

export function getWeekEndDate(weekId: string): string {
  const startDate = new Date(getWeekStartDate(weekId))
  const endDate = new Date(startDate)
  endDate.setDate(startDate.getDate() + 6)
  return endDate.toISOString().split('T')[0]
}

export function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export function formatWeekRange(startDate: string, endDate: string): string {
  const start = new Date(startDate + 'T00:00:00')
  const end = new Date(endDate + 'T00:00:00')
  const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  return `${startStr} - ${endStr}`
}

export function parseWeekId(weekId: string): { year: number; week: number } {
  const [year, week] = weekId.split('-').map(Number)
  return { year, week }
}

export function isValidWeekId(weekId: string): boolean {
  const match = weekId.match(/^(\d{4})-(\d{2})$/)
  if (!match) return false
  const year = parseInt(match[1])
  const week = parseInt(match[2])
  return week >= 1 && week <= getWeeksInYear(year)
}

export function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr + 'T00:00:00')
  date.setDate(date.getDate() + days)
  return date.toISOString().split('T')[0]
}

export function suggestNextWeekDates(mostRecentWeek?: { label: string; endDate: string }): {
  label: string
  startDate: string
  endDate: string
} {
  if (mostRecentWeek) {
    const suggestedLabel = getNextWeekId(mostRecentWeek.label)
    const suggestedStart = addDays(mostRecentWeek.endDate, 1)
    const suggestedEnd = addDays(suggestedStart, 6)
    return { label: suggestedLabel, startDate: suggestedStart, endDate: suggestedEnd }
  }
  const label = getCurrentWeekId()
  const startDate = getWeekStartDate(label)
  const endDate = getWeekEndDate(label)
  return { label, startDate, endDate }
}
