import { useState, useMemo } from 'react'
import { useAsyncData } from '@/hooks/useAsyncData'
import { healthApi } from '@/lib/api'
import { getWeightStats } from '@/lib/health-stats'
import { StatCard } from '@/components/health/StatCard'
import { WeightChart } from '@/components/health/WeightChart'
import type { WeightEntry } from '@/types'

type Aggregation = 'daily' | 'weekly' | 'monthly'

const TIME_PERIODS = [
  { label: '1M', days: 30, aggregation: 'daily' as Aggregation },
  { label: '3M', days: 90, aggregation: 'weekly' as Aggregation },
  { label: '6M', days: 180, aggregation: 'weekly' as Aggregation },
  { label: '1Y', days: 365, aggregation: 'monthly' as Aggregation },
  { label: 'All', days: 0, aggregation: 'monthly' as Aggregation },
] as const

interface AggregatedEntry {
  label: string
  weight: number
  bodyFatPercentage: number | null
  bmi: number | null
  count: number
}

function getISOWeek(date: Date): string {
  const d = new Date(date.valueOf())
  const dayNum = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - dayNum + 3)
  const firstThursday = d.valueOf()
  d.setMonth(0, 1)
  if (d.getDay() !== 4) {
    d.setMonth(0, 1 + ((4 - d.getDay()) + 7) % 7)
  }
  const weekNum = 1 + Math.ceil((firstThursday - d.valueOf()) / 604800000)
  const year = new Date(firstThursday).getFullYear()
  return `${year}-W${String(weekNum).padStart(2, '0')}`
}

function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function formatWeekLabel(weekKey: string): string {
  const [yearStr, weekStr] = weekKey.split('-W')
  const year = parseInt(yearStr)
  const week = parseInt(weekStr)
  const jan4 = new Date(year, 0, 4)
  const jan4Day = jan4.getDay() || 7
  const monday = new Date(jan4)
  monday.setDate(jan4.getDate() - jan4Day + 1 + (week - 1) * 7)
  return monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-')
  const date = new Date(parseInt(year), parseInt(month) - 1, 1)
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

function avg(nums: number[]): number {
  return Math.round((nums.reduce((s, n) => s + n, 0) / nums.length) * 10) / 10
}

function aggregateEntries(
  entries: WeightEntry[],
  aggregation: Aggregation,
): AggregatedEntry[] {
  if (aggregation === 'daily') {
    return entries.map((e) => ({
      label: new Date(e.recordedAt).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      }),
      weight: e.weight,
      bodyFatPercentage: e.bodyFatPercentage ?? null,
      bmi: e.bmi ?? null,
      count: 1,
    }))
  }

  const bucketKey = aggregation === 'weekly' ? getISOWeek : getMonthKey
  const formatLabel = aggregation === 'weekly' ? formatWeekLabel : formatMonthLabel

  const buckets = new Map<string, WeightEntry[]>()
  for (const entry of entries) {
    const key = bucketKey(new Date(entry.recordedAt))
    const bucket = buckets.get(key) || []
    bucket.push(entry)
    buckets.set(key, bucket)
  }

  const keys = [...buckets.keys()].sort()
  return keys.map((key) => {
    const bucket = buckets.get(key)!
    const weights = bucket.map((e) => e.weight)
    const bodyFats = bucket.filter((e) => e.bodyFatPercentage != null).map((e) => e.bodyFatPercentage!)
    const bmis = bucket.filter((e) => e.bmi != null).map((e) => e.bmi!)

    return {
      label: formatLabel(key),
      weight: avg(weights),
      bodyFatPercentage: bodyFats.length > 0 ? avg(bodyFats) : null,
      bmi: bmis.length > 0 ? avg(bmis) : null,
      count: bucket.length,
    }
  })
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
}

function LoadingState() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 p-6">
            <Skeleton className="h-4 w-24 mb-3" />
            <Skeleton className="h-8 w-20 mb-2" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <Skeleton className="h-4 w-28 mb-4" />
        <Skeleton className="h-80 w-full" />
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
      <p className="text-gray-500 text-lg">No weight data yet.</p>
      <p className="text-gray-400 text-sm mt-2">
        Sync your data from Health Auto Export to see your weight trends here.
      </p>
    </div>
  )
}

function EntriesTable({
  entries,
  aggregation,
}: {
  entries: AggregatedEntry[]
  aggregation: Aggregation
}) {
  const reversed = [...entries].reverse()
  const isAggregated = aggregation !== 'daily'
  const periodWord = aggregation === 'weekly' ? 'Week' : 'Month'

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
          {isAggregated ? `${periodWord}ly Averages` : 'Entries'}
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                {isAggregated ? periodWord : 'Date'}
              </th>
              <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                {isAggregated ? 'Avg Weight' : 'Weight'}
              </th>
              <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                {isAggregated ? 'Avg Body Fat' : 'Body Fat'}
              </th>
              <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                {isAggregated ? 'Avg BMI' : 'BMI'}
              </th>
              {isAggregated && (
                <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                  Entries
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {reversed.map((entry, i) => (
              <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-6 py-3 text-sm text-gray-900">
                  {entry.label}
                </td>
                <td className="px-6 py-3 text-sm text-gray-900 text-right">
                  {entry.weight} lbs
                </td>
                <td className="px-6 py-3 text-sm text-gray-900 text-right">
                  {entry.bodyFatPercentage != null ? `${entry.bodyFatPercentage}%` : '--'}
                </td>
                <td className="px-6 py-3 text-sm text-gray-900 text-right">
                  {entry.bmi != null ? entry.bmi : '--'}
                </td>
                {isAggregated && (
                  <td className="px-6 py-3 text-sm text-gray-400 text-right">
                    {entry.count}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function Health() {
  const [selected, setSelected] = useState('1M')
  const period = TIME_PERIODS.find((p) => p.label === selected)!

  const { data, loading, error } = useAsyncData(
    () => healthApi.getWeightEntries(period.days),
    [period.days]
  )

  const sortedData = useMemo(
    () =>
      data
        ? [...data].sort(
            (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
          )
        : [],
    [data]
  )

  const aggregated = useMemo(
    () => aggregateEntries(sortedData, period.aggregation),
    [sortedData, period.aggregation]
  )

  const stats = getWeightStats(sortedData)

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Weight & Body</h1>
          <p className="text-gray-500 mt-1">Weight and body composition tracking.</p>
        </div>
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          {TIME_PERIODS.map((p) => (
            <button
              key={p.label}
              onClick={() => setSelected(p.label)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                selected === p.label
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="mt-6 space-y-6">
        {loading ? (
          <LoadingState />
        ) : sortedData.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label="Current Weight"
                value={stats.current}
                unit="lbs"
                change={stats.change}
                changeLabel="from start"
              />
              <StatCard label="Average" value={stats.average} unit="lbs" />
              <StatCard label="Lowest" value={stats.min} unit="lbs" />
              <StatCard label="Highest" value={stats.max} unit="lbs" />
            </div>

            <WeightChart data={aggregated} />

            <EntriesTable entries={aggregated} aggregation={period.aggregation} />
          </>
        )}
      </div>
    </div>
  )
}
