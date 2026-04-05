import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

const data = [
  { name: 'Compute (chassis + RAM)', value: 14180, color: '#3266ad' },
  { name: 'Network infrastructure', value: 3964.9, color: '#c47a2a' },
  { name: 'NICs', value: 839.97, color: '#7c5cbf' },
  { name: 'Storage (boot SSDs)', value: 618, color: '#2a8a5a' },
]

const total = data.reduce((sum, d) => sum + d.value, 0)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const renderLabel = (props: any) => {
  const pct = Math.round((Number(props.value) / total) * 100)
  return `${pct}%`
}

const formatPLN = (v: number) =>
  v.toLocaleString('pl-PL', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' PLN'

export default function BomPieChart() {
  return (
    <div style={{ width: '100%', maxWidth: 500, margin: '0 auto' }}>
      <ResponsiveContainer width="100%" height={380}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="45%"
            innerRadius={70}
            outerRadius={120}
            dataKey="value"
            label={renderLabel}
            labelLine={false}
            stroke="none"
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, name) => {
              const v = Number(value)
              const pct = Math.round((v / total) * 100)
              return [`${formatPLN(v)} (${pct}%)`, name]
            }}
            contentStyle={{
              backgroundColor: 'var(--background)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              color: 'var(--foreground)',
              fontSize: 13,
            }}
          />
          <Legend
            formatter={(value: string) => {
              const item = data.find((d) => d.name === value)
              if (!item) return value
              const pct = Math.round((item.value / total) * 100)
              return `${value} ${pct}% — ${formatPLN(item.value)}`
            }}
            wrapperStyle={{ fontSize: 13 }}
          />
        </PieChart>
      </ResponsiveContainer>
      <p style={{ fontSize: 12, color: 'var(--muted-foreground)', marginTop: 4 }}>
        Boot SSDs only. NVMe included with chassis. HDDs and enterprise NVMe not yet purchased —
        estimated additional 5,100–8,700 PLN.
      </p>
    </div>
  )
}
