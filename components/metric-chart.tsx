import { Card } from "@/components/ui/card"
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis } from "recharts"

interface MetricChartProps {
  title: string
  description: string
  data: Array<{ time: string; value: number }>
  color: string
}

export function MetricChart({ title, description, data, color }: MetricChartProps) {
  return (
    <Card className="p-6 bg-card border-border">
      <div className="mb-4">
        <h3 className="text-sm font-medium text-foreground mb-1">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <XAxis
              dataKey="time"
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${value}`}
            />
            <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}
