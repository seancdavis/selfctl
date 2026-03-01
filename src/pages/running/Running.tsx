import { useState, useMemo } from 'react'
import { usePageTitle } from '@/hooks/usePageTitle'
import { useAsyncData } from '@/hooks/useAsyncData'
import { runningApi } from '@/lib/api'
import { formatPace, formatDuration, formatDistance } from '@/lib/running-stats'
import { StatCard } from '@/components/health/StatCard'
import { MileageChart } from '@/components/running/MileageChart'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import type { RunningActivity, RunningStats as RunningStatsType } from '@/types'

const TIME_PERIODS = [
  { label: '1M', days: 30 },
  { label: '3M', days: 90 },
  { label: '6M', days: 180 },
  { label: '1Y', days: 365 },
  { label: 'All', days: 0 },
] as const

function TerminalProgressBar({ percentage }: { percentage: number }) {
  const total = 20
  const filled = Math.round((Math.min(percentage, 100) / 100) * total)
  const empty = total - filled
  return (
    <span className="font-mono text-sm tracking-tighter">
      <span className="text-zinc-600">[</span>
      <span className="text-emerald-400">{'█'.repeat(filled)}</span>
      <span className="text-zinc-700">{'░'.repeat(empty)}</span>
      <span className="text-zinc-600">]</span>
    </span>
  )
}

function getISOWeekLabel(date: Date): string {
  const d = new Date(date.valueOf())
  const dayNum = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - dayNum + 3)
  const firstThursday = d.valueOf()
  d.setMonth(0, 1)
  if (d.getDay() !== 4) {
    d.setMonth(0, 1 + ((4 - d.getDay() + 7) % 7))
  }
  const weekNum = 1 + Math.ceil((firstThursday - d.valueOf()) / 604800000)
  const year = new Date(firstThursday).getFullYear()

  // Get the Monday of this week for the label
  const monday = new Date(date.valueOf())
  monday.setDate(monday.getDate() - dayNum)
  return monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function aggregateWeeklyMiles(activities: RunningActivity[]): { label: string; miles: number }[] {
  const sorted = [...activities].sort(
    (a, b) => new Date(a.activityDate).getTime() - new Date(b.activityDate).getTime(),
  )

  const buckets = new Map<string, { label: string; miles: number }>()
  for (const a of sorted) {
    const date = new Date(a.activityDate)
    const weekLabel = getISOWeekLabel(date)
    const existing = buckets.get(weekLabel)
    if (existing) {
      existing.miles += a.distanceMiles
    } else {
      buckets.set(weekLabel, { label: weekLabel, miles: a.distanceMiles })
    }
  }

  return [...buckets.values()].map((b) => ({
    ...b,
    miles: Math.round(b.miles * 100) / 100,
  }))
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-zinc-800 rounded ${className}`} />
}

function LoadingState() {
  return (
    <div className="space-y-6">
      <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-5">
        <Skeleton className="h-3 w-32 mb-3" />
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-5 w-64" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-zinc-900 rounded-lg border border-zinc-800 p-5">
            <Skeleton className="h-3 w-24 mb-3" />
            <Skeleton className="h-7 w-20 mb-2" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-12 text-center">
      <p className="text-zinc-500 text-sm font-mono">no running data available</p>
      <p className="text-zinc-700 text-xs font-mono mt-2">
        connect Strava to sync your activities
      </p>
    </div>
  )
}

function formatActivityDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

export function Running() {
  usePageTitle('Running')
  const [selected, setSelected] = useState('3M')
  const period = TIME_PERIODS.find((p) => p.label === selected)!

  const currentYear = new Date().getFullYear()
  const { data: stats, loading: statsLoading } = useAsyncData<RunningStatsType>(
    () => runningApi.stats(currentYear),
    [currentYear],
  )

  const { data: activities, loading: activitiesLoading } = useAsyncData<RunningActivity[]>(
    () => runningApi.list(period.days),
    [period.days],
  )

  const loading = statsLoading || activitiesLoading
  const sortedActivities = activities
    ? [...activities].sort(
        (a, b) => new Date(b.activityDate).getTime() - new Date(a.activityDate).getTime(),
      )
    : []

  const weeklyData = useMemo(
    () => (activities ? aggregateWeeklyMiles(activities) : []),
    [activities],
  )

  const yearPct = stats ? Math.round((stats.yearMiles / stats.yearGoal) * 100) : 0

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-mono font-bold text-zinc-100 flex items-center gap-2">
            <span className="text-emerald-400">$</span> running::mileage
          </h1>
          <p className="text-xs font-mono text-zinc-600 mt-1">strava activity tracking</p>
        </div>
        <div className="flex items-center gap-0.5 bg-zinc-900 border border-zinc-800 rounded p-0.5">
          {TIME_PERIODS.map((p) => (
            <button
              key={p.label}
              onClick={() => setSelected(p.label)}
              className={`px-3 py-1.5 text-xs font-mono font-medium rounded transition-colors ${
                selected === p.label
                  ? 'bg-zinc-800 text-emerald-400 border border-zinc-700'
                  : 'text-zinc-600 hover:text-zinc-400 border border-transparent'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {loading ? (
          <LoadingState />
        ) : !activities || activities.length === 0 ? (
          <>
            {stats && (
              <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-5">
                <h3 className="text-[11px] font-mono font-medium text-zinc-500 uppercase tracking-widest mb-3">
                  {currentYear} goal
                </h3>
                <div className="flex items-end gap-3 mb-2">
                  <span className="text-3xl font-mono font-bold text-zinc-100">
                    {stats.yearMiles.toFixed(1)}
                  </span>
                  <span className="text-sm font-mono text-zinc-600 pb-0.5">
                    / {stats.yearGoal} mi
                  </span>
                  <span className="text-sm font-mono text-emerald-400 pb-0.5">{yearPct}%</span>
                </div>
                <TerminalProgressBar percentage={yearPct} />
              </div>
            )}
            <EmptyState />
          </>
        ) : (
          <>
            {stats && (
              <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-5">
                <h3 className="text-[11px] font-mono font-medium text-zinc-500 uppercase tracking-widest mb-3">
                  {currentYear} goal
                </h3>
                <div className="flex items-end gap-3 mb-2">
                  <span className="text-3xl font-mono font-bold text-zinc-100">
                    {stats.yearMiles.toFixed(1)}
                  </span>
                  <span className="text-sm font-mono text-zinc-600 pb-0.5">
                    / {stats.yearGoal} mi
                  </span>
                  <span className="text-sm font-mono text-emerald-400 pb-0.5">{yearPct}%</span>
                </div>
                <TerminalProgressBar percentage={yearPct} />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard
                label="Total Miles"
                value={formatDistance(stats?.totalMiles ?? 0).replace(' mi', '')}
                unit="mi"
              />
              <StatCard
                label="Total Runs"
                value={stats?.totalRuns ?? 0}
              />
              <StatCard
                label="Avg Pace"
                value={formatPace(stats?.avgPace ?? 0)}
                unit="/mi"
              />
              <StatCard
                label="Longest Run"
                value={formatDistance(stats?.longestRun ?? 0).replace(' mi', '')}
                unit="mi"
              />
            </div>

            {weeklyData.length > 0 && <MileageChart data={weeklyData} />}

            <div className="bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden">
              <div className="px-5 py-4 border-b border-zinc-800">
                <h3 className="text-[11px] font-mono font-medium text-zinc-500 uppercase tracking-widest">
                  activities
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-800">
                      <th className="text-left text-[10px] font-mono font-medium text-zinc-600 uppercase tracking-widest px-5 py-3">
                        Date
                      </th>
                      <th className="text-left text-[10px] font-mono font-medium text-zinc-600 uppercase tracking-widest px-5 py-3">
                        Name
                      </th>
                      <th className="text-right text-[10px] font-mono font-medium text-zinc-600 uppercase tracking-widest px-5 py-3">
                        Distance
                      </th>
                      <th className="text-right text-[10px] font-mono font-medium text-zinc-600 uppercase tracking-widest px-5 py-3">
                        Duration
                      </th>
                      <th className="text-right text-[10px] font-mono font-medium text-zinc-600 uppercase tracking-widest px-5 py-3">
                        Pace
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedActivities.map((a) => (
                      <tr
                        key={a.id}
                        className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors"
                      >
                        <td className="px-5 py-2.5 text-sm font-mono text-zinc-400">
                          {formatActivityDate(a.activityDate)}
                        </td>
                        <td className="px-5 py-2.5 text-sm font-mono text-zinc-200">
                          {a.name}
                        </td>
                        <td className="px-5 py-2.5 text-sm font-mono text-zinc-200 text-right">
                          {formatDistance(a.distanceMiles)}
                        </td>
                        <td className="px-5 py-2.5 text-sm font-mono text-zinc-400 text-right">
                          {formatDuration(a.movingTimeSeconds)}
                        </td>
                        <td className="px-5 py-2.5 text-sm font-mono text-zinc-400 text-right">
                          {formatPace(a.paceSecondsPerMile)}/mi
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
