import { useAsyncData } from '@/hooks/useAsyncData'
import { healthApi } from '@/lib/api'
import { getWeightStats } from '@/lib/health-stats'
import { StatCard } from '@/components/health/StatCard'
import { WeightChart } from '@/components/health/WeightChart'
import type { WeightEntry } from '@/types'

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
}

function formatEntryDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
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

function RecentEntriesTable({ entries }: { entries: WeightEntry[] }) {
  const recent = [...entries].reverse().slice(0, 10)

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
          Recent Entries
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                Date
              </th>
              <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                Weight
              </th>
              <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                Body Fat
              </th>
              <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                BMI
              </th>
            </tr>
          </thead>
          <tbody>
            {recent.map((entry) => (
              <tr key={entry.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-6 py-3 text-sm text-gray-900">
                  {formatEntryDate(entry.recordedAt)}
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function Health() {
  const { data, loading, error } = useAsyncData(
    () => healthApi.getWeightEntries(90),
    []
  )

  const sortedData = data
    ? [...data].sort(
        (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
      )
    : []

  const stats = getWeightStats(sortedData)

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Health</h1>
      <p className="text-gray-500 mt-1">Weight and body composition tracking.</p>

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

            <WeightChart data={sortedData} />

            <RecentEntriesTable entries={sortedData} />
          </>
        )}
      </div>
    </div>
  )
}
