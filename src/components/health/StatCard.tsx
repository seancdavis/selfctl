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
      ? 'text-gray-500'
      : change < 0
        ? 'text-green-600'
        : 'text-red-600'

  const changePrefix = change !== undefined && change > 0 ? '+' : ''

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">
        {label}
      </p>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="text-3xl font-bold text-gray-900">{value}</span>
        {unit && <span className="text-lg text-gray-500">{unit}</span>}
      </div>
      {change !== undefined && (
        <p className={`mt-1 text-sm ${changeColor}`}>
          {changePrefix}{change} {changeLabel && <span>{changeLabel}</span>}
        </p>
      )}
    </div>
  )
}
