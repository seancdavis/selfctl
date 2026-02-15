import { usePageTitle } from '@/hooks/usePageTitle'
import { Link } from 'react-router-dom'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  YAxis,
  Tooltip,
} from 'recharts'
import { ArrowRight, Plus, ListTodo, Target, Scale, Activity, RotateCcw } from 'lucide-react'
import { useAsyncData } from '@/hooks/useAsyncData'
import { healthApi, weeksApi } from '@/lib/api'
import { getCurrentWeekId, formatWeekRange } from '@/lib/dates'
import { calculatePercentage, getScoreLevel } from '@/lib/scores'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import type { Week, WeightEntry } from '@/types'

function TerminalProgressBar({ percentage }: { percentage: number }) {
  const total = 20
  const filled = Math.round((percentage / 100) * total)
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

function StatusDot({ level }: { level: string }) {
  const colors: Record<string, string> = {
    fire: 'bg-orange-400 shadow-[0_0_6px_rgba(251,146,60,0.6)]',
    green: 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]',
    yellow: 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.6)]',
    red: 'bg-red-400 shadow-[0_0_6px_rgba(248,113,113,0.6)]',
  }
  return <span className={`inline-block w-2 h-2 rounded-full ${colors[level] || colors.red}`} />
}

function WeekProgressWidget() {
  const currentWeekId = getCurrentWeekId()
  const { data: weeks, loading } = useAsyncData<Week[]>(() => weeksApi.list(), [])

  const currentWeek = weeks?.find((w) => w.id === currentWeekId)

  if (loading) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[11px] font-mono font-medium text-zinc-500 uppercase tracking-widest">
            week::status
          </h3>
        </div>
        <div className="flex justify-center py-6">
          <LoadingSpinner size="sm" />
        </div>
      </div>
    )
  }

  if (!currentWeek) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[11px] font-mono font-medium text-zinc-500 uppercase tracking-widest">
            week::status
          </h3>
        </div>
        <p className="text-zinc-600 text-sm font-mono mb-4">no active week found</p>
        <Link
          to="/goals/weekly/new"
          className="inline-flex items-center gap-2 text-sm font-mono text-emerald-400 hover:text-emerald-300 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          init new week
        </Link>
      </div>
    )
  }

  const percentage = calculatePercentage(currentWeek.completedTasks, currentWeek.totalTasks)
  const level = getScoreLevel(percentage)

  const levelColor: Record<string, string> = {
    fire: 'text-orange-400',
    green: 'text-emerald-400',
    yellow: 'text-amber-400',
    red: 'text-red-400',
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <StatusDot level={level} />
          <h3 className="text-[11px] font-mono font-medium text-zinc-500 uppercase tracking-widest">
            week::status
          </h3>
        </div>
        <Link
          to={`/goals/weekly/${currentWeekId}`}
          className="text-xs font-mono text-zinc-600 hover:text-zinc-400 inline-flex items-center gap-1 transition-colors"
        >
          view <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="flex items-end gap-3 mb-3">
        <span className={`text-3xl font-mono font-bold ${levelColor[level]}`}>{percentage}%</span>
        <span className="text-xs font-mono text-zinc-600 pb-0.5">
          {currentWeek.completedTasks}/{currentWeek.totalTasks} completed
        </span>
      </div>

      <div className="mb-2">
        <TerminalProgressBar percentage={percentage} />
      </div>

      <p className="text-[11px] font-mono text-zinc-700">
        {formatWeekRange(currentWeek.startDate, currentWeek.endDate)}
      </p>
    </div>
  )
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function WeightTrendWidget() {
  const { data: entries, loading } = useAsyncData<WeightEntry[]>(
    () => healthApi.getWeightEntries(30),
    []
  )

  if (loading) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[11px] font-mono font-medium text-zinc-500 uppercase tracking-widest">
            vitals::weight
          </h3>
        </div>
        <div className="flex justify-center py-6">
          <LoadingSpinner size="sm" />
        </div>
      </div>
    )
  }

  if (!entries || entries.length === 0) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[11px] font-mono font-medium text-zinc-500 uppercase tracking-widest">
            vitals::weight
          </h3>
        </div>
        <p className="text-zinc-600 text-sm font-mono">no data available</p>
      </div>
    )
  }

  const sorted = [...entries].sort(
    (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
  )
  const latest = sorted[sorted.length - 1]
  const oldest = sorted[0]
  const change = latest.weight - oldest.weight
  const chartData = sorted.map((e) => ({
    date: formatDate(e.recordedAt),
    weight: e.weight,
  }))

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <StatusDot level={change <= 0 ? 'green' : 'yellow'} />
          <h3 className="text-[11px] font-mono font-medium text-zinc-500 uppercase tracking-widest">
            vitals::weight
          </h3>
        </div>
        <Link
          to="/health"
          className="text-xs font-mono text-zinc-600 hover:text-zinc-400 inline-flex items-center gap-1 transition-colors"
        >
          details <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="flex items-end gap-3 mb-3">
        <span className="text-3xl font-mono font-bold text-zinc-100">
          {latest.weight.toFixed(1)}
        </span>
        <span className="text-xs font-mono text-zinc-600 pb-0.5">lbs</span>
        <span
          className={`text-xs font-mono font-medium pb-0.5 ${
            change < 0 ? 'text-emerald-400' : change > 0 ? 'text-amber-400' : 'text-zinc-600'
          }`}
        >
          {change > 0 ? '+' : ''}
          {change.toFixed(1)} / 30d
        </span>
      </div>

      <div className="h-20">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <YAxis
              domain={[
                (dataMin: number) => Math.floor(dataMin - 1),
                (dataMax: number) => Math.ceil(dataMax + 1),
              ]}
              hide
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#18181b',
                border: '1px solid #3f3f46',
                borderRadius: '4px',
                fontSize: '11px',
                fontFamily: 'JetBrains Mono, monospace',
                color: '#a1a1aa',
              }}
              itemStyle={{ color: '#34d399' }}
              labelStyle={{ color: '#71717a' }}
            />
            <Line
              type="monotone"
              dataKey="weight"
              stroke="#34d399"
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 2, fill: '#34d399', strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function QuickActions() {
  const actions = [
    {
      label: 'weekly',
      description: 'Current week tasks',
      to: `/goals/weekly/${getCurrentWeekId()}`,
      icon: Target,
      accent: 'text-blue-400',
      border: 'hover:border-blue-400/30',
    },
    {
      label: 'new week',
      description: 'Init weekly plan',
      to: '/goals/weekly/new',
      icon: Plus,
      accent: 'text-emerald-400',
      border: 'hover:border-emerald-400/30',
    },
    {
      label: 'backlog',
      description: 'Queued items',
      to: '/goals/backlog',
      icon: ListTodo,
      accent: 'text-violet-400',
      border: 'hover:border-violet-400/30',
    },
    {
      label: 'vitals',
      description: 'Health metrics',
      to: '/health',
      icon: Activity,
      accent: 'text-emerald-400',
      border: 'hover:border-emerald-400/30',
    },
    {
      label: 'recurring',
      description: 'Managed routines',
      to: '/goals/recurring',
      icon: RotateCcw,
      accent: 'text-amber-400',
      border: 'hover:border-amber-400/30',
    },
    {
      label: 'scale',
      description: 'Weight tracking',
      to: '/health',
      icon: Scale,
      accent: 'text-orange-400',
      border: 'hover:border-orange-400/30',
    },
  ]

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 md:col-span-2">
      <h3 className="text-[11px] font-mono font-medium text-zinc-500 uppercase tracking-widest mb-4">
        {'>'} quick_nav
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {actions.map((action) => (
          <Link
            key={action.label}
            to={action.to}
            className={`flex items-center gap-3 px-3 py-2.5 rounded border border-zinc-800 bg-zinc-900 hover:bg-zinc-800/70 transition-all ${action.border}`}
          >
            <action.icon className={`w-4 h-4 ${action.accent}`} />
            <div className="min-w-0">
              <span className={`text-sm font-mono font-medium block ${action.accent}`}>
                {action.label}
              </span>
              <span className="text-[10px] font-mono text-zinc-600 block truncate">
                {action.description}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

export function Dashboard() {
  usePageTitle()
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-mono font-bold text-zinc-100 flex items-center gap-2">
          <span className="text-emerald-400">$</span> dashboard
        </h1>
        <p className="text-xs font-mono text-zinc-600 mt-1">system overview — all services nominal</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <WeekProgressWidget />
        <WeightTrendWidget />
        <QuickActions />
      </div>
    </div>
  )
}
