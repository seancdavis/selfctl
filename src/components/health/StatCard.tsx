interface StatCardProps {
  label: string
  value: string | number
  unit?: string
  change?: number
  changeLabel?: string
}

export function StatCard({ label, value, unit, change, changeLabel }: StatCardProps) {
  const changeColor =
    change === undefined || change === 0
      ? 'text-zinc-600'
      : change < 0
        ? 'text-emerald-400'
        : 'text-amber-400'

  const changePrefix = change !== undefined && change > 0 ? '+' : ''

  return (
    <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-5">
      <p className="text-[11px] font-mono font-medium text-zinc-500 uppercase tracking-widest">
        {label}
      </p>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="text-2xl font-mono font-bold text-zinc-100">{value}</span>
        {unit && <span className="text-sm font-mono text-zinc-600">{unit}</span>}
      </div>
      {change !== undefined && (
        <p className={`mt-1 text-xs font-mono ${changeColor}`}>
          {changePrefix}{change} {changeLabel && <span>{changeLabel}</span>}
        </p>
      )}
    </div>
  )
}
