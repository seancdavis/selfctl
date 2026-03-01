import { Link, Outlet, useNavigate } from 'react-router-dom'
import { usePageTitle } from '@/hooks/usePageTitle'
import { Plus } from 'lucide-react'
import { useAsyncData } from '@/hooks/useAsyncData'
import { racesApi } from '@/lib/api'
import { formatDuration, getRaceStatus, daysUntil } from '@/lib/running-stats'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import type { Race } from '@/types'

function formatRaceDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function Races() {
  usePageTitle('Races')
  const navigate = useNavigate()
  const { data: races, loading, error, refetch, setData: setRaces } = useAsyncData<Race[]>(
    () => racesApi.list(),
    [],
  )

  const upcoming = races?.filter((r) => getRaceStatus(r.raceDate) !== 'past') ?? []
  const past = races?.filter((r) => getRaceStatus(r.raceDate) === 'past') ?? []

  // Sort upcoming by nearest first
  const sortedUpcoming = [...upcoming].sort(
    (a, b) => new Date(a.raceDate).getTime() - new Date(b.raceDate).getTime(),
  )
  // Past already sorted desc from API

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-mono font-bold text-zinc-100 flex items-center gap-2">
            <span className="text-amber-400">$</span> running::races
          </h1>
          <p className="text-xs font-mono text-zinc-600 mt-1">race schedule and results</p>
        </div>
        <Link
          to="/running/races/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono font-medium rounded hover:bg-emerald-500/20 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          add race
        </Link>
      </div>

      <div className="mt-6">
        {loading && (
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400 text-sm font-mono">
            {error}
          </div>
        )}

        {!loading && !error && (!races || races.length === 0) && (
          <div className="text-center py-12 text-zinc-600 font-mono text-sm">
            <p>no races scheduled</p>
          </div>
        )}

        {!loading && races && races.length > 0 && (
          <div className="space-y-6">
            {sortedUpcoming.length > 0 && (
              <div>
                <h2 className="text-[11px] font-mono font-medium text-zinc-500 uppercase tracking-widest mb-3">
                  upcoming
                </h2>
                <div className="bg-zinc-900 rounded-lg border border-zinc-800 divide-y divide-zinc-800">
                  {sortedUpcoming.map((race) => {
                    const days = daysUntil(race.raceDate)
                    const status = getRaceStatus(race.raceDate)
                    return (
                      <div
                        key={race.id}
                        onClick={() => navigate(`/running/races/${race.id}`)}
                        className="flex items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-mono text-zinc-200">{race.name}</span>
                          <span className="text-[10px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded">
                            {race.distanceLabel}
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
                          {race.goalTimeSeconds && (
                            <span className="text-xs font-mono text-zinc-600">
                              goal: {formatDuration(race.goalTimeSeconds)}
                            </span>
                          )}
                          <span className="text-xs font-mono text-zinc-500">
                            {formatRaceDate(race.raceDate)}
                          </span>
                          <span className="text-[10px] font-mono text-emerald-400">
                            {status === 'today' ? 'today!' : `in ${days}d`}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {past.length > 0 && (
              <div>
                <h2 className="text-[11px] font-mono font-medium text-zinc-500 uppercase tracking-widest mb-3">
                  past races
                </h2>
                <div className="bg-zinc-900 rounded-lg border border-zinc-800 divide-y divide-zinc-800">
                  {past.map((race) => (
                    <div
                      key={race.id}
                      onClick={() => navigate(`/running/races/${race.id}`)}
                      className="flex items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-mono text-zinc-200">{race.name}</span>
                        <span className="text-[10px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded">
                          {race.distanceLabel}
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        {race.actualTimeSeconds ? (
                          <span className="text-xs font-mono text-emerald-400">
                            {formatDuration(race.actualTimeSeconds)}
                          </span>
                        ) : (
                          <span className="text-xs font-mono text-zinc-700">no result</span>
                        )}
                        <span className="text-xs font-mono text-zinc-500">
                          {formatRaceDate(race.raceDate)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <Outlet context={{ refetch, races, setRaces }} />
    </div>
  )
}
