'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface MetricsChartProps {
  data: Array<{
    date: string
    mrr?: number
    churn_rate?: number
    ltv?: number
    active_customers?: number
  }>
  metric: 'mrr' | 'churn_rate' | 'ltv' | 'active_customers'
}

export function MetricsChart({ data, metric }: MetricsChartProps) {
  const formatValue = (value: number) => {
    switch (metric) {
      case 'mrr':
      case 'ltv':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(value)
      case 'churn_rate':
        return `${(value * 100).toFixed(1)}%`
      case 'active_customers':
        return value.toLocaleString()
      default:
        return value
    }
  }

  const getMetricLabel = () => {
    switch (metric) {
      case 'mrr': return 'Monthly Recurring Revenue'
      case 'churn_rate': return 'Churn Rate'
      case 'ltv': return 'Customer Lifetime Value'
      case 'active_customers': return 'Active Customers'
      default: return metric
    }
  }

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12 }}
            tickFormatter={(date) => new Date(date).toLocaleDateString()}
          />
          <YAxis
            tick={{ fontSize: 12 }}
            tickFormatter={formatValue}
          />
          <Tooltip
            labelFormatter={(date) => new Date(date).toLocaleDateString()}
            formatter={(value: number) => [formatValue(value), getMetricLabel()]}
          />
          <Line
            type="monotone"
            dataKey={metric}
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}