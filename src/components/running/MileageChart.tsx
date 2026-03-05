import {
  ResponsiveContainer,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Area,
  ComposedChart,
} from 'recharts'

interface ChartEntry {
  label: string
  miles: number
}

interface MileageChartProps {
  data: ChartEntry[]
}

export function MileageChart({ data }: MileageChartProps) {
  return (
    <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-5">
      <h3 className="text-[11px] font-mono font-medium text-zinc-500 uppercase tracking-widest mb-4">
        weekly mileage
      </h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data}>
            <defs>
              <linearGradient id="mileageGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#34d399" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: '#71717a', fontFamily: 'JetBrains Mono, monospace' }}
              tickLine={false}
              axisLine={{ stroke: '#3f3f46' }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#71717a', fontFamily: 'JetBrains Mono, monospace' }}
              tickLine={false}
              axisLine={false}
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
              formatter={(value) => [`${Number(value ?? 0).toFixed(2)} mi`, 'Miles']}
            />
            <Area
              type="monotone"
              dataKey="miles"
              fill="url(#mileageGradient)"
              stroke="none"
            />
            <Line
              type="monotone"
              dataKey="miles"
              stroke="#34d399"
              strokeWidth={2}
              dot={{ r: 3, fill: '#18181b', stroke: '#34d399', strokeWidth: 2 }}
              activeDot={{ r: 5, fill: '#34d399', stroke: '#18181b', strokeWidth: 2 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
