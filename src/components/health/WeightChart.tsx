import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'

interface ChartEntry {
  label: string
  weight: number
}

interface WeightChartProps {
  data: ChartEntry[]
}

export function WeightChart({ data }: WeightChartProps) {
  return (
    <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-5">
      <h3 className="text-[11px] font-mono font-medium text-zinc-500 uppercase tracking-widest mb-4">
        weight trend
      </h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: '#71717a', fontFamily: 'JetBrains Mono, monospace' }}
              tickLine={false}
              axisLine={{ stroke: '#3f3f46' }}
            />
            <YAxis
              domain={[
                (dataMin: number) => Math.floor(dataMin - 2),
                (dataMax: number) => Math.ceil(dataMax + 2),
              ]}
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
            />
            <Line
              type="monotone"
              dataKey="weight"
              stroke="#34d399"
              strokeWidth={1.5}
              dot={{ r: 2, fill: '#34d399', strokeWidth: 0 }}
              activeDot={{ r: 3, fill: '#34d399', strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
