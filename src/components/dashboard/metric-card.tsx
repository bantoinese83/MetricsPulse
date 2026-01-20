import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface MetricCardProps {
  title: string
  value: string | number
  change?: number
  changeLabel?: string
  status?: 'healthy' | 'warning' | 'danger' | 'neutral'
  format?: 'currency' | 'percentage' | 'number'
}

export function MetricCard({
  title,
  value,
  change,
  changeLabel,
  status = 'neutral',
  format = 'number'
}: MetricCardProps) {
  const formatValue = (val: string | number) => {
    if (typeof val === 'string') return val

    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(val)
      case 'percentage':
        return `${(val * 100).toFixed(1)}%`
      default:
        return val.toLocaleString()
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-50'
      case 'warning':
        return 'text-yellow-600 bg-yellow-50'
      case 'danger':
        return 'text-red-600 bg-red-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  const getChangeIcon = () => {
    if (!change) return <Minus className="h-4 w-4" />
    return change > 0 ?
      <TrendingUp className="h-4 w-4 text-green-600" /> :
      <TrendingDown className="h-4 w-4 text-red-600" />
  }

  const getChangeColor = () => {
    if (!change) return 'text-gray-600'
    return change > 0 ? 'text-green-600' : 'text-red-600'
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Badge variant="secondary" className={getStatusColor()}>
          {status === 'healthy' ? '🟢' : status === 'warning' ? '🟡' : status === 'danger' ? '🔴' : '⚪'}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatValue(value)}</div>
        {change !== undefined && (
          <div className={`flex items-center text-xs ${getChangeColor()}`}>
            {getChangeIcon()}
            <span className="ml-1">
              {change > 0 ? '+' : ''}{change.toFixed(1)}% {changeLabel || 'from yesterday'}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}