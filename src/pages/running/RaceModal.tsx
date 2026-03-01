import { useState, useEffect } from 'react'
import { useParams, useNavigate, useOutletContext } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { AutoResizeTextarea } from '@/components/ui/AutoResizeTextarea'
import { useToast } from '@/contexts/ToastContext'
import { useAsyncData } from '@/hooks/useAsyncData'
import { racesApi, runningApi } from '@/lib/api'
import { formatDuration, RACE_PRESETS } from '@/lib/running-stats'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import type { Race, RunningActivity } from '@/types'
import type { Dispatch, SetStateAction } from 'react'

interface OutletContext {
  refetch: () => Promise<void>
  races: Race[] | null
  setRaces: Dispatch<SetStateAction<Race[] | null>>
}

function parseDurationInput(input: string): number | null {
  // Accept formats: "1:23:45", "23:45", "1234" (seconds)
  const parts = input.split(':').map(Number)
  if (parts.some(isNaN)) return null
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  if (parts.length === 1) return parts[0]
  return null
}

export function RaceModal() {
  const { raceId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { refetch, races, setRaces } = useOutletContext<OutletContext>()

  const isEdit = Boolean(raceId)
  const raceIdNum = raceId ? Number(raceId) : 0
  const [loading, setLoading] = useState(isEdit)
  const [name, setName] = useState('')
  const [raceDate, setRaceDate] = useState('')
  const [distanceLabel, setDistanceLabel] = useState('')
  const [distanceMiles, setDistanceMiles] = useState('')
  const [goalTime, setGoalTime] = useState('')
  const [actualTime, setActualTime] = useState('')
  const [linkedActivityId, setLinkedActivityId] = useState<string>('')
  const [notes, setNotes] = useState('')
  const [race, setRace] = useState<Race | null>(null)
  const [saving, setSaving] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isCustomDistance, setIsCustomDistance] = useState(false)

  // Load nearby activities for linking (edit mode only, ±7 days of race date)
  const { data: nearbyActivities } = useAsyncData<RunningActivity[]>(
    () => {
      if (!isEdit || !raceDate) return Promise.resolve([])
      return runningApi.list(0).then((all) => {
        const raceDateObj = new Date(raceDate + 'T00:00:00')
        const rangeStart = new Date(raceDateObj)
        rangeStart.setDate(rangeStart.getDate() - 7)
        const rangeEnd = new Date(raceDateObj)
        rangeEnd.setDate(rangeEnd.getDate() + 7)
        return all.filter((a) => {
          const d = new Date(a.activityDate)
          return d >= rangeStart && d <= rangeEnd
        })
      })
    },
    [isEdit, raceDate],
  )

  useEffect(() => {
    if (!raceId) return

    racesApi
      .get(Number(raceId))
      .then((r) => {
        setRace(r)
        setName(r.name)
        setRaceDate(r.raceDate)
        setDistanceLabel(r.distanceLabel)
        setDistanceMiles(String(r.distanceMiles))
        setGoalTime(r.goalTimeSeconds ? formatDuration(r.goalTimeSeconds) : '')
        setActualTime(r.actualTimeSeconds ? formatDuration(r.actualTimeSeconds) : '')
        setLinkedActivityId(r.linkedActivityId ? String(r.linkedActivityId) : '')
        setNotes(r.notesMarkdown ?? '')

        const isPreset = RACE_PRESETS.some((p) => p.label === r.distanceLabel)
        setIsCustomDistance(!isPreset)
        setLoading(false)
      })
      .catch(() => {
        toast.error('failed to load race')
        navigate('/running/races')
      })
  }, [raceId, navigate, toast])

  const close = () => navigate('/running/races')

  const handlePresetChange = (label: string) => {
    if (label === 'custom') {
      setIsCustomDistance(true)
      setDistanceLabel('')
      setDistanceMiles('')
      return
    }
    setIsCustomDistance(false)
    const preset = RACE_PRESETS.find((p) => p.label === label)
    if (preset) {
      setDistanceLabel(preset.label)
      setDistanceMiles(String(preset.miles))
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !raceDate || !distanceLabel || !distanceMiles) return

    setSaving(true)
    const data: Record<string, unknown> = {
      name: name.trim(),
      raceDate,
      distanceLabel: distanceLabel.trim(),
      distanceMiles: Number(distanceMiles),
      goalTimeSeconds: goalTime ? parseDurationInput(goalTime) : null,
      notesMarkdown: notes.trim() || null,
    }

    if (isEdit) {
      data.actualTimeSeconds = actualTime ? parseDurationInput(actualTime) : null
      data.linkedActivityId = linkedActivityId ? Number(linkedActivityId) : null
    }

    try {
      if (isEdit && race) {
        const updated = await racesApi.update(race.id, data)
        setRaces((prev) => prev?.map((r) => (r.id === race.id ? updated : r)) ?? null)
        toast.success('race updated')
      } else {
        const created = await racesApi.create(data as Partial<Race>)
        setRaces((prev) => (prev ? [...prev, created] : [created]))
        toast.success('race created')
      }
      close()
      refetch()
    } catch {
      toast.error(isEdit ? 'failed to update race' : 'failed to create race')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!race) return

    const prev = races
    setRaces((current) => current?.filter((r) => r.id !== race.id) ?? null)
    close()

    try {
      await racesApi.delete(race.id)
      toast.success('race deleted')
    } catch {
      setRaces(prev)
      toast.error('failed to delete race')
    }
  }

  const currentPreset = RACE_PRESETS.find((p) => p.label === distanceLabel)

  return (
    <Modal isOpen onClose={close} title={isEdit ? 'edit race' : 'new race'}>
      {loading ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      ) : (
        <>
          <form onSubmit={handleSave} className="space-y-3">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="race name"
              className="w-full px-3 py-2 border border-zinc-700 bg-zinc-900 rounded text-sm font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50"
              autoFocus
            />

            <input
              type="date"
              value={raceDate}
              onChange={(e) => setRaceDate(e.target.value)}
              className="w-full px-3 py-2 border border-zinc-700 bg-zinc-900 rounded text-sm font-mono text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50"
            />

            <div>
              <label className="block text-[10px] font-mono font-medium text-zinc-600 uppercase tracking-widest mb-1.5">
                distance
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {RACE_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => handlePresetChange(preset.label)}
                    className={`px-2.5 py-1 text-xs font-mono rounded border transition-colors ${
                      !isCustomDistance && distanceLabel === preset.label
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'text-zinc-500 border-zinc-700 hover:text-zinc-300 hover:border-zinc-600'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => handlePresetChange('custom')}
                  className={`px-2.5 py-1 text-xs font-mono rounded border transition-colors ${
                    isCustomDistance
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'text-zinc-500 border-zinc-700 hover:text-zinc-300 hover:border-zinc-600'
                  }`}
                >
                  custom
                </button>
              </div>
              {isCustomDistance && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={distanceLabel}
                    onChange={(e) => setDistanceLabel(e.target.value)}
                    placeholder="label (e.g. 8K)"
                    className="flex-1 px-3 py-2 border border-zinc-700 bg-zinc-900 rounded text-sm font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50"
                  />
                  <input
                    type="number"
                    step="0.01"
                    value={distanceMiles}
                    onChange={(e) => setDistanceMiles(e.target.value)}
                    placeholder="miles"
                    className="w-28 px-3 py-2 border border-zinc-700 bg-zinc-900 rounded text-sm font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-[10px] font-mono font-medium text-zinc-600 uppercase tracking-widest mb-1.5">
                  goal time
                </label>
                <input
                  type="text"
                  value={goalTime}
                  onChange={(e) => setGoalTime(e.target.value)}
                  placeholder="H:MM:SS or MM:SS"
                  className="w-full px-3 py-2 border border-zinc-700 bg-zinc-900 rounded text-sm font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50"
                />
              </div>
              {isEdit && (
                <div className="flex-1">
                  <label className="block text-[10px] font-mono font-medium text-zinc-600 uppercase tracking-widest mb-1.5">
                    actual time
                  </label>
                  <input
                    type="text"
                    value={actualTime}
                    onChange={(e) => setActualTime(e.target.value)}
                    placeholder="H:MM:SS or MM:SS"
                    className="w-full px-3 py-2 border border-zinc-700 bg-zinc-900 rounded text-sm font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50"
                  />
                </div>
              )}
            </div>

            {isEdit && nearbyActivities && nearbyActivities.length > 0 && (
              <div>
                <label className="block text-[10px] font-mono font-medium text-zinc-600 uppercase tracking-widest mb-1.5">
                  link strava activity
                </label>
                <select
                  value={linkedActivityId}
                  onChange={(e) => setLinkedActivityId(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-700 bg-zinc-900 rounded text-sm font-mono text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50"
                >
                  <option value="">no linked activity</option>
                  {nearbyActivities.map((a) => (
                    <option key={a.id} value={a.id}>
                      {new Date(a.activityDate).toLocaleDateString()} — {a.name} (
                      {a.distanceMiles.toFixed(2)} mi)
                    </option>
                  ))}
                </select>
              </div>
            )}

            <AutoResizeTextarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="notes (markdown, optional)"
              minRows={3}
              className="w-full px-3 py-2 border border-zinc-700 bg-zinc-900 rounded text-sm font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50"
            />

            <div className="flex items-center justify-between pt-2">
              <div>
                {isEdit && race && (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono text-zinc-400 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> delete
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={close}
                  className="px-3 py-1.5 text-xs font-mono text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  cancel
                </button>
                <button
                  type="submit"
                  disabled={!name.trim() || !raceDate || !distanceLabel || !distanceMiles || saving}
                  className="px-4 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono font-medium rounded hover:bg-emerald-500/20 disabled:opacity-40 transition-colors"
                >
                  {saving ? 'saving...' : isEdit ? 'update' : 'create'}
                </button>
              </div>
            </div>
          </form>

          {showDeleteConfirm && (
            <div className="mt-4 border-t border-zinc-800 pt-4">
              <p className="text-sm font-mono text-zinc-400">
                are you sure? this action cannot be undone.
              </p>
              <div className="flex justify-end gap-2 mt-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-3 py-1.5 text-xs font-mono text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-1.5 bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-mono font-medium rounded hover:bg-red-500/20 transition-colors"
                >
                  confirm delete
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </Modal>
  )
}
