import { useState, useMemo, useCallback } from 'react'
import { usePageTitle } from '@/hooks/usePageTitle'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronDown, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAsyncData } from '@/hooks/useAsyncData'
import { weeksApi, weekGenerationApi } from '@/lib/api'
import { suggestNextWeekDates } from '@/lib/dates'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import type {
  Week,
  WeekGenerationData,
  WizardRecurringTask,
  WizardIncompleteTask,
  WizardFollowUp,
  WizardBacklogItem,
} from '@/types'

interface SectionProps<T extends { id: number; title: string; selected: boolean }> {
  title: string
  items: T[]
  selectedIds: Set<number>
  onToggle: (id: number) => void
  onToggleAll: () => void
  getCategoryName?: (item: T) => string | null
}

function WizardSection<T extends { id: number; title: string; selected: boolean }>({
  title,
  items,
  selectedIds,
  onToggle,
  onToggleAll,
  getCategoryName,
}: SectionProps<T>) {
  const [collapsed, setCollapsed] = useState(false)
  const selectedCount = items.filter((i) => selectedIds.has(i.id)).length

  if (items.length === 0) return null

  return (
    <div className="bg-zinc-900 rounded-lg border border-zinc-800">
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-2">
          {collapsed ? (
            <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-zinc-600" />
          )}
          <h3 className="text-sm font-mono font-semibold text-zinc-200">{title}</h3>
          <span className="text-[10px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded font-medium">
            {selectedCount}/{items.length}
          </span>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onToggleAll()
          }}
          className="text-xs font-mono text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
        >
          {selectedCount === items.length ? 'deselect all' : 'select all'}
        </button>
      </button>

      {!collapsed && (
        <div className="border-t border-zinc-800 divide-y divide-zinc-800/50">
          {items.map((item) => {
            const categoryName = getCategoryName?.(item)
            return (
              <label
                key={item.id}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-800/50 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(item.id)}
                  onChange={() => onToggle(item.id)}
                  className="w-3.5 h-3.5 rounded-sm border-zinc-600 bg-zinc-900 text-emerald-500 focus:ring-emerald-500/20 focus:ring-offset-0"
                />
                <span className="flex-1 text-sm font-mono text-zinc-300">{item.title}</span>
                {categoryName && (
                  <span className="text-[10px] font-mono bg-zinc-800 text-zinc-500 border border-zinc-700 px-1.5 py-0.5 rounded">
                    {categoryName}
                  </span>
                )}
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function WeekWizard() {
  usePageTitle('New Week')
  const navigate = useNavigate()
  const [generating, setGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)

  const [selectedRecurring, setSelectedRecurring] = useState<Set<number>>(new Set())
  const [selectedIncomplete, setSelectedIncomplete] = useState<Set<number>>(new Set())
  const [selectedFollowUps, setSelectedFollowUps] = useState<Set<number>>(new Set())
  const [selectedBacklog, setSelectedBacklog] = useState<Set<number>>(new Set())

  const [weekLabel, setWeekLabel] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const { data: weeks, loading: weeksLoading } = useAsyncData<Week[]>(
    () => weeksApi.list(),
    []
  )

  const previousWeek = useMemo(() => {
    if (!weeks || weeks.length === 0) return undefined
    // API returns sorted by startDate desc, so first is most recent
    return weeks[0]
  }, [weeks])

  // Initialize label/date fields from suggestion once weeks load
  const suggestionsInitialized = useState(false)
  if (weeks && !suggestionsInitialized[0]) {
    const suggestion = suggestNextWeekDates(
      previousWeek ? { label: previousWeek.label, endDate: previousWeek.endDate } : undefined
    )
    setWeekLabel(suggestion.label)
    setStartDate(suggestion.startDate)
    setEndDate(suggestion.endDate)
    suggestionsInitialized[1](true)
  }

  const { data: wizardData, loading: dataLoading, error: dataError } = useAsyncData<WeekGenerationData>(
    () => weekGenerationApi.getData(previousWeek?.label),
    [previousWeek?.label],
    { immediate: !weeksLoading }
  )

  const initialized = useState(false)
  if (wizardData && !initialized[0]) {
    const recurringIds = new Set(wizardData.recurringTasks.map((t) => t.id))
    const incompleteIds = new Set(wizardData.incompleteTasks.filter((t) => t.selected).map((t) => t.id))
    const followUpIds = new Set(wizardData.followUps.filter((t) => t.selected).map((t) => t.id))
    const backlogIds = new Set(wizardData.backlogItems.filter((t) => t.selected).map((t) => t.id))
    setSelectedRecurring(recurringIds)
    setSelectedIncomplete(incompleteIds)
    setSelectedFollowUps(followUpIds)
    setSelectedBacklog(backlogIds)
    initialized[1](true)
  }

  const toggleItem = useCallback(
    (setter: React.Dispatch<React.SetStateAction<Set<number>>>) => (id: number) => {
      setter((prev) => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
      })
    },
    []
  )

  const toggleAll = useCallback(
    (
      items: { id: number }[],
      selected: Set<number>,
      setter: React.Dispatch<React.SetStateAction<Set<number>>>
    ) => {
      const allSelected = items.every((i) => selected.has(i.id))
      if (allSelected) {
        setter(new Set())
      } else {
        setter(new Set(items.map((i) => i.id)))
      }
    },
    []
  )

  const handleGenerate = async () => {
    if (!weekLabel.trim() || !startDate || !endDate) {
      setGenerateError('Label, start date, and end date are required')
      return
    }
    setGenerating(true)
    setGenerateError(null)
    try {
      await weekGenerationApi.generate({
        label: weekLabel,
        startDate,
        endDate,
        recurringTaskIds: [...selectedRecurring],
        incompleteTaskIds: [...selectedIncomplete],
        followUpIds: [...selectedFollowUps],
        backlogItemIds: [...selectedBacklog],
      })
      navigate(`/goals/weekly/${weekLabel}`)
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : 'Failed to create week')
    } finally {
      setGenerating(false)
    }
  }

  const loading = weeksLoading || dataLoading

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    )
  }

  if (dataError) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400 text-sm font-mono">
        {dataError}
      </div>
    )
  }

  return (
    <div>
      {/* Back link */}
      <Link
        to="/goals/weekly"
        className="inline-flex items-center gap-1 text-xs font-mono text-zinc-600 hover:text-zinc-400 transition-colors mb-4"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        back to weekly
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-mono font-bold text-zinc-100 flex items-center gap-2">
            <span className="text-blue-400">$</span> week::init
          </h1>
          <p className="text-xs font-mono text-zinc-600 mt-1">
            configure and create a new week
          </p>
        </div>
      </div>

      {/* Week configuration */}
      <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-4 mb-4">
        <h3 className="text-[11px] font-mono font-medium text-zinc-500 uppercase tracking-widest mb-3">
          week settings
        </h3>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-mono text-zinc-500 mb-1">label</label>
            <input
              type="text"
              value={weekLabel}
              onChange={(e) => setWeekLabel(e.target.value)}
              placeholder="2026-08"
              className="w-full px-3 py-1.5 border border-zinc-700 bg-zinc-900 rounded text-sm font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50"
            />
          </div>
          <div>
            <label className="block text-xs font-mono text-zinc-500 mb-1">start date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-1.5 border border-zinc-700 bg-zinc-900 rounded text-sm font-mono text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50"
            />
          </div>
          <div>
            <label className="block text-xs font-mono text-zinc-500 mb-1">end date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-1.5 border border-zinc-700 bg-zinc-900 rounded text-sm font-mono text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50"
            />
          </div>
        </div>
      </div>

      {wizardData && (
        <div className="space-y-3">
          <WizardSection<WizardRecurringTask>
            title="Recurring Tasks"
            items={wizardData.recurringTasks}
            selectedIds={selectedRecurring}
            onToggle={toggleItem(setSelectedRecurring)}
            onToggleAll={() =>
              toggleAll(wizardData.recurringTasks, selectedRecurring, setSelectedRecurring)
            }
          />

          <WizardSection<WizardIncompleteTask>
            title="Incomplete Tasks"
            items={wizardData.incompleteTasks}
            selectedIds={selectedIncomplete}
            onToggle={toggleItem(setSelectedIncomplete)}
            onToggleAll={() =>
              toggleAll(wizardData.incompleteTasks, selectedIncomplete, setSelectedIncomplete)
            }
            getCategoryName={(item) => item.category?.name ?? null}
          />

          <WizardSection<WizardFollowUp>
            title="Follow-ups"
            items={wizardData.followUps}
            selectedIds={selectedFollowUps}
            onToggle={toggleItem(setSelectedFollowUps)}
            onToggleAll={() =>
              toggleAll(wizardData.followUps, selectedFollowUps, setSelectedFollowUps)
            }
            getCategoryName={(item) => item.category?.name ?? null}
          />

          <WizardSection<WizardBacklogItem>
            title="Backlog Items"
            items={wizardData.backlogItems}
            selectedIds={selectedBacklog}
            onToggle={toggleItem(setSelectedBacklog)}
            onToggleAll={() =>
              toggleAll(wizardData.backlogItems, selectedBacklog, setSelectedBacklog)
            }
            getCategoryName={(item) => item.category?.name ?? null}
          />

          {wizardData.recurringTasks.length === 0 &&
            wizardData.incompleteTasks.length === 0 &&
            wizardData.followUps.length === 0 &&
            wizardData.backlogItems.length === 0 && (
              <div className="text-center py-8 text-zinc-600 text-sm font-mono">
                no tasks available — week will be created empty
              </div>
            )}
        </div>
      )}

      {generateError && (
        <div className="mt-4 bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm font-mono">
          {generateError}
        </div>
      )}

      <div className="mt-8 flex justify-end">
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="px-6 py-2.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-sm font-mono font-medium rounded hover:bg-emerald-500/20 disabled:opacity-40 transition-colors"
        >
          {generating ? 'creating...' : 'create week'}
        </button>
      </div>
    </div>
  )
}
