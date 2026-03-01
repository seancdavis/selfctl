import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
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
          <BarChart data={data}>
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
            <Bar dataKey="miles" fill="#34d399" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
