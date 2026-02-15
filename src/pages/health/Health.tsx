import { useState, useMemo } from 'react'
import { usePageTitle } from '@/hooks/usePageTitle'
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
  return <div className={`animate-pulse bg-zinc-800 rounded ${className}`} />
}

function LoadingState() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-zinc-900 rounded-lg border border-zinc-800 p-5">
            <Skeleton className="h-3 w-24 mb-3" />
            <Skeleton className="h-7 w-20 mb-2" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
      <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-5">
        <Skeleton className="h-3 w-28 mb-4" />
        <Skeleton className="h-80 w-full" />
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-12 text-center">
      <p className="text-zinc-500 text-sm font-mono">no weight data available</p>
      <p className="text-zinc-700 text-xs font-mono mt-2">
        sync data from Health Auto Export to populate
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
    <div className="bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-800">
        <h3 className="text-[11px] font-mono font-medium text-zinc-500 uppercase tracking-widest">
          {isAggregated ? `${periodWord}ly Averages` : 'Entries'}
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="text-left text-[10px] font-mono font-medium text-zinc-600 uppercase tracking-widest px-5 py-3">
                {isAggregated ? periodWord : 'Date'}
              </th>
              <th className="text-right text-[10px] font-mono font-medium text-zinc-600 uppercase tracking-widest px-5 py-3">
                {isAggregated ? 'Avg Weight' : 'Weight'}
              </th>
              <th className="text-right text-[10px] font-mono font-medium text-zinc-600 uppercase tracking-widest px-5 py-3">
                {isAggregated ? 'Avg Body Fat' : 'Body Fat'}
              </th>
              <th className="text-right text-[10px] font-mono font-medium text-zinc-600 uppercase tracking-widest px-5 py-3">
                {isAggregated ? 'Avg BMI' : 'BMI'}
              </th>
              {isAggregated && (
                <th className="text-right text-[10px] font-mono font-medium text-zinc-600 uppercase tracking-widest px-5 py-3">
                  Entries
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {reversed.map((entry, i) => (
              <tr key={i} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                <td className="px-5 py-2.5 text-sm font-mono text-zinc-300">
                  {entry.label}
                </td>
                <td className="px-5 py-2.5 text-sm font-mono text-zinc-200 text-right">
                  {entry.weight} lbs
                </td>
                <td className="px-5 py-2.5 text-sm font-mono text-zinc-400 text-right">
                  {entry.bodyFatPercentage != null ? `${entry.bodyFatPercentage}%` : '--'}
                </td>
                <td className="px-5 py-2.5 text-sm font-mono text-zinc-400 text-right">
                  {entry.bmi != null ? entry.bmi : '--'}
                </td>
                {isAggregated && (
                  <td className="px-5 py-2.5 text-sm font-mono text-zinc-600 text-right">
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
  usePageTitle('Vitals')
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
          <h1 className="text-xl font-mono font-bold text-zinc-100 flex items-center gap-2">
            <span className="text-emerald-400">$</span> vitals::weight
          </h1>
          <p className="text-xs font-mono text-zinc-600 mt-1">weight and body composition tracking</p>
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

      {error && (
        <div className="mt-6 bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400 text-sm font-mono">
          {error}
        </div>
      )}

      <div className="mt-6 space-y-3">
        {loading ? (
          <LoadingState />
        ) : sortedData.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
