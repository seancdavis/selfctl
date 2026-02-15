import { useState, useMemo, useCallback } from 'react'
import { usePageTitle } from '@/hooks/usePageTitle'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronDown, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAsyncData } from '@/hooks/useAsyncData'
import { weeksApi, weekGenerationApi } from '@/lib/api'
import { getCurrentWeekId, getNextWeekId } from '@/lib/dates'
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
    <div className="bg-white rounded-lg border border-gray-200">
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-2">
          {collapsed ? (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
            {selectedCount}/{items.length} selected
          </span>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onToggleAll()
          }}
          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
        >
          {selectedCount === items.length ? 'Deselect All' : 'Select All'}
        </button>
      </button>

      {!collapsed && (
        <div className="border-t border-gray-100 divide-y divide-gray-50">
          {items.map((item) => {
            const categoryName = getCategoryName?.(item)
            return (
              <label
                key={item.id}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(item.id)}
                  onChange={() => onToggle(item.id)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="flex-1 text-sm text-gray-900">{item.title}</span>
                {categoryName && (
                  <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
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

  // Selections
  const [selectedRecurring, setSelectedRecurring] = useState<Set<number>>(new Set())
  const [selectedIncomplete, setSelectedIncomplete] = useState<Set<number>>(new Set())
  const [selectedFollowUps, setSelectedFollowUps] = useState<Set<number>>(new Set())
  const [selectedBacklog, setSelectedBacklog] = useState<Set<number>>(new Set())

  // Fetch weeks to determine previous week
  const { data: weeks, loading: weeksLoading } = useAsyncData<Week[]>(
    () => weeksApi.list(),
    []
  )

  const previousWeekId = useMemo(() => {
    if (!weeks || weeks.length === 0) return undefined
    const sorted = [...weeks].sort((a, b) => b.id.localeCompare(a.id))
    return sorted[0].id
  }, [weeks])

  const newWeekId = useMemo(() => {
    if (previousWeekId) return getNextWeekId(previousWeekId)
    return getCurrentWeekId()
  }, [previousWeekId])

  // Fetch wizard data
  const { data: wizardData, loading: dataLoading, error: dataError } = useAsyncData<WeekGenerationData>(
    () => weekGenerationApi.getData(previousWeekId),
    [previousWeekId],
    { immediate: !weeksLoading }
  )

  // Initialize selections when data loads
  const initialized = useState(false)
  if (wizardData && !initialized[0]) {
    const recurringIds = new Set(wizardData.recurringTasks.filter((t) => t.selected).map((t) => t.id))
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
    setGenerating(true)
    setGenerateError(null)
    try {
      await weekGenerationApi.generate({
        weekId: newWeekId,
        recurringTaskIds: [...selectedRecurring],
        incompleteTaskIds: [...selectedIncomplete],
        followUpIds: [...selectedFollowUps],
        backlogItemIds: [...selectedBacklog],
      })
      navigate(`/goals/weekly/${newWeekId}`)
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
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
        {dataError}
      </div>
    )
  }

  return (
    <div className="max-w-3xl">
      {/* Back link */}
      <Link
        to="/goals/weekly"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Weekly Goals
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Week</h1>
          <p className="text-sm text-gray-500 mt-1">
            Creating week <span className="font-medium text-gray-700">{newWeekId}</span>
            {previousWeekId && (
              <> (following {previousWeekId})</>
            )}
          </p>
        </div>
      </div>

      {wizardData && (
        <div className="space-y-4">
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
              <div className="text-center py-8 text-gray-500">
                No tasks available to add. The new week will be created empty.
              </div>
            )}
        </div>
      )}

      {generateError && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
          {generateError}
        </div>
      )}

      <div className="mt-8 flex justify-end">
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {generating ? 'Creating...' : 'Create Week'}
        </button>
      </div>
    </div>
  )
}
